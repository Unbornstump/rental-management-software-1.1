from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    RentPayment, CreditLedger, ArrearsRecord,
    PaymentAuditLog, PaymentStreak
)

User = get_user_model()


class RentPaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = RentPayment
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'lease', 'billing_month', 'billing_year', 'due_date',
            'amount_expected', 'amount_paid', 'payment_date', 'payment_method',
            'reference_number', 'status', 'notes', 'recorded_by', 'recorded_by_name',
            'created_at', 'updated_at', 'is_late', 'days_overdue',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_late', 'days_overdue']

    def validate(self, data):
        amount_paid = data.get('amount_paid', 0)
        if amount_paid < 0:
            raise serializers.ValidationError({'amount_paid': 'Amount paid cannot be negative.'})
        return data


class RentPaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentPayment
        fields = [
            'tenant', 'unit', 'lease', 'billing_month', 'billing_year',
            'due_date', 'amount_expected', 'amount_paid', 'payment_date',
            'payment_method', 'reference_number', 'notes',
        ]


class CreditLedgerSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = CreditLedger
        fields = [
            'id', 'tenant', 'tenant_name', 'credit_balance',
            'total_months_credit', 'last_updated', 'created_at',
        ]
        read_only_fields = ['id', 'last_updated', 'created_at']


class ArrearsRecordSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = ArrearsRecord
        fields = [
            'id', 'tenant', 'tenant_name', 'months_in_arrears',
            'total_outstanding', 'last_updated', 'created_at',
        ]
        read_only_fields = ['id', 'last_updated', 'created_at']


class PaymentAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = PaymentAuditLog
        fields = [
            'id', 'rent_payment', 'changed_by', 'changed_by_name',
            'old_status', 'new_status', 'old_amount_paid', 'new_amount_paid',
            'change_description', 'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']


class PaymentStreakSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = PaymentStreak
        fields = [
            'id', 'tenant', 'tenant_name', 'current_streak',
            'longest_streak', 'last_payment_date', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class TenantPaymentDashboardSerializer(serializers.Serializer):
    tenant_id = serializers.IntegerField()
    tenant_name = serializers.CharField()
    phone = serializers.CharField()
    unit_number = serializers.CharField()
    property_name = serializers.CharField()
    lease_start = serializers.DateField()
    lease_end = serializers.DateField()
    rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Current month status
    current_month_status = serializers.CharField()
    current_month_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_month_expected = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_month_due_date = serializers.DateField()
    
    # Credit balance
    credit_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    months_credit = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Arrears
    months_in_arrears = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Last payment
    last_payment_date = serializers.DateField(allow_null=True)
    last_payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    last_payment_method = serializers.CharField(allow_null=True)
    
    # Streak
    payment_streak = serializers.IntegerField()
    
    # Payment history
    payment_history = RentPaymentSerializer(many=True)


class BulkRentDashboardSerializer(serializers.Serializer):
    rent_payments = RentPaymentSerializer(many=True)
    summary = serializers.DictField()
