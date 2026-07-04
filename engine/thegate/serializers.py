from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import AuditLog, SystemSettings

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

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'user_role', 'action', 'target_model', 'target_id', 'details', 'timestamp', 'ip_address']
        read_only_fields = ['id', 'timestamp']


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'company_name', 'company_logo', 'contact_phone', 'address',
            'rent_due_day', 'currency', 'grace_period_days'
        ]
        read_only_fields = ['id']


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
        
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            
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
        else:
            raise serializers.ValidationError("Must include username and password")

        return data
