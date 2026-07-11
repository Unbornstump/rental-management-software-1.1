from rest_framework import viewsets, permissions
from django.db.models import Q
from django.contrib.auth import get_user_model
from core.permissions import RolePermission
from .models import Tenant, Lease, Invoice, Payment, Deposit, Reminder, MessageTemplate, MessageLog
from .serializers import (
    TenantSerializer, LeaseSerializer, InvoiceSerializer, PaymentSerializer,
    DepositSerializer, ReminderSerializer, MessageTemplateSerializer, MessageLogSerializer
)

User = get_user_model()


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all().order_by('-date_added')
    serializer_class = TenantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        property_id = self.request.query_params.get('property')
        if property_id:
            from units.models import Unit
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


class DepositViewSet(viewsets.ModelViewSet):
    queryset = Deposit.objects.select_related('lease').all()
    serializer_class = DepositSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.select_related('invoice', 'tenant').all()
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MessageLogViewSet(viewsets.ModelViewSet):
    queryset = MessageLog.objects.select_related('tenant', 'related_invoice').all()
    serializer_class = MessageLogSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]
