#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'engine.rms_backend.settings')
django.setup()

from datetime import date
from decimal import Decimal
from core.models import Property, Lease
from financials.models import RentPayment

# Test the financial_hub_stats logic
properties = Property.objects.filter(is_active=True)
print(f"Active properties: {properties.count()}")

active_leases = Lease.objects.filter(
    status=Lease.ACTIVE,
    unit__property__in=properties
)
print(f"Active leases: {active_leases.count()}")

month = date.today().month
year = date.today().year

rent_payments = RentPayment.objects.filter(
    billing_month=month,
    billing_year=year,
    unit__property__in=properties
)
print(f"Rent payments for {month}/{year}: {rent_payments.count()}")

# Calculate totals
total_expected = Decimal('0.00')
total_collected = Decimal('0.00')
total_commission = Decimal('0.00')

for property_obj in properties:
    property_leases = active_leases.filter(unit__property=property_obj)
    property_expected = sum(lease.rent_amount for lease in property_leases)
    total_expected += property_expected
    
    property_collected = Decimal('0.00')
    payment_by_unit = {p.unit_id: p for p in rent_payments}
    
    for lease in property_leases:
        payment = payment_by_unit.get(lease.unit_id)
        if payment:
            property_collected += payment.amount_paid
    
    total_collected += property_collected
    
    commission_pct = property_obj.commission_percent or Decimal('0.00')
    commission_amt = property_collected * (commission_pct / Decimal('100'))
    total_commission += commission_amt

collection_rate = round(float(total_collected / total_expected * 100), 1) if total_expected > 0 else 0.0
net_to_owners = total_collected - total_commission

print(f"Total expected: {total_expected}")
print(f"Total collected: {total_collected}")
print(f"Collection rate: {collection_rate}%")
print(f"Total commission: {total_commission}")
print(f"Net to owners: {net_to_owners}")

last_payment = rent_payments.order_by('-updated_at').first()
print(f"Last payment updated: {last_payment.updated_at if last_payment else 'None'}")
