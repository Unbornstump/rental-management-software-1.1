from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from core.models import AuditLog, SystemSettings
from .serializers import (
    StaffSerializer, StaffUpdateSerializer, PasswordResetSerializer,
    AuditLogSerializer, SystemSettingsSerializer, ChangePasswordSerializer,
    LoginSerializer
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Get JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Log successful login
        AuditLog.objects.create(
            user=user,
            action='Login',
            target_model='CustomUser',
            target_id=user.id,
            details={'username': user.username, 'role': user.role}
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_current_user(request):
    user = request.user
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
        details={'username': user.username}
    )
    
    return Response({'message': 'Password changed successfully'})


class StaffListView(generics.ListCreateAPIView):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.MANAGER:
            return User.objects.all().order_by('-date_joined')
        return User.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StaffUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.MANAGER:
            return User.objects.all()
        return User.objects.none()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        
        # Log deactivation
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
            details={'username': staff.username, 'reset_by': request.user.username}
        )
        
        return Response({'temp_password': temp_password, 'message': 'Password reset successfully'})
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=status.HTTP_404_NOT_FOUND)


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

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
    permission_classes = [permissions.IsAuthenticated]

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
