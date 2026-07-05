from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


def format_audit_log_details(action, details=None):
    if isinstance(details, str):
        return details
    if not details:
        return action or 'System action'

    normalized_action = (action or '').strip().lower()
    username = details.get('username') or details.get('full_name') or details.get('name') or details.get('user')

    if normalized_action in {'login', 'logged in'}:
        role = details.get('role') or 'user'
        return f"Logged in as {role}"

    if normalized_action in {'failed login attempt', 'failed_login_attempt'}:
        resolved_username = username or 'unknown'
        return f"Failed login attempt for username '{resolved_username}'"

    if normalized_action in {'reset password', 'reset_staff_password', 'reset staff password'}:
        reset_by = details.get('reset_by') or details.get('performed_by') or 'System'
        target_user = username or 'staff member'
        return f"Password reset for {target_user} by {reset_by}"

    if normalized_action in {'added staff', 'added_staff', 'created staff', 'created_staff'}:
        full_name = details.get('full_name') or username or 'Staff member'
        role = details.get('role') or 'staff'
        return f"{full_name} added with role: {role}"

    if normalized_action in {'deactivated staff', 'deactivated_staff', 'deactivated'}:
        target_user = username or 'staff member'
        return f"{target_user} deactivated"

    if normalized_action in {'password_changed', 'changed password', 'changed_password'}:
        return 'Password changed'

    if normalized_action in {'configured security questions', 'configured_security_questions'}:
        return 'Security questions configured'

    if normalized_action in {'recorded payment', 'recorded_payment'}:
        amount = details.get('amount') or details.get('amount_paid') or 'payment'
        tenant = details.get('tenant') or details.get('tenant_name') or 'tenant'
        method = details.get('payment_method') or 'Cash'
        return f"{amount} recorded for {tenant} — {method}"

    if normalized_action in {'updated staff account', 'updated_staff_account'}:
        return f"Staff account updated for {username or 'staff member'}"

    return action or 'System action'


class CustomUser(AbstractUser):
    MANAGER = 'manager'
    ACCOUNTANT = 'accountant'
    PROPERTY_OFFICER = 'property_officer'
    CARETAKER = 'caretaker'

    ROLE_CHOICES = [
        (MANAGER, 'Manager'),
        (ACCOUNTANT, 'Accountant'),
        (PROPERTY_OFFICER, 'Property Officer'),
        (CARETAKER, 'Caretaker'),
    ]

    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=MANAGER)
    must_change_password = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_staff'
    )

    def save(self, *args, **kwargs):
        if self.role == self.MANAGER:
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


class SecurityQuestion(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='security_questions')
    question_1 = models.CharField(max_length=255)
    answer_1_hash = models.CharField(max_length=255)
    question_2 = models.CharField(max_length=255)
    answer_2_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Security questions for {self.user.username}"


class RecoveryCode(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recovery_codes')
    code_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Recovery code for {self.user.username}"


class Property(models.Model):
    APARTMENT = 'apartment'
    HOSTEL = 'hostel'
    COMMERCIAL = 'commercial'

    TYPE_CHOICES = [
        (APARTMENT, 'Apartment'),
        (HOSTEL, 'Hostel'),
        (COMMERCIAL, 'Commercial'),
    ]

    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    property_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default=APARTMENT)
    owner_details = models.TextField(blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Unit(models.Model):
    BEDSITTER = 'bedsitter'
    ONE_BED = '1br'
    TWO_BED = '2br'
    SHOP = 'shop'

    UNIT_TYPE_CHOICES = [
        (BEDSITTER, 'Bedsitter'),
        (ONE_BED, '1BR'),
        (TWO_BED, '2BR'),
        (SHOP, 'Shop'),
    ]

    OCCUPIED = 'occupied'
    VACANT = 'vacant'

    STATUS_CHOICES = [
        (OCCUPIED, 'Occupied'),
        (VACANT, 'Vacant'),
    ]

    property = models.ForeignKey(Property, related_name='units', on_delete=models.CASCADE)
    unit_number = models.CharField(max_length=64)
    unit_type = models.CharField(max_length=32, choices=UNIT_TYPE_CHOICES, default=BEDSITTER)
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=VACANT)
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('property', 'unit_number')

    def __str__(self):
        return f"{self.property.name} - {self.unit_number}"


class Landlord(models.Model):
    full_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    bank_account_details = models.TextField(blank=True)
    mpesa_number = models.CharField(max_length=50, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


class LandlordProperty(models.Model):
    landlord = models.ForeignKey(Landlord, related_name='landlord_properties', on_delete=models.CASCADE)
    property = models.ForeignKey(Property, related_name='landlord_properties', on_delete=models.CASCADE)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)

    class Meta:
        unique_together = ('landlord', 'property')

    def __str__(self):
        return f"{self.landlord.full_name} - {self.property.name}"


class Commission(models.Model):
    payment = models.ForeignKey('Payment', related_name='commissions', on_delete=models.CASCADE)
    landlord = models.ForeignKey(Landlord, related_name='commissions', on_delete=models.CASCADE)
    property = models.ForeignKey(Property, related_name='commissions', on_delete=models.CASCADE)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_calculated = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Commission {self.commission_amount} for {self.landlord.full_name}"


class LandlordPayout(models.Model):
    PAID = 'paid'
    PENDING = 'pending'

    STATUS_CHOICES = [
        (PAID, 'Paid'),
        (PENDING, 'Pending'),
    ]

    landlord = models.ForeignKey(Landlord, related_name='payouts', on_delete=models.CASCADE)
    property = models.ForeignKey(Property, related_name='payouts', on_delete=models.CASCADE)
    period_month = models.IntegerField()
    period_year = models.IntegerField()
    gross_rent_collected = models.DecimalField(max_digits=12, decimal_places=2)
    commission_deducted = models.DecimalField(max_digits=12, decimal_places=2)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_date = models.DateField(null=True, blank=True)
    payout_method = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=PENDING)

    def __str__(self):
        return f"Payout {self.landlord.full_name} {self.period_month}/{self.period_year}"


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


class TenantUnit(models.Model):
    tenant = models.ForeignKey(Tenant, related_name='tenant_units', on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, related_name='tenant_units', on_delete=models.CASCADE)
    move_in_date = models.DateField()
    move_out_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'unit', 'move_in_date')

    def __str__(self):
        return f"{self.tenant.full_name} -> {self.unit}"


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
    unit = models.ForeignKey(Unit, related_name='leases', on_delete=models.CASCADE)
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
    unit = models.ForeignKey(Unit, related_name='invoices', on_delete=models.CASCADE)
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


class PenaltyRule(models.Model):
    FLAT = 'flat'
    PERCENTAGE = 'percentage'

    PENALTY_TYPE_CHOICES = [
        (FLAT, 'Flat'),
        (PERCENTAGE, 'Percentage'),
    ]

    property = models.ForeignKey(Property, related_name='penalty_rules', on_delete=models.CASCADE)
    grace_period_days = models.IntegerField(default=5)
    penalty_type = models.CharField(max_length=16, choices=PENALTY_TYPE_CHOICES, default=FLAT)
    penalty_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Penalty {self.property.name}"


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


class Expense(models.Model):
    REPAIR = 'repair'
    UTILITY = 'utility'
    CLEANING = 'cleaning'
    OTHER = 'other'

    CATEGORY_CHOICES = [
        (REPAIR, 'Repair'),
        (UTILITY, 'Utility'),
        (CLEANING, 'Cleaning'),
        (OTHER, 'Other'),
    ]

    property = models.ForeignKey(Property, related_name='expenses', on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, related_name='expenses', null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
  
    def __str__(self):
        return f"Expense {self.category} - {self.amount}"


class Deposit(models.Model):
    lease = models.ForeignKey(Lease, related_name='deposits', on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    date_paid = models.DateField()
    amount_refunded = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_date = models.DateField(null=True, blank=True)
    deductions = models.TextField(blank=True)

    def __str__(self):
        return f"Deposit {self.lease}"


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


class MaintenanceRequest(models.Model):
    LOW = 'low'
    MEDIUM = 'medium'
    URGENT = 'urgent'

    PRIORITY_CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (URGENT, 'Urgent'),
    ]

    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'

    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (IN_PROGRESS, 'In Progress'),
        (RESOLVED, 'Resolved'),
    ]

    unit = models.ForeignKey(Unit, related_name='maintenance_requests', on_delete=models.CASCADE)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    description = models.TextField()
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default=MEDIUM)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=OPEN)
    date_reported = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request {self.unit} {self.priority}"


class MaintenanceAssignment(models.Model):
    request = models.ForeignKey(MaintenanceRequest, related_name='assignments', on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    assigned_date = models.DateField(auto_now_add=True)
    resolved_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Assignment {self.request.id}"


class AuditLog(models.Model):
    """Append-only audit log of all system actions."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=255)
    target_model = models.CharField(max_length=64)
    target_id = models.IntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username if self.user else 'System'} - {self.action} - {self.timestamp}"


class SystemSettings(models.Model):
    """System-wide settings for the RMS installation."""
    company_name = models.CharField(max_length=255, default='Rental Management System')
    company_logo = models.FileField(upload_to='logos/', null=True, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    rent_due_day = models.IntegerField(default=1)
    currency = models.CharField(max_length=10, default='KES')
    grace_period_days = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'System Settings'

    def __str__(self):
        return f"System Settings - {self.company_name}"

    def save(self, *args, **kwargs):
        """Ensure only one SystemSettings instance exists."""
        if not self.pk and SystemSettings.objects.exists():
            self.pk = SystemSettings.objects.first().pk
        super().save(*args, **kwargs)
