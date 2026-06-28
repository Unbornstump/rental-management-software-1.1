from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model
from .models import (
    Property, Unit, Landlord, LandlordProperty, Commission, LandlordPayout,
    Tenant, TenantUnit, Lease, Invoice, Payment, PenaltyRule, Reminder,
    Expense, Deposit, MessageTemplate, MessageLog,
    MaintenanceRequest, MaintenanceAssignment,
)
from .serializers import (
    UserSerializer, PropertySerializer, UnitSerializer,
    LandlordSerializer, LandlordPropertySerializer, CommissionSerializer,
    LandlordPayoutSerializer, TenantSerializer, TenantUnitSerializer,
    LeaseSerializer, InvoiceSerializer, PaymentSerializer,
    PenaltyRuleSerializer, ReminderSerializer, ExpenseSerializer,
    DepositSerializer, MessageTemplateSerializer, MessageLogSerializer,
    MaintenanceRequestSerializer, MaintenanceAssignmentSerializer,
)

User = get_user_model()


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.SUPER_ADMIN


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all().order_by('-date_added')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related('property').all().order_by('property', 'unit_number')
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]


class LandlordViewSet(viewsets.ModelViewSet):
    queryset = Landlord.objects.all().order_by('full_name')
    serializer_class = LandlordSerializer
    permission_classes = [permissions.IsAuthenticated]


class LandlordPropertyViewSet(viewsets.ModelViewSet):
    queryset = LandlordProperty.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPropertySerializer
    permission_classes = [permissions.IsAuthenticated]


class CommissionViewSet(viewsets.ModelViewSet):
    queryset = Commission.objects.select_related('landlord', 'property', 'payment').all()
    serializer_class = CommissionSerializer
    permission_classes = [permissions.IsAuthenticated]


class LandlordPayoutViewSet(viewsets.ModelViewSet):
    queryset = LandlordPayout.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPayoutSerializer
    permission_classes = [permissions.IsAuthenticated]


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all().order_by('-date_added')
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]


class TenantUnitViewSet(viewsets.ModelViewSet):
    queryset = TenantUnit.objects.select_related('tenant', 'unit').all()
    serializer_class = TenantUnitSerializer
    permission_classes = [permissions.IsAuthenticated]


class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.select_related('tenant', 'unit').all()
    serializer_class = LeaseSerializer
    permission_classes = [permissions.IsAuthenticated]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('tenant', 'unit').all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice', 'tenant').all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]


class PenaltyRuleViewSet(viewsets.ModelViewSet):
    queryset = PenaltyRule.objects.select_related('property').all()
    serializer_class = PenaltyRuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.select_related('invoice', 'tenant').all()
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('property', 'unit', 'added_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]


class DepositViewSet(viewsets.ModelViewSet):
    queryset = Deposit.objects.select_related('lease').all()
    serializer_class = DepositSerializer
    permission_classes = [permissions.IsAuthenticated]


class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class MessageLogViewSet(viewsets.ModelViewSet):
    queryset = MessageLog.objects.select_related('tenant', 'related_invoice').all()
    serializer_class = MessageLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.select_related('unit', 'reported_by').all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]


class MaintenanceAssignmentViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceAssignment.objects.select_related('request', 'assigned_to').all()
    serializer_class = MaintenanceAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
