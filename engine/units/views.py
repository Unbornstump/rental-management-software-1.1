from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model
from core.permissions import RolePermission
from .models import Unit, TenantUnit, MaintenanceRequest, MaintenanceAssignment, Expense
from .serializers import (
    UnitSerializer, TenantUnitSerializer, MaintenanceRequestSerializer,
    MaintenanceAssignmentSerializer, ExpenseSerializer
)

User = get_user_model()


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related('property').all().order_by('property', 'unit_number')
    serializer_class = UnitSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.PROPERTY_OFFICER, User.CARETAKER])()]
        if self.action in ['create', 'update', 'partial_update']:
            return [permissions.IsAuthenticated(), RolePermission([User.MANAGER, User.PROPERTY_OFFICER])()]
        return [permissions.IsAuthenticated(), RolePermission([User.MANAGER])()]


class TenantUnitViewSet(viewsets.ModelViewSet):
    queryset = TenantUnit.objects.select_related('tenant', 'unit').all()
    serializer_class = TenantUnitSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.select_related('unit', 'reported_by').all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class MaintenanceAssignmentViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceAssignment.objects.select_related('request', 'assigned_to').all()
    serializer_class = MaintenanceAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('property', 'unit', 'added_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]
