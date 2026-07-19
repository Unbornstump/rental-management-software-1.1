import re

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
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


def _get_user_security_questions(user=None):
    questions = []
    seen = set()

    def add_question(question):
        if not question:
            return
        normalized = question.strip()
        if normalized and normalized not in seen:
            questions.append(normalized)
            seen.add(normalized)

    if user is not None:
        security_questions = SecurityQuestion.objects.filter(user=user).first()
        if security_questions:
            add_question(security_questions.question_1)
            add_question(security_questions.question_2)
        if user.security_question:
            add_question(user.security_question)
        return questions

    for security_questions in SecurityQuestion.objects.all():
        add_question(security_questions.question_1)
        add_question(security_questions.question_2)

    for account in User.objects.filter(role=User.MANAGER):
        add_question(account.security_question)

    return questions


def _check_security_answer(user, question, answer):
    normalized_answer = (answer or '').strip().lower()
    if not normalized_answer or not question:
        return False

    security_questions = SecurityQuestion.objects.filter(user=user).first()
    if security_questions:
        if question == security_questions.question_1:
            return check_password(normalized_answer, security_questions.answer_1_hash)
        if question == security_questions.question_2:
            return check_password(normalized_answer, security_questions.answer_2_hash)

    if user.security_question and question == user.security_question:
        return bool(user.security_answer_hash and check_password(normalized_answer, user.security_answer_hash))

    return False


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


def _generate_recovery_code():
    """Generate a recovery code in format RMS-XXXX-XXXX-XXXX"""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choices(chars, k=4))
    part2 = ''.join(random.choices(chars, k=4))
    part3 = ''.join(random.choices(chars, k=4))
    return f"RMS-{part1}-{part2}-{part3}"


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def recover_send_email(request):
    """Send password reset link to recovery email"""
    from django.core.mail import send_mail

    email = (request.data.get('email') or '').strip()
    username = (request.data.get('username') or '').strip()

    if not email and not username:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if email:
            user = User.objects.get(recovery_email__iexact=email)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'No account found with that email.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.recovery_email:
        return Response({'error': 'No recovery email is set for this account. Please use another method.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.recovery_locked_until and user.recovery_locked_until > timezone.now():
        return Response({
            'error': 'Too many attempts. Please wait 15 minutes before trying again.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    reset_token = _generate_recovery_code()
    user.recovery_code_hash = make_password(reset_token)
    user.recovery_code_used = False
    user.recovery_code_expires_at = timezone.now() + timezone.timedelta(minutes=30)
    user.save()

    reset_link = f"rms://reset-password?token={reset_token}&username={user.username}"
    email_body = f"""Subject: RMS Password Reset

You requested a password reset for your RMS account.

Click the link below to reset your password:
{reset_link}

This link expires in 30 minutes.
If you did not request this, ignore this email.
"""

    try:
        send_mail(
            'RMS Password Reset',
            email_body,
            'noreply@rms.local',
            [user.recovery_email],
            fail_silently=False,
        )
    except Exception as exc:
        return Response({'error': 'Something went wrong on our end. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    AuditLog.objects.create(
        user=user,
        action='Password recovery email sent',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Password recovery email sent', {'username': user.username})
    )

    return Response({'message': 'A reset link has been sent to your registered email. The link expires in 30 minutes.'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def recover_verify_code(request):
    """Verify recovery code during password recovery"""
    username = (request.data.get('username') or '').strip()
    recovery_code = (request.data.get('recovery_code') or request.data.get('code') or '').strip()

    if not recovery_code:
        return Response({'error': 'Recovery code is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # If username is provided, use it to look up user directly
    if username:
        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'error': 'No account found with that username.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        # Otherwise, look up user by recovery code (check all active codes)
        users = User.objects.filter(
            recovery_code_hash__isnull=False,
            recovery_code_used=False,
            recovery_code_expires_at__gt=timezone.now()
        )
        
        user = None
        for u in users:
            if check_password(recovery_code, u.recovery_code_hash):
                user = u
                break
        
        if not user:
            return Response({'error': 'Invalid or expired recovery code.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.recovery_locked_until and user.recovery_locked_until > timezone.now():
        return Response({'error': 'Too many attempts. Please wait 15 minutes before trying again.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    if not user.recovery_code_hash or user.recovery_code_used or (user.recovery_code_expires_at and user.recovery_code_expires_at < timezone.now()):
        user.recovery_attempts += 1
        if user.recovery_attempts >= 3:
            user.recovery_locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save()
        return Response({'error': 'This code is incorrect or has already been used'}, status=status.HTTP_400_BAD_REQUEST)

    if not check_password(recovery_code, user.recovery_code_hash):
        user.recovery_attempts += 1
        if user.recovery_attempts >= 3:
            user.recovery_locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save()
        return Response({'error': 'This code is incorrect or has already been used'}, status=status.HTTP_400_BAD_REQUEST)

    user.recovery_attempts = 0
    user.recovery_code_used = True
    user.save()

    AuditLog.objects.create(
        user=user,
        action='Recovery code verified',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Recovery code verified', {'username': user.username})
    )

    temp_token = _generate_recovery_code()
    cache.set(f'recovery_token:{user.id}', temp_token, timeout=60 * 15)
    return Response({
        'message': 'Recovery code verified. Please set a new password.',
        'verification_token': temp_token,
        'username': user.username,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def recover_verify_question(request):
    """Verify the selected security question answer during password recovery."""
    username = (request.data.get('username') or '').strip()
    question = (request.data.get('question') or request.data.get('security_question') or '').strip()
    answer = (request.data.get('answer') or '').strip()

    if not username:
        return Response({'error': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not question or not answer:
        return Response({'error': 'Question and answer are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'No account found with that username.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.recovery_locked_until and user.recovery_locked_until > timezone.now():
        return Response({'error': 'Too many attempts. Please wait 15 minutes before trying again.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    if not _check_security_answer(user, question, answer):
        user.recovery_attempts += 1
        if user.recovery_attempts >= 3:
            user.recovery_locked_until = timezone.now() + timezone.timedelta(minutes=15)
        user.save()
        return Response({'error': 'Incorrect answer. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

    user.recovery_attempts = 0
    user.save()

    AuditLog.objects.create(
        user=user,
        action='Security question verified',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Security question verified', {'username': user.username})
    )

    temp_token = _generate_recovery_code()
    cache.set(f'recovery_token:{user.id}', temp_token, timeout=60 * 15)
    return Response({
        'message': 'Answer verified. Please set a new password.',
        'verification_token': temp_token,
        'username': user.username,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def recover_set_password(request):
    """Set new password after successful recovery verification"""
    username = (request.data.get('username') or '').strip()
    new_password = request.data.get('new_password')
    recovery_method = (request.data.get('method') or '').strip()  # 'code', 'email', or 'question'
    verification_token = (request.data.get('verification_token') or request.data.get('token') or '').strip()

    if not username or not new_password:
        return Response({'error': 'Username and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'\d', new_password):
        return Response({'error': 'Password must include at least one number.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if verification_token:
        stored_token = cache.get(f'recovery_token:{user.id}')
        if stored_token != verification_token:
            return Response({'error': 'Verification token is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.recovery_attempts = 0
    user.recovery_locked_until = None

    new_code = _generate_recovery_code()
    user.recovery_code_hash = make_password(new_code)
    user.recovery_code_used = False
    user.recovery_code_expires_at = timezone.now() + timezone.timedelta(days=365)

    user.save()
    cache.delete(f'recovery_token:{user.id}')
    
    AuditLog.objects.create(
        user=user,
        action='Password reset via recovery',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Password reset via recovery', {'username': user.username, 'method': recovery_method})
    )
    
    # Log in user
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'must_change_password': False,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'recovery_code': new_code,
        'message': 'Password reset successfully. A new recovery code has been generated.'
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def recover_generate_code(request):
    """Generate new recovery code from settings (authenticated)"""
    user = request.user
    
    if user.role != User.MANAGER:
        return Response({'error': 'Only managers can generate recovery codes'}, status=status.HTTP_403_FORBIDDEN)
    
    # Generate new code
    new_code = _generate_recovery_code()
    user.recovery_code_hash = make_password(new_code)
    user.recovery_code_used = False
    user.recovery_code_expires_at = timezone.now() + timezone.timedelta(days=365)
    user.save()
    
    AuditLog.objects.create(
        user=user,
        action='Generated new recovery code',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Generated new recovery code', {'username': user.username})
    )
    
    return Response({
        'recovery_code': new_code,
        'message': 'New recovery code generated. Save it somewhere safe.'
    })


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def recovery_settings_update(request):
    """Update recovery settings: email, security question, answer"""
    user = request.user
    
    if user.role != User.MANAGER:
        return Response({'error': 'Only managers can update recovery settings'}, status=status.HTTP_403_FORBIDDEN)
    
    recovery_email = (request.data.get('recovery_email') or '').strip()
    security_question = (request.data.get('security_question') or '').strip()
    security_answer = (request.data.get('security_answer') or '').strip()
    
    if recovery_email:
        # Validate email format
        if '@' not in recovery_email or '.' not in recovery_email.split('@')[-1]:
            return Response({'error': 'Invalid email format.'}, status=status.HTTP_400_BAD_REQUEST)
        user.recovery_email = recovery_email
    
    if security_question:
        if not security_answer:
            return Response({'error': 'Security answer is required when updating question.'}, status=status.HTTP_400_BAD_REQUEST)
        user.security_question = security_question
        user.security_answer_hash = make_password(security_answer.lower())
    
    user.save()
    
    AuditLog.objects.create(
        user=user,
        action='Updated recovery settings',
        target_model='CustomUser',
        target_id=user.id,
        details=format_audit_log_details('Updated recovery settings', {'username': user.username})
    )
    
    return Response({
        'message': 'Recovery settings updated successfully.',
        'recovery_email': user.recovery_email,
        'has_security_question': bool(user.security_question),
        'has_recovery_code': bool(user.recovery_code_hash and not user.recovery_code_used)
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_recovery_settings(request):
    """Get current recovery settings"""
    user = request.user
    
    if user.role != User.MANAGER:
        return Response({'error': 'Only managers can view recovery settings'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'recovery_email': user.recovery_email,
        'recovery_email_masked': f"{user.recovery_email[:3]}***@{user.recovery_email.split('@')[-1]}" if user.recovery_email else None,
        'security_question': user.security_question,
        'has_security_question': bool(user.security_question),
        'has_recovery_code': bool(user.recovery_code_hash and not user.recovery_code_used),
        'recovery_code_status': 'Active' if (user.recovery_code_hash and not user.recovery_code_used) else 'None'
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def recover_get_question(request):
    """Get the available security questions for recovery."""
    username = (request.query_params.get('username') or '').strip()

    if username:
        try:
            user = User.objects.get(username__iexact=username)
            questions = _get_user_security_questions(user)
        except User.DoesNotExist:
            questions = []

        return Response({
            'question': questions[0] if questions else None,
            'questions': questions,
        })

    questions = _get_user_security_questions()
    return Response({
        'question': questions[0] if questions else None,
        'questions': questions,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def administration_stats(request):
    """Return real statistics for the Administration card in Control Center."""
    user_count = User.objects.count()
    
    # Count unique roles (based on CustomUser.ROLE_CHOICES)
    role_count = len(User.ROLE_CHOICES)
    
    # Count active staff accounts (non-manager users with roles)
    permission_count = User.objects.filter(
        role__in=[User.ACCOUNTANT, User.PROPERTY_OFFICER, User.CARETAKER],
        is_active=True
    ).count()
    
    return Response({
        'users': user_count,
        'roles': role_count,
        'permissions': permission_count
    })
