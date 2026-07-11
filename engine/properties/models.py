from django.db import models
from decimal import Decimal


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
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))

    def __str__(self):
        return self.name


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
    payment = models.ForeignKey('financials.PaymentTransaction', related_name='commissions', on_delete=models.CASCADE)
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
