from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from datetime import date
from decimal import Decimal
from calendar import monthrange

from core.models import Lease
from .models import RentPayment, CreditLedger, ArrearsRecord, PaymentStreak


@receiver(post_save, sender=Lease)
def initialize_rent_records_on_lease_creation(sender, instance, created, **kwargs):
    """
    When a new lease is created, initialize:
    1. A rent record for the first billing month
    2. Credit ledger with zero balance
    3. Arrears record with zero arrears
    4. Payment streak with zero streak
    """
    if not created:
        return

    if instance.status != Lease.ACTIVE:
        return

    with transaction.atomic():
        # Initialize credit ledger
        CreditLedger.objects.get_or_create(
            tenant=instance.tenant,
            defaults={'credit_balance': Decimal('0.00'), 'total_months_credit': Decimal('0.00')}
        )

        # Initialize arrears record
        ArrearsRecord.objects.get_or_create(
            tenant=instance.tenant,
            defaults={'months_in_arrears': 0, 'total_outstanding': Decimal('0.00')}
        )

        # Initialize payment streak
        PaymentStreak.objects.get_or_create(
            tenant=instance.tenant,
            defaults={'current_streak': 0, 'longest_streak': 0}
        )

        # Create initial rent payment for the lease start month
        due_day = instance.start_date.day
        try:
            due_date = date(instance.start_date.year, instance.start_date.month, due_day)
        except ValueError:
            # If the day doesn't exist in that month, use last day
            due_date = date(
                instance.start_date.year,
                instance.start_date.month,
                monthrange(instance.start_date.year, instance.start_date.month)[1]
            )

        RentPayment.objects.create(
            tenant=instance.tenant,
            unit=instance.unit,
            lease=instance,
            billing_month=instance.start_date.month,
            billing_year=instance.start_date.year,
            due_date=due_date,
            amount_expected=instance.rent_amount,
            amount_paid=Decimal('0.00'),
            status=RentPayment.UNPAID
        )
