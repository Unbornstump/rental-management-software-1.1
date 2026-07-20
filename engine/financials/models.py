from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class RentPayment(models.Model):
    UNPAID = 'unpaid'
    PARTIAL = 'partial'
    PAID = 'paid'
    OVERPAID = 'overpaid'

    STATUS_CHOICES = [
        (UNPAID, 'Unpaid'),
        (PARTIAL, 'Partial'),
        (PAID, 'Paid'),
        (OVERPAID, 'Overpaid'),
    ]

    CASH = 'cash'
    MPESA = 'mpesa'
    BANK_TRANSFER = 'bank_transfer'
    CHEQUE = 'cheque'

    PAYMENT_METHOD_CHOICES = [
        (CASH, 'Cash'),
        (MPESA, 'M-Pesa'),
        (BANK_TRANSFER, 'Bank Transfer'),
        (CHEQUE, 'Cheque'),
    ]

    tenant = models.ForeignKey('core.Tenant', related_name='rent_payments', on_delete=models.CASCADE)
    unit = models.ForeignKey('core.Unit', related_name='rent_payments', on_delete=models.CASCADE)
    lease = models.ForeignKey('core.Lease', related_name='rent_payments', on_delete=models.CASCADE)
    
    # Billing cycle
    billing_month = models.IntegerField()
    billing_year = models.IntegerField()
    due_date = models.DateField()
    
    # Amounts
    amount_expected = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    
    # Payment details
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=32, choices=PAYMENT_METHOD_CHOICES, blank=True)
    reference_number = models.CharField(max_length=128, blank=True)
    
    # Status
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=UNPAID)
    
    # Additional fields
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Creative additions
    is_late = models.BooleanField(default=False)
    days_overdue = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('tenant', 'unit', 'billing_month', 'billing_year')
        ordering = ['-billing_year', '-billing_month', 'due_date']

    def __str__(self):
        return f"RentPayment: {self.tenant.full_name} - {self.billing_month}/{self.billing_year} - {self.status}"

    def save(self, *args, **kwargs):
        # Auto-calculate status based on amount_paid
        if self.amount_paid == 0:
            self.status = self.UNPAID
        elif self.amount_paid < self.amount_expected:
            self.status = self.PARTIAL
        elif self.amount_paid == self.amount_expected:
            self.status = self.PAID
        else:
            self.status = self.OVERPAID
        
        # Check if payment is late
        if self.payment_date and self.due_date:
            if self.payment_date > self.due_date:
                self.is_late = True
                self.days_overdue = (self.payment_date - self.due_date).days
            else:
                self.is_late = False
                self.days_overdue = 0
        
        super().save(*args, **kwargs)


class PaymentTransaction(models.Model):
    """Individual payment submission within a billing month (audit trail)."""
    rent_payment = models.ForeignKey(
        RentPayment, related_name='transactions', on_delete=models.CASCADE
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    deposit_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    payment_method = models.CharField(max_length=32, choices=RentPayment.PAYMENT_METHOD_CHOICES, blank=True)
    reference_number = models.CharField(max_length=128, blank=True)
    payment_date = models.DateField()
    notes = models.TextField(blank=True)
    receipt_number = models.CharField(max_length=32, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['payment_date', 'created_at']

    def __str__(self):
        return f"PaymentTransaction: {self.rent_payment} +{self.amount}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.receipt_number:
            self.receipt_number = f"RCP-{self.payment_date.year}-{self.id:04d}"
            super().save(update_fields=['receipt_number'])


class CreditLedger(models.Model):
    tenant = models.OneToOneField('core.Tenant', related_name='credit_ledger', on_delete=models.CASCADE)
    credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_months_credit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CreditLedger: {self.tenant.full_name} - KES {self.credit_balance}"

    def add_credit(self, amount):
        self.credit_balance += amount
        self.save()

    def deduct_credit(self, amount):
        if self.credit_balance >= amount:
            self.credit_balance -= amount
            self.save()
            return True
        return False


class ArrearsRecord(models.Model):
    tenant = models.OneToOneField('core.Tenant', related_name='arrears_record', on_delete=models.CASCADE)
    months_in_arrears = models.IntegerField(default=0)
    total_outstanding = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ArrearsRecord: {self.tenant.full_name} - {self.months_in_arrears} months - KES {self.total_outstanding}"

    def increment_arrears(self, amount):
        self.months_in_arrears += 1
        self.total_outstanding += amount
        self.save()

    def decrement_arrears(self, amount):
        if self.months_in_arrears > 0:
            self.months_in_arrears -= 1
        if self.total_outstanding >= amount:
            self.total_outstanding -= amount
        else:
            self.total_outstanding = Decimal('0.00')
        self.save()


class PaymentAuditLog(models.Model):
    rent_payment = models.ForeignKey(RentPayment, related_name='audit_logs', on_delete=models.CASCADE)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    old_status = models.CharField(max_length=16, blank=True)
    new_status = models.CharField(max_length=16, blank=True)
    old_amount_paid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    new_amount_paid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    change_description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"AuditLog: {self.rent_payment} - {self.old_status} -> {self.new_status}"


class PaymentStreak(models.Model):
    tenant = models.OneToOneField('core.Tenant', related_name='payment_streak', on_delete=models.CASCADE)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_payment_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PaymentStreak: {self.tenant.full_name} - {self.current_streak} months"

    def increment_streak(self):
        self.current_streak += 1
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        self.save()

    def reset_streak(self):
        self.current_streak = 0
        self.save()
