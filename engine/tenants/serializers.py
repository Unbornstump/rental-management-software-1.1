from rest_framework import serializers
from .models import Tenant, Lease, Invoice, Payment, Deposit, Reminder, MessageTemplate, MessageLog


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'full_name', 'national_id', 'phone', 'email', 'emergency_contact', 'status', 'date_added']
        read_only_fields = ['id', 'date_added']


class LeaseSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)

    class Meta:
        model = Lease
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name', 'start_date', 'end_date',
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
    property_name = serializers.CharField(source='unit.property.name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name', 'month', 'year',
            'amount_due', 'penalty_amount', 'due_date', 'status', 'date_generated',
        ]
        read_only_fields = ['id', 'date_generated']


class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'tenant', 'tenant_name', 'amount_paid', 'payment_date', 'payment_method', 'receipt_number']
        read_only_fields = ['id']


class DepositSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='lease.tenant.full_name', read_only=True)
    unit_number = serializers.CharField(source='lease.unit.unit_number', read_only=True)

    class Meta:
        model = Deposit
        fields = ['id', 'lease', 'tenant_name', 'unit_number', 'amount_paid', 'date_paid', 'amount_refunded', 'refund_date', 'deductions']
        read_only_fields = ['id']


class ReminderSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'invoice', 'tenant', 'tenant_name', 'channel', 'sent_date', 'status']
        read_only_fields = ['id', 'sent_date']


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ['id', 'name', 'channel', 'body_text', 'date_created']
        read_only_fields = ['id', 'date_created']


class MessageLogSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)

    class Meta:
        model = MessageLog
        fields = ['id', 'tenant', 'tenant_name', 'channel', 'message_body', 'status', 'date_sent', 'related_invoice']
        read_only_fields = ['id', 'date_sent']
