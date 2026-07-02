from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Property, Unit, Landlord, LandlordProperty, Commission, LandlordPayout,
    Tenant, TenantUnit, Lease, Invoice, Payment, PenaltyRule, Reminder,
    Expense, Deposit, MessageTemplate, MessageLog,
    MaintenanceRequest, MaintenanceAssignment,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'password', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ['id', 'name', 'location', 'property_type', 'owner_details', 'date_added', 'is_active']
        read_only_fields = ['id', 'date_added']


class UnitSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'property', 'property_name', 'unit_number', 'unit_type', 'rent_amount', 'status', 'date_added']
        read_only_fields = ['id', 'date_added']


class LandlordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landlord
        fields = ['id', 'full_name', 'national_id', 'phone', 'email', 'bank_account_details', 'mpesa_number', 'date_added']
        read_only_fields = ['id', 'date_added']


class LandlordPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = LandlordProperty
        fields = ['id', 'landlord', 'property', 'commission_rate']
        read_only_fields = ['id']


class CommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commission
        fields = ['id', 'payment', 'landlord', 'property', 'commission_amount', 'date_calculated']
        read_only_fields = ['id', 'date_calculated']


class LandlordPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandlordPayout
        fields = [
            'id', 'landlord', 'property', 'period_month', 'period_year',
            'gross_rent_collected', 'commission_deducted', 'net_amount',
            'payout_date', 'payout_method', 'status',
        ]
        read_only_fields = ['id']


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'full_name', 'national_id', 'phone', 'email', 'emergency_contact', 'status', 'date_added']
        read_only_fields = ['id', 'date_added']


class TenantUnitSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)

    class Meta:
        model = TenantUnit
        fields = ['id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'move_in_date', 'move_out_date', 'is_active']
        read_only_fields = ['id']


class LeaseSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)

    class Meta:
        model = Lease
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'start_date', 'end_date',
            'rent_amount', 'deposit_amount', 'status', 'date_created',
        ]
        read_only_fields = ['id', 'date_created']

    def validate(self, data):
        from .models import Lease
        
        # Only check when the lease being saved will be active
        status = data.get('status', getattr(self.instance, 'status', None))
        unit = data.get('unit', getattr(self.instance, 'unit', None))

        if status == Lease.ACTIVE and unit:
            conflicting_lease = Lease.objects.filter(
                unit=unit,
                status=Lease.ACTIVE
            ).exclude(
                id=self.instance.id if self.instance else None
            ).first()

            if conflicting_lease:
                raise serializers.ValidationError(
                    f"Unit {unit.unit_number} already has an active lease (tenant: {conflicting_lease.tenant.full_name}). "
                    f"Vacate the current tenant before assigning a new one."
                )

        return data


class InvoiceSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'month', 'year',
            'amount_due', 'penalty_amount', 'due_date', 'status', 'date_generated',
        ]
        read_only_fields = ['id', 'date_generated']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'tenant', 'amount_paid', 'payment_date', 'payment_method', 'receipt_number']
        read_only_fields = ['id']


class PenaltyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PenaltyRule
        fields = ['id', 'property', 'grace_period_days', 'penalty_type', 'penalty_value']
        read_only_fields = ['id']


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ['id', 'invoice', 'tenant', 'channel', 'sent_date', 'status']
        read_only_fields = ['id', 'sent_date']


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'property', 'unit', 'category', 'amount', 'date', 'description', 'added_by']
        read_only_fields = ['id']


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = ['id', 'lease', 'amount_paid', 'date_paid', 'amount_refunded', 'refund_date', 'deductions']
        read_only_fields = ['id']


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ['id', 'name', 'channel', 'body_text', 'date_created']
        read_only_fields = ['id', 'date_created']


class MessageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageLog
        fields = ['id', 'tenant', 'channel', 'message_body', 'status', 'date_sent', 'related_invoice']
        read_only_fields = ['id', 'date_sent']


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = ['id', 'unit', 'reported_by', 'description', 'priority', 'status', 'date_reported']
        read_only_fields = ['id', 'date_reported']


class MaintenanceAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceAssignment
        fields = ['id', 'request', 'assigned_to', 'assigned_date', 'resolved_date', 'cost', 'notes']
        read_only_fields = ['id', 'assigned_date']
