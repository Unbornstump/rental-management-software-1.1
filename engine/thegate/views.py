import re

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.utils.crypto import get_random_string
from core.models import AuditLog, SystemSettings, SecurityQuestion, RecoveryCode, format_audit_log_details
from core.permissions import RolePermission
from .serializers import (
    StaffSerializer, StaffUpdateSerializer, PasswordResetSerializer,
    AuditLogSerializer, SystemSettingsSerializer, ChangePasswordSerializer,
    LoginSerializer
)

User = get_user_model()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def setup_status(request):
    setup_required = not User.objects.filter(role=User.MANAGER).exists()
    return Response({'setup_required': setup_required})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_username_availability(request):
    username = (request.query_params.get('username') or '').strip()
    if not username:
        return Response({'available': False, 'message': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

    available = not User.objects.filter(username__iexact=username).exists()
    return Response({'available': available})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_manager(request):
    if User.objects.filter(role=User.MANAGER).exists():
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role != User.MANAGER:
            return Response({'error': 'Only managers can create another manager account.'}, status=status.HTTP_403_FORBIDDEN)

    full_name = (request.data.get('full_name') or '').strip()
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''

    if not full_name:
        return Response({'error': 'full_name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.fullmatch(r"[A-Za-z ]+", full_name):
        return Response({'error': 'full_name must contain letters and spaces only.'}, status=status.HTTP_400_BAD_REQUEST)
    if not username:
        return Response({'error': 'username is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if any(char.isspace() for char in username):
        return Response({'error': 'Username cannot contain spaces.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(username) < 4:
        return Response({'error': 'Username must be at least 4 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'\d', password):
        return Response({'error': 'Password must include at least one number.'}, status=status.HTTP_400_BAD_REQUEST)

    first_name = full_name.split()[0] if full_name else ''
    last_name = ' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else ''

    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=User.MANAGER,
        must_change_password=False,
    )

    AuditLog.objects.create(
        user=user,
        action='Created manager account',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Created manager account', {'username': user.username, 'full_name': full_name})
    )

    return Response({
        'id': user.id,
        'username': user.username,
        'full_name': full_name,
        'role': user.role,
        'must_change_password': user.must_change_password,
    }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)

        AuditLog.objects.create(
            user=user,
            action='Login',
            target_model='CustomUser',
            target_id=user.id,
            details=format_audit_log_details('Login', {'username': user.username, 'role': user.role})
        )

        requires_security_questions_setup = (
            user.role == User.MANAGER and not SecurityQuestion.objects.filter(user=user).exists()
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'requires_security_questions_setup': requires_security_questions_setup,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'must_change_password': user.must_change_password,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def save_security_questions(request):
    user = request.user
    if user.role != User.MANAGER:
        return Response({'error': 'Only managers can set security questions'}, status=status.HTTP_403_FORBIDDEN)

    question_1 = (request.data.get('question_1') or '').strip()
    answer_1 = (request.data.get('answer_1') or '').strip()
    question_2 = (request.data.get('question_2') or '').strip()
    answer_2 = (request.data.get('answer_2') or '').strip()

    if not question_1 or not answer_1 or not question_2 or not answer_2:
        return Response({'error': 'Both security questions and answers are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if question_1 == question_2:
        return Response({'error': 'Security questions must be different.'}, status=status.HTTP_400_BAD_REQUEST)

    security_questions, _ = SecurityQuestion.objects.get_or_create(user=user)
    security_questions.question_1 = question_1
    security_questions.answer_1_hash = make_password(answer_1.lower())
    security_questions.question_2 = question_2
    security_questions.answer_2_hash = make_password(answer_2.lower())
    security_questions.save()

    AuditLog.objects.create(
        user=user,
        action='Configured security questions',
        target_model='SecurityQuestion',
        target_id=security_questions.id,
        details=format_audit_log_details('Configured security questions', {'username': user.username})
    )

    return Response({'message': 'Security questions saved successfully.'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_security_questions(request):
    user = request.user
    security_questions = SecurityQuestion.objects.filter(user=user).first()
    if not security_questions:
        return Response({'error': 'Security questions have not been set up yet.'}, status=status.HTTP_404_NOT_FOUND)

    answer_1 = (request.data.get('answer_1') or '').strip().lower()
    answer_2 = (request.data.get('answer_2') or '').strip().lower()

    if not answer_1 or not answer_2:
        return Response({'error': 'Both answers are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not check_password(answer_1, security_questions.answer_1_hash) or not check_password(answer_2, security_questions.answer_2_hash):
        return Response({'error': 'One or more answers are incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

    recovery_code = get_random_string(12, allowed_chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
    expires_at = timezone.now() + timezone.timedelta(minutes=15)
    RecoveryCode.objects.create(
        user=user,
        code_hash=make_password(recovery_code),
        expires_at=expires_at,
    )

    return Response({'message': 'Identity verified.', 'recovery_code': recovery_code})


@api_view(['POST'])
def login_with_recovery_code(request):
    code = (request.data.get('code') or '').strip()
    if not code:
        return Response({'error': 'Recovery code is required.'}, status=status.HTTP_400_BAD_REQUEST)

    active_codes = RecoveryCode.objects.filter(
        user__role=User.MANAGER,
        used=False,
        expires_at__gt=timezone.now(),
    ).order_by('-created_at')

    matching_code = None
    for recovery_code in active_codes:
        if check_password(code, recovery_code.code_hash):
            matching_code = recovery_code
            break

    if not matching_code:
        return Response({'error': 'Recovery code is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    matching_code.used = True
    matching_code.save()

    user = matching_code.user
    user.must_change_password = True
    user.save()

    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'must_change_password': user.must_change_password,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'message': 'Recovery code accepted. Please set a new password.'
    })


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def get_current_user(request):
    user = request.user
    if request.method == 'PATCH':
        username = (request.data.get('username') or '').strip()
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()

        if username and User.objects.exclude(id=user.id).filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if username:
            user.username = username
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()

        AuditLog.objects.create(
            user=user,
            action='Updated profile',
            target_model='CustomUser',
            target_id=user.id,
            details=format_audit_log_details('Updated profile', {'username': user.username, 'full_name': f'{user.first_name} {user.last_name}'.strip()})
        )

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'must_change_password': user.must_change_password,
        'is_active': user.is_active,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    user = request.user
    new_password = request.data.get('new_password')
    current_password = request.data.get('current_password')
    
    if not new_password:
        return Response({'error': 'new_password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # For first login, don't require current password
    if not user.must_change_password:
        if not current_password:
            return Response({'error': 'current_password is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.must_change_password = False
    user.save()
    
    # Log password change
    AuditLog.objects.create(
        user=user,
        action='Changed password',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Changed password', {'username': user.username})
    )
    
    return Response({'message': 'Password changed successfully'})


class StaffListView(generics.ListCreateAPIView):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.MANAGER:
            return User.objects.all().order_by('-date_joined')
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != User.MANAGER:
            return Response({'error': 'Only managers can create staff accounts.'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        full_name = (payload.get('full_name') or '').strip()
        if full_name:
            payload['full_name'] = full_name
        elif payload.get('first_name') or payload.get('last_name'):
            first_name = (payload.get('first_name') or '').strip()
            last_name = (payload.get('last_name') or '').strip()
            payload['full_name'] = f"{first_name} {last_name}".strip()

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(created_by=request.user)

        return Response({
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'role': user.role,
            'temporary_password': getattr(user, 'temp_password', None),
            'message': 'Staff member created. Share this temporary password with them.'
        }, status=status.HTTP_201_CREATED)


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StaffUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.MANAGER:
            return User.objects.all()
        return User.objects.none()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == User.MANAGER:
            return Response({'error': 'Cannot delete manager account.'}, status=status.HTTP_403_FORBIDDEN)

        AuditLog.objects.filter(user=instance).delete()
        AuditLog.objects.filter(target_model='CustomUser', target_id=instance.id).delete()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == User.MANAGER:
            return Response({'error': 'Cannot deactivate manager account.'}, status=status.HTTP_403_FORBIDDEN)

        instance.is_active = False
        instance.save()

        AuditLog.objects.create(
            user=request.user,
            action='Deactivated staff account',
            target_model='CustomUser',
            target_id=instance.id,
            details={'username': instance.username, 'deactivated_by': request.user.username}
        )

        return Response({'message': 'Staff account deactivated'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reset_staff_password(request, staff_id):
    try:
        staff = User.objects.get(id=staff_id)
        if request.user.role != User.MANAGER:
            return Response({'error': 'Only managers can reset passwords'}, status=status.HTTP_403_FORBIDDEN)
        
        import secrets
        temp_password = secrets.token_urlsafe(12)
        staff.set_password(temp_password)
        staff.must_change_password = True
        staff.save()
        
        # Log password reset
        AuditLog.objects.create(
            user=request.user,
            action='Reset staff password',
            target_model='CustomUser',
            target_id=staff.id,
            details=format_audit_log_details('Reset staff password', {'username': staff.username, 'reset_by': request.user.username})
        )
        
        return Response({'temp_password': temp_password, 'message': 'Password reset successfully'})
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=status.HTTP_404_NOT_FOUND)


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def get_queryset(self):
        user = self.request.user
        if user.role != User.MANAGER:
            return AuditLog.objects.none()
        
        queryset = AuditLog.objects.all()
        
        # Filters
        user_id = self.request.query_params.get('user')
        role = self.request.query_params.get('role')
        action = self.request.query_params.get('action')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if role:
            queryset = queryset.filter(user__role=role)
        if action:
            queryset = queryset.filter(action__icontains=action)
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        return queryset.order_by('-timestamp')


class SystemSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def get_object(self):
        settings, created = SystemSettings.objects.get_or_create(id=1)
        return settings

    def update(self, request, *args, **kwargs):
        if request.user.role != User.MANAGER:
            return Response({'error': 'Only managers can update settings'}, status=status.HTTP_403_FORBIDDEN)
        
        return super().update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reset_all_staff_passwords(request):
    if request.user.role != User.MANAGER:
        return Response({'error': 'Only managers can reset all passwords'}, status=status.HTTP_403_FORBIDDEN)
    
    import secrets
    staff_users = User.objects.filter(role__in=[User.ACCOUNTANT, User.PROPERTY_OFFICER, User.CARETAKER], is_active=True)
    
    reset_data = []
    for staff in staff_users:
        temp_password = secrets.token_urlsafe(12)
        staff.set_password(temp_password)
        staff.must_change_password = True
        staff.save()
        reset_data.append({'username': staff.username, 'temp_password': temp_password})
    
    # Log bulk password reset
    AuditLog.objects.create(
        user=request.user,
        action='Bulk password reset',
        target_model='CustomUser',
        details={'count': len(reset_data), 'reset_by': request.user.username}
    )
    
    return Response({
        'message': f'Reset passwords for {len(reset_data)} staff members',
        'reset_data': reset_data
    })
