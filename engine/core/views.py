from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils.crypto import get_random_string
from financials.models import RentPayment
from .permissions import RolePermission
from .models import (
    Property, Unit, Landlord, LandlordProperty, Commission, LandlordPayout,
    Tenant, TenantUnit, Lease, Invoice, Payment, PenaltyRule, Reminder,
    Expense, Deposit, MessageTemplate, MessageLog,
    MaintenanceRequest, MaintenanceAssignment, AuditLog, SystemSettings,
)
from .serializers import (
    UserSerializer, PropertySerializer, UnitSerializer,
    LandlordSerializer, LandlordPropertySerializer, CommissionSerializer,
    LandlordPayoutSerializer, TenantSerializer, TenantUnitSerializer,
    LeaseSerializer, InvoiceSerializer, PaymentSerializer,
    PenaltyRuleSerializer, ReminderSerializer, ExpenseSerializer,
    DepositSerializer, MessageTemplateSerializer, MessageLogSerializer,
    MaintenanceRequestSerializer, MaintenanceAssignmentSerializer,
    AuditLogSerializer, SystemSettingsSerializer,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that includes user role and must_change_password."""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['must_change_password'] = user.must_change_password
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['must_change_password'] = self.user.must_change_password
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login endpoint that returns role and must_change_password."""
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['me', 'change_password']:
            # Any authenticated user can change their own password
            return [permissions.IsAuthenticated()]
        elif self.action in ['staff', 'create_staff', 'update_role', 'reset_password', 'deactivate']:
            # Only managers can manage staff
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]
        else:
            # Default to manager only for list/create/update/destroy
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current authenticated user."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change current user's password."""
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not new_password:
            return Response({'error': 'new_password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # If user must change password on first login, don't require old password
        if not user.must_change_password:
            if not old_password:
                return Response({'error': 'old_password is required.'}, status=status.HTTP_400_BAD_REQUEST)

            if not user.check_password(old_password):
                return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        AuditLog.objects.create(
            user=user,
            action='password_changed',
            target_model='CustomUser',
            target_id=user.id,
            ip_address=self._get_client_ip(request),
        )

        return Response({'message': 'Password changed successfully.'})

    @action(detail=False, methods=['get'])
    def staff(self, request):
        """List all staff members (manager only)."""
        staff = User.objects.exclude(role=User.MANAGER)
        serializer = self.get_serializer(staff, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_staff(self, request):
        """Create new staff member (manager only)."""
        username = request.data.get('username')
        full_name = request.data.get('full_name')
        role = request.data.get('role')

        if not username or not full_name or not role:
            return Response({'error': 'username, full_name, and role are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate temporary password
        temp_password = get_random_string(12)

        user = User.objects.create_user(
            username=username,
            password=temp_password,
            first_name=full_name.split()[0] if full_name else '',
            last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
            role=role,
            must_change_password=True,
            created_by=request.user,
        )

        AuditLog.objects.create(
            user=request.user,
            action='added_staff',
            target_model='CustomUser',
            target_id=user.id,
            details={'username': username, 'role': role, 'full_name': full_name},
            ip_address=self._get_client_ip(request),
        )

        return Response({
            'id': user.id,
            'username': user.username,
            'full_name': full_name,
            'role': role,
            'temp_password': temp_password,
            'message': 'Staff member created. Share this temporary password with them.',
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def update_role(self, request, pk=None):
        """Update staff member role (manager only)."""
        user = self.get_object()
        if user.role == User.MANAGER:
            return Response({'error': 'Cannot modify manager.'}, status=status.HTTP_400_BAD_REQUEST)

        old_role = user.role
        new_role = request.data.get('role')

        if not new_role:
            return Response({'error': 'role is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user.role = new_role
        user.save()

        AuditLog.objects.create(
            user=request.user,
            action='changed_staff_role',
            target_model='CustomUser',
            target_id=user.id,
            details={'username': user.username, 'old_role': old_role, 'new_role': new_role},
            ip_address=self._get_client_ip(request),
        )

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset staff member password (manager only)."""
        user = self.get_object()
        if user.role == User.MANAGER:
            return Response({'error': 'Cannot reset manager password.'}, status=status.HTTP_400_BAD_REQUEST)

        temp_password = get_random_string(12)
        user.set_password(temp_password)
        user.must_change_password = True
        user.save()

        AuditLog.objects.create(
            user=request.user,
            action='reset_staff_password',
            target_model='CustomUser',
            target_id=user.id,
            details={'username': user.username},
            ip_address=self._get_client_ip(request),
        )

        return Response({
            'username': user.username,
            'temp_password': temp_password,
            'message': 'Password reset. Share this temporary password with them.',
        })

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate staff member account (manager only)."""
        user = self.get_object()
        if user.role == User.MANAGER:
            return Response({'error': 'Cannot deactivate manager.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save()

        AuditLog.objects.create(
            user=request.user,
            action='deactivated_staff',
            target_model='CustomUser',
            target_id=user.id,
            details={'username': user.username},
            ip_address=self._get_client_ip(request),
        )

        return Response({'message': 'Staff member deactivated.'})

    def _get_client_ip(self, request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all().order_by('-date_added')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        property_obj = self.get_object()
        unit_ids = list(property_obj.units.values_list('id', flat=True))

        tenant_ids = set()
        if unit_ids:
            tenant_ids.update(
                Lease.objects.filter(unit_id__in=unit_ids).values_list('tenant_id', flat=True)
            )
            tenant_ids.update(
                TenantUnit.objects.filter(unit_id__in=unit_ids).values_list('tenant_id', flat=True)
            )
            tenant_ids.update(
                RentPayment.objects.filter(unit_id__in=unit_ids).values_list('tenant_id', flat=True)
            )

        property_obj.delete()

        for tenant_id in tenant_ids:
            still_linked = (
                Lease.objects.filter(tenant_id=tenant_id).exists()
                or TenantUnit.objects.filter(tenant_id=tenant_id).exists()
                or RentPayment.objects.filter(tenant_id=tenant_id).exists()
                or Invoice.objects.filter(tenant_id=tenant_id).exists()
            )
            if not still_linked:
                Tenant.objects.filter(id=tenant_id).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related('property').all().order_by('property', 'unit_number')
    serializer_class = UnitSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.PROPERTY_OFFICER, User.CARETAKER])()]
        if self.action in ['create', 'update', 'partial_update']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.PROPERTY_OFFICER])()]
        return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]


class LandlordViewSet(viewsets.ModelViewSet):
    queryset = Landlord.objects.all().order_by('full_name')
    serializer_class = LandlordSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class LandlordPropertyViewSet(viewsets.ModelViewSet):
    queryset = LandlordProperty.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPropertySerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class CommissionViewSet(viewsets.ModelViewSet):
    queryset = Commission.objects.select_related('landlord', 'property', 'payment').all()
    serializer_class = CommissionSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class LandlordPayoutViewSet(viewsets.ModelViewSet):
    queryset = LandlordPayout.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPayoutSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all().order_by('-date_added')
    serializer_class = TenantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        property_id = self.request.query_params.get('property')
        if property_id:
            property_unit_ids = Unit.objects.filter(property_id=property_id).values_list('id', flat=True)
            queryset = queryset.filter(
                Q(tenant_units__unit_id__in=property_unit_ids) |
                Q(leases__unit_id__in=property_unit_ids)
            ).distinct()
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.ACCOUNTANT, User.CARETAKER])()]
        return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]


class TenantUnitViewSet(viewsets.ModelViewSet):
    queryset = TenantUnit.objects.select_related('tenant', 'unit').all()
    serializer_class = TenantUnitSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.select_related('tenant', 'unit').all()
    serializer_class = LeaseSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.ACCOUNTANT])()]
        return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('tenant', 'unit').all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice', 'tenant').all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class PenaltyRuleViewSet(viewsets.ModelViewSet):
    queryset = PenaltyRule.objects.select_related('property').all()
    serializer_class = PenaltyRuleSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.select_related('invoice', 'tenant').all()
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('property', 'unit', 'added_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class DepositViewSet(viewsets.ModelViewSet):
    queryset = Deposit.objects.select_related('lease').all()
    serializer_class = DepositSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MessageLogViewSet(viewsets.ModelViewSet):
    queryset = MessageLog.objects.select_related('tenant', 'related_invoice').all()
    serializer_class = MessageLogSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.select_related('unit', 'reported_by').all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MaintenanceAssignmentViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceAssignment.objects.select_related('request', 'assigned_to').all()
    serializer_class = MaintenanceAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log (manager only)."""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(user__role=role)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        return queryset.order_by('-timestamp')

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export audit log to CSV (manager only)."""
        import csv
        from django.http import HttpResponse
        
        queryset = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User', 'Role', 'Action', 'Target', 'Details', 'IP Address'])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.user.username if log.user else 'System',
                log.user.role if log.user else '',
                log.action,
                f"{log.target_model}:{log.target_id}" if log.target_id else log.target_model,
                str(log.details),
                log.ip_address or '',
            ])
        
        return response


class SystemSettingsViewSet(viewsets.ViewSet):
    """System settings management (manager only)."""
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    def list(self, request):
        """Get system settings."""
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get system settings (same as list)."""
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update system settings."""
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            AuditLog.objects.create(
                user=request.user,
                action='updated_system_settings',
                target_model='SystemSettings',
                target_id=settings.id,
                details=request.data,
                ip_address=self._get_client_ip(request),
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _get_client_ip(self, request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
