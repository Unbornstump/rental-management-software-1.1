from django.db import models


class Tenant(models.Model):
    ACTIVE = 'active'
    INACTIVE = 'inactive'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (INACTIVE, 'Inactive'),
    ]

    full_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=ACTIVE)
    date_added = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


class Lease(models.Model):
    ACTIVE = 'active'
    EXPIRED = 'expired'
    TERMINATED = 'terminated'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (EXPIRED, 'Expired'),
        (TERMINATED, 'Terminated'),
    ]

    tenant = models.ForeignKey(Tenant, related_name='leases', on_delete=models.CASCADE)
    unit = models.ForeignKey('units.Unit', related_name='leases', on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=ACTIVE)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'unit', 'start_date')

    def __str__(self):
        return f"Lease: {self.tenant.full_name} - {self.unit}"


class Invoice(models.Model):
    UNPAID = 'unpaid'
    PARTIAL = 'partial'
    PAID = 'paid'

    STATUS_CHOICES = [
        (UNPAID, 'Unpaid'),
        (PARTIAL, 'Partial'),
        (PAID, 'Paid'),
    ]

    tenant = models.ForeignKey(Tenant, related_name='invoices', on_delete=models.CASCADE)
    unit = models.ForeignKey('units.Unit', related_name='invoices', on_delete=models.CASCADE)
    month = models.IntegerField()
    year = models.IntegerField()
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    penalty_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=UNPAID)
    date_generated = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'unit', 'month', 'year')

    def __str__(self):
        return f"Invoice {self.tenant.full_name} {self.month}/{self.year}"


class Payment(models.Model):
    CASH = 'cash'
    MPESA = 'mpesa'
    BANK = 'bank'

    METHOD_CHOICES = [
        (CASH, 'Cash'),
        (MPESA, 'M-Pesa'),
        (BANK, 'Bank'),
    ]

    invoice = models.ForeignKey(Invoice, related_name='payments', on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, related_name='payments', on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=32, choices=METHOD_CHOICES)
    receipt_number = models.CharField(max_length=128, blank=True)

    def __str__(self):
        return f"Payment {self.receipt_number or self.id} - {self.amount_paid}"


class Deposit(models.Model):
    lease = models.ForeignKey(Lease, related_name='deposits', on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    date_paid = models.DateField()
    amount_refunded = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_date = models.DateField(null=True, blank=True)
    deductions = models.TextField(blank=True)

    def __str__(self):
        return f"Deposit {self.lease}"


class Reminder(models.Model):
    WHATSAPP = 'whatsapp'
    SMS = 'sms'
    EMAIL = 'email'

    CHANNEL_CHOICES = [
        (WHATSAPP, 'WhatsApp'),
        (SMS, 'SMS'),
        (EMAIL, 'Email'),
    ]

    SENT = 'sent'
    FAILED = 'failed'

    STATUS_CHOICES = [
        (SENT, 'Sent'),
        (FAILED, 'Failed'),
    ]

    invoice = models.ForeignKey(Invoice, related_name='reminders', on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, related_name='reminders', on_delete=models.CASCADE)
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES)
    sent_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=SENT)

    def __str__(self):
        return f"Reminder {self.tenant.full_name} {self.channel}"


class MessageTemplate(models.Model):
    WHATSAPP = 'whatsapp'
    SMS = 'sms'
    EMAIL = 'email'

    CHANNEL_CHOICES = [
        (WHATSAPP, 'WhatsApp'),
        (SMS, 'SMS'),
        (EMAIL, 'Email'),
    ]

    name = models.CharField(max_length=128)
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES)
    body_text = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class MessageLog(models.Model):
    SENT = 'sent'
    FAILED = 'failed'

    STATUS_CHOICES = [
        (SENT, 'Sent'),
        (FAILED, 'Failed'),
    ]

    tenant = models.ForeignKey(Tenant, related_name='message_logs', on_delete=models.CASCADE)
    channel = models.CharField(max_length=16, choices=MessageTemplate.CHANNEL_CHOICES)
    message_body = models.TextField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=SENT)
    date_sent = models.DateTimeField(auto_now_add=True)
    related_invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"MessageLog {self.tenant.full_name} {self.channel}"
