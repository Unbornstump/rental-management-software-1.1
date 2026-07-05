import re

from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import AuditLog, SystemSettings, format_audit_log_details

User = get_user_model()


class StaffSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    last_login = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'role_display',
            'is_active', 'must_change_password', 'created_by', 'created_by_username',
            'last_login', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_by']

    def create(self, validated_data):
        from django.utils.crypto import get_random_string
        import secrets
        
        # Generate temporary password
        temp_password = secrets.token_urlsafe(12)
        validated_data['password'] = temp_password
        validated_data['must_change_password'] = True
        
        user = User(**validated_data)
        user.set_password(temp_password)
        user.save()
        
        # Log the action
        request = self.context.get('request')
        if request and request.user:
            AuditLog.objects.create(
                user=request.user,
                action='Created staff account',
                target_model='CustomUser',
                target_id=user.id,
                details={
                    'username': user.username,
                    'role': user.role,
                    'created_by': request.user.username
                }
            )
        
        # Store temporary password in instance for response
        user.temp_password = temp_password
        return user


class StaffUpdateSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'role_display', 'is_active']
        read_only_fields = ['id', 'username']

    def update(self, instance, validated_data):
        old_role = instance.role
        old_is_active = instance.is_active
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Log role changes
        request = self.context.get('request')
        if request and request.user:
            changes = {}
            if old_role != instance.role:
                changes['role'] = {'from': old_role, 'to': instance.role}
            if old_is_active != instance.is_active:
                changes['is_active'] = {'from': old_is_active, 'to': instance.is_active}
            
            if changes:
                AuditLog.objects.create(
                    user=request.user,
                    action='Updated staff account',
                    target_model='CustomUser',
                    target_id=instance.id,
                    details={
                        'username': instance.username,
                        'changes': changes,
                        'updated_by': request.user.username
                    }
                )
        
        return instance


class PasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, write_only=True)


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    readable_details = serializers.SerializerMethodField()
    target_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'user_role', 'action', 'target_model', 'target_id', 'details', 'timestamp', 'ip_address', 'readable_details', 'target_display']
        read_only_fields = ['id', 'timestamp']

    def get_readable_details(self, obj):
        return format_audit_log_details(obj.action, obj.details)

    def get_target_display(self, obj):
        if isinstance(obj.details, dict):
            for key in ('username', 'full_name', 'name', 'tenant'):
                value = obj.details.get(key)
                if value:
                    return str(value)
        if obj.user:
            return obj.user.username
        if obj.target_model and obj.target_id is not None:
            return f"{obj.target_model}:{obj.target_id}"
        return 'System'


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'company_name', 'company_logo', 'contact_phone', 'address',
            'rent_due_day', 'currency', 'grace_period_days'
        ]
        read_only_fields = ['id']

    def validate_company_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Company name is required.')
        return str(value).strip()

    def validate_contact_phone(self, value):
        if value and not re.match(r'^\+?[0-9\s()-]{7,15}$', value):
            raise serializers.ValidationError('Enter a valid phone number.')
        return value

    def validate_rent_due_day(self, value):
        if not 1 <= value <= 28:
            raise serializers.ValidationError('Rent due day must be between 1 and 28.')
        return value

    def validate_grace_period_days(self, value):
        if value <= 0:
            raise serializers.ValidationError('Grace period must be a positive number.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        return data

    def validate_current_password(self, value):
        request = self.context.get('request')
        if request and request.user:
            if not request.user.check_password(value):
                raise serializers.ValidationError("Current password is incorrect")
        return value


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from django.contrib.auth import authenticate

        request = self.context.get('request')
        username = (data.get('username') or '').strip()
        password = data.get('password')

        if not username or not password:
            raise serializers.ValidationError("Must include username and password")

        try:
            user = authenticate(request=request, username=username, password=password)
            print('DEBUG login - username received:', repr(data.get('username')))
            print('DEBUG login - normalized username:', repr(username))
            print('DEBUG login - password provided:', bool(password))
            print('DEBUG login - authenticate returned:', repr(user))
            if user is not None:
                print('DEBUG login - user.is_active:', user.is_active)
                print('DEBUG login - user.role:', getattr(user, 'role', None))
                print('DEBUG login - user.is_staff:', user.is_staff)
                print('DEBUG login - user.is_superuser:', user.is_superuser)
                print('DEBUG login - user.must_change_password:', user.must_change_password)
        except Exception as exc:
            print('DEBUG login - authenticate exception:', repr(exc))
            raise

        if not user:
            # Log failed login attempt
            AuditLog.objects.create(
                user=None,
                action='Failed login attempt',
                target_model='CustomUser',
                details={'username': username, 'reason': 'Invalid credentials'}
            )
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            AuditLog.objects.create(
                user=user,
                action='Failed login attempt',
                target_model='CustomUser',
                details={'username': username, 'reason': 'Account inactive'}
            )
            raise serializers.ValidationError("Account is inactive")

        data['user'] = user
        return data
