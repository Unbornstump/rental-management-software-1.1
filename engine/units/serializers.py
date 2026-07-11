from rest_framework import serializers
from .models import Unit, TenantUnit, MaintenanceRequest, MaintenanceAssignment, Expense


class UnitSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'property', 'property_name', 'unit_number', 'unit_type', 'rent_amount', 'status', 'date_added']
        read_only_fields = ['id', 'date_added']


class TenantUnitSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)

    class Meta:
        model = TenantUnit
        fields = ['id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name', 'move_in_date', 'move_out_date', 'is_active']
        read_only_fields = ['id']


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    reported_by_username = serializers.CharField(source='reported_by.username', read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = ['id', 'unit', 'unit_number', 'property_name', 'reported_by', 'reported_by_username', 'description', 'priority', 'status', 'date_reported']
        read_only_fields = ['id', 'date_reported']


class MaintenanceAssignmentSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)

    class Meta:
        model = MaintenanceAssignment
        fields = ['id', 'request', 'assigned_to', 'assigned_to_username', 'assigned_date', 'resolved_date', 'cost', 'notes']
        read_only_fields = ['id', 'assigned_date']


class ExpenseSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    added_by_username = serializers.CharField(source='added_by.username', read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'property', 'property_name', 'unit', 'unit_number', 'category', 'amount', 'date', 'description', 'added_by', 'added_by_username']
        read_only_fields = ['id']
