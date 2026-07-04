from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    RentPayment, CreditLedger, ArrearsRecord,
    PaymentAuditLog, PaymentStreak, PaymentTransaction
)

User = get_user_model()


class PaymentTransactionSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount', 'payment_method', 'payment_method_display',
            'reference_number', 'payment_date', 'notes', 'receipt_number',
            'recorded_by_name', 'created_at',
        ]
        read_only_fields = fields

    def get_payment_method_display(self, obj):
        return dict(RentPayment.PAYMENT_METHOD_CHOICES).get(obj.payment_method, obj.payment_method)


class RentPaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    tenant = serializers.PrimaryKeyRelatedField(read_only=True)
    unit = serializers.PrimaryKeyRelatedField(read_only=True)
    lease = serializers.PrimaryKeyRelatedField(read_only=True)
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RentPayment
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'lease', 'billing_month', 'billing_year', 'due_date',
            'amount_expected', 'amount_paid', 'payment_date', 'payment_method',
            'reference_number', 'status', 'notes', 'recorded_by', 'recorded_by_name',
            'created_at', 'updated_at', 'is_late', 'days_overdue',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_late', 'days_overdue', 'tenant', 'unit', 'lease', 'recorded_by']

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
    phone = serializers.CharField(allow_blank=True, required=False)
    unit_number = serializers.CharField()
    unit_type = serializers.CharField(required=False, allow_blank=True)
    property_name = serializers.CharField()
    lease_id = serializers.IntegerField(required=False, allow_null=True)
    lease_start = serializers.DateField()
    lease_end = serializers.DateField()
    rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    billing_month = serializers.IntegerField(required=False)
    billing_year = serializers.IntegerField(required=False)
    payment_id = serializers.IntegerField(required=False, allow_null=True)

    current_month_status = serializers.CharField()
    current_month_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_month_expected = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_month_due_date = serializers.DateField(allow_null=True)
    amount_owed = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    payment_date = serializers.DateField(allow_null=True, required=False)
    payment_method = serializers.CharField(required=False, allow_blank=True)
    reference_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_late = serializers.BooleanField(required=False)
    is_overdue = serializers.BooleanField(required=False)
    days_overdue = serializers.IntegerField(required=False)

    credit_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    months_credit = serializers.DecimalField(max_digits=10, decimal_places=2)
    credit_full_months = serializers.IntegerField(required=False)
    credit_days = serializers.IntegerField(required=False)
    daily_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    property_address = serializers.CharField(required=False, allow_blank=True)
    recorded_by_name = serializers.CharField(required=False, allow_blank=True)
    receipt_number = serializers.CharField(required=False, allow_blank=True)

    months_in_arrears = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)

    last_payment_date = serializers.DateField(allow_null=True)
    last_payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    last_payment_method = serializers.CharField(allow_null=True)

    payment_streak = serializers.IntegerField()

    month_transactions = serializers.ListField(child=serializers.DictField(), required=False)
    payment_methods_summary = serializers.CharField(required=False, allow_blank=True)
    references_summary = serializers.CharField(required=False, allow_blank=True)
    surplus_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    next_month_name = serializers.CharField(required=False, allow_blank=True)

    payment_history = RentPaymentSerializer(many=True)


class BulkRentDashboardSerializer(serializers.Serializer):
    rent_payments = RentPaymentSerializer(many=True)
    summary = serializers.DictField()


class PaymentGridUnitSerializer(serializers.Serializer):
    unit_id = serializers.IntegerField()
    unit_number = serializers.CharField()
    unit_type = serializers.CharField(allow_blank=True)
    is_vacant = serializers.BooleanField()
    tenant_id = serializers.IntegerField(allow_null=True)
    tenant_name = serializers.CharField(allow_blank=True)
    tenant_phone = serializers.CharField(allow_blank=True)
    lease_id = serializers.IntegerField(allow_null=True)
    lease_start = serializers.DateField(allow_null=True)
    lease_end = serializers.DateField(allow_null=True)
    payment_id = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()
    amount_expected = serializers.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField(allow_null=True)
    payment_date = serializers.DateField(allow_null=True)
    payment_method = serializers.CharField(allow_blank=True)
    reference_number = serializers.CharField(allow_blank=True)
    notes = serializers.CharField(allow_blank=True)
    is_late = serializers.BooleanField()
    days_overdue = serializers.IntegerField()
    is_overdue = serializers.BooleanField()
    payment_streak = serializers.IntegerField()
    recorded_by_name = serializers.CharField(allow_blank=True)


class PaymentGridSummarySerializer(serializers.Serializer):
    total_units = serializers.IntegerField()
    occupied = serializers.IntegerField()
    vacant = serializers.IntegerField()
    paid = serializers.IntegerField()
    unpaid = serializers.IntegerField()
    partial = serializers.IntegerField()
    overpaid = serializers.IntegerField()
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expected = serializers.DecimalField(max_digits=12, decimal_places=2)
    collection_rate = serializers.FloatField()


class PaymentGridSerializer(serializers.Serializer):
    units = PaymentGridUnitSerializer(many=True)
    summary = PaymentGridSummarySerializer()
