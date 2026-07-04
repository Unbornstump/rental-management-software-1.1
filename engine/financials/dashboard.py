from datetime import date, timedelta
from decimal import Decimal
from calendar import monthrange

from django.db.models import Q
from django.utils import timezone

from core.models import Unit, Lease, Tenant, TenantUnit
from .models import RentPayment, CreditLedger, PaymentTransaction, PaymentAuditLog
from .views import build_payment_grid, calculate_due_date


def _month_bounds(month, year):
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _prev_month_year(month, year):
    if month == 1:
        return 12, year - 1
    return month - 1, year


def get_occupied_count_last_month(property_id):
    pm, py = _prev_month_year(date.today().month, date.today().year)
    start, end = _month_bounds(pm, py)
    return Lease.objects.filter(
        unit__property_id=property_id,
        start_date__lte=end,
        end_date__gte=start,
    ).exclude(status=Lease.TERMINATED).values('unit_id').distinct().count()


def occupancy_trend_label(current, previous):
    diff = current - previous
    if diff > 0:
        unit_word = 'unit' if diff == 1 else 'units'
        return f'Up {diff} {unit_word} from last month'
    if diff < 0:
        unit_word = 'unit' if abs(diff) == 1 else 'units'
        return f'Down {abs(diff)} {unit_word} from last month'
    return 'Same as last month'


def build_dashboard_summary(property_id, month=None, year=None):
    today = date.today()
    month = int(month or today.month)
    year = int(year or today.year)

    units = Unit.objects.filter(property_id=property_id)
    total_units = units.count()
    active_leases = Lease.objects.filter(
        unit__property_id=property_id, status=Lease.ACTIVE
    ).select_related('tenant', 'unit')
    occupied = active_leases.count()
    vacant = total_units - occupied
    occupancy_rate = round((occupied / total_units * 100), 1) if total_units else 0.0
    occupied_last_month = get_occupied_count_last_month(property_id)

    _, summary = build_payment_grid(property_id, month, year)
    collection_rate = summary.get('collection_rate', 0.0)
    rent_expected = summary['total_expected']
    rent_collected = summary['total_collected']
    outstanding = max(rent_expected - rent_collected, Decimal('0.00'))
    unpaid_count = summary['unpaid'] + summary['partial']

    return {
        'total_units': total_units,
        'occupied': occupied,
        'vacant': vacant,
        'occupancy_rate': occupancy_rate,
        'occupancy_trend': occupancy_trend_label(occupied, occupied_last_month),
        'active_tenants': occupied,
        'rent_expected': rent_expected,
        'rent_collected': rent_collected,
        'collection_rate': collection_rate,
        'outstanding': outstanding,
        'unpaid_tenant_count': unpaid_count,
        'occupied_units_for_rent': occupied,
        'paid_count': summary['paid'] + summary['overpaid'],
        'partial_count': summary['partial'],
        'unpaid_count': summary['unpaid'],
        'month': month,
        'year': year,
    }


def build_payment_status(property_id, month=None, year=None):
    today = date.today()
    month = int(month or today.month)
    year = int(year or today.year)

    grid_units, summary = build_payment_grid(property_id, month, year)
    occupied = [u for u in grid_units if not u['is_vacant']]

    items = []
    for u in occupied:
        items.append({
            'tenant_id': u['tenant_id'],
            'tenant_name': u['tenant_name'],
            'unit_number': u['unit_number'],
            'status': u['status'],
            'amount_paid': u['amount_paid'],
            'amount_expected': u['amount_expected'],
            'is_overdue': u['is_overdue'],
            'days_overdue': u['days_overdue'],
        })

    paid_count = summary['paid'] + summary['overpaid']
    total_occupied = summary['occupied']

    if total_occupied == 0:
        banner = {'type': 'info', 'message': 'No occupied units this month'}
    elif paid_count == total_occupied and summary['partial'] == 0 and summary['unpaid'] == 0:
        banner = {
            'type': 'success',
            'message': f'All rent collected for {date(year, month, 1).strftime("%B %Y")}',
        }
    elif rent_collected_zero(summary):
        banner = {
            'type': 'danger',
            'message': f'No payments recorded yet for {date(year, month, 1).strftime("%B %Y")}',
        }
    else:
        banner = None

    return {
        'month': month,
        'year': year,
        'items': items,
        'banner': banner,
        'summary': {
            'paid': paid_count,
            'partial': summary['partial'],
            'unpaid': summary['unpaid'],
            'collected': summary['total_collected'],
            'expected': summary['total_expected'],
            'collection_rate': summary.get('collection_rate', 0.0),
        },
    }


def rent_collected_zero(summary):
    return Decimal(str(summary.get('total_collected', 0))) == Decimal('0.00') and summary['occupied'] > 0


def _vacancy_start(unit, property_id):
    today = date.today()
    last_lease = Lease.objects.filter(unit=unit).order_by('-end_date').first()
    if last_lease and last_lease.end_date < today:
        return last_lease.end_date
    return unit.date_added.date() if hasattr(unit.date_added, 'date') else unit.date_added


def build_dashboard_alerts(property_id):
    today = date.today()
    alerts = []

    month = today.month
    year = today.year
    grid_units, _ = build_payment_grid(property_id, month, year)

    for u in grid_units:
        if u['is_vacant']:
            continue
        if u['is_overdue']:
            alerts.append({
                'urgency': 'red',
                'type': 'overdue_payment',
                'message': f"{u['tenant_name']} — {u['unit_number']} — {u['days_overdue']} days overdue",
                'tenant_id': u['tenant_id'],
                'unit_id': u['unit_id'],
                'navigate': 'financials-tenant-detail',
            })
        elif u['status'] in (RentPayment.UNPAID, RentPayment.PARTIAL):
            due = u.get('due_date')
            if due and today > due:
                days = (today - due).days
                alerts.append({
                    'urgency': 'red',
                    'type': 'overdue_payment',
                    'message': f"{u['tenant_name']} — {u['unit_number']} — {days} days overdue",
                    'tenant_id': u['tenant_id'],
                    'unit_id': u['unit_id'],
                    'navigate': 'financials-tenant-detail',
                })

    active_leases = Lease.objects.filter(
        unit__property_id=property_id, status=Lease.ACTIVE
    ).select_related('tenant', 'unit')

    for lease in active_leases:
        days_left = (lease.end_date - today).days
        if days_left < 0:
            alerts.append({
                'urgency': 'red',
                'type': 'expired_lease',
                'message': f"{lease.tenant.full_name} — lease expired {abs(days_left)} days ago ({lease.unit.unit_number})",
                'tenant_id': lease.tenant_id,
                'lease_id': lease.id,
                'navigate': 'property-tenants',
            })
        elif days_left <= 7:
            alerts.append({
                'urgency': 'amber',
                'type': 'expiring_lease',
                'message': f"{lease.tenant.full_name} — lease expires in {days_left} days ({lease.unit.unit_number})",
                'tenant_id': lease.tenant_id,
                'lease_id': lease.id,
                'navigate': 'property-tenants',
            })

    occupied_unit_ids = set(active_leases.values_list('unit_id', flat=True))
    vacant_units = Unit.objects.filter(property_id=property_id).exclude(id__in=occupied_unit_ids)

    for unit in vacant_units:
        start = _vacancy_start(unit, property_id)
        days_vacant = (today - start).days
        if days_vacant >= 30:
            alerts.append({
                'urgency': 'amber',
                'type': 'long_vacancy',
                'message': f"{unit.unit_number} — vacant for {days_vacant} days",
                'unit_id': unit.id,
                'navigate': 'property-units',
            })

    property_unit_ids = Unit.objects.filter(property_id=property_id).values_list('id', flat=True)
    tenant_ids_with_history = set(
        Lease.objects.filter(unit_id__in=property_unit_ids).values_list('tenant_id', flat=True)
    ) | set(
        TenantUnit.objects.filter(unit_id__in=property_unit_ids, is_active=True).values_list('tenant_id', flat=True)
    )
    tenants_with_active_lease = set(active_leases.values_list('tenant_id', flat=True))
    orphaned = tenant_ids_with_history - tenants_with_active_lease
    if orphaned:
        count = len(orphaned)
        alerts.append({
            'urgency': 'amber',
            'type': 'no_active_lease',
            'message': f'{count} tenant{"s" if count != 1 else ""} have no active lease',
            'navigate': 'property-tenants',
        })

    credit_ledgers = CreditLedger.objects.filter(
        tenant_id__in=tenants_with_active_lease,
        credit_balance__gt=0,
    ).select_related('tenant')
    for ledger in credit_ledgers:
        active_lease = active_leases.filter(tenant_id=ledger.tenant_id).first()
        unit_num = active_lease.unit.unit_number if active_lease else 'N/A'
        alerts.append({
            'urgency': 'blue',
            'type': 'credit_balance',
            'message': f"KES {ledger.credit_balance:,.0f} credit sitting with {ledger.tenant.full_name} ({unit_num})",
            'tenant_id': ledger.tenant_id,
            'navigate': 'financials-tenant-detail',
        })

    urgency_order = {'red': 0, 'amber': 1, 'blue': 2}
    alerts.sort(key=lambda a: urgency_order.get(a['urgency'], 3))
    return alerts


def _relative_time(dt):
    if dt is None:
        return ''
    now = timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    seconds = int((now - dt).total_seconds())
    if seconds < 60:
        return 'just now'
    if seconds < 3600:
        return f'{max(1, seconds // 60)}m ago'
    if seconds < 86400:
        return f'{seconds // 3600}h ago'
    days = seconds // 86400
    if days == 1:
        return 'yesterday'
    if days < 7:
        return f'{days} days ago'
    return dt.strftime('%d %b %Y')


def build_dashboard_activity(property_id, limit=8):
    events = []
    unit_ids = Unit.objects.filter(property_id=property_id).values_list('id', flat=True)

    transactions = PaymentTransaction.objects.filter(
        rent_payment__unit_id__in=unit_ids
    ).select_related(
        'rent_payment', 'rent_payment__tenant', 'rent_payment__unit'
    ).order_by('-created_at')[:limit * 2]

    for tx in transactions:
        rp = tx.rent_payment
        events.append({
            'type': 'payment',
            'message': f'{rp.tenant.full_name} paid KES {tx.amount:,.0f} — {rp.unit.unit_number}',
            'timestamp': tx.created_at.isoformat(),
            'relative_time': _relative_time(tx.created_at),
            'tenant_id': rp.tenant_id,
            'navigate': 'financials-tenant-detail',
            'billing_month': rp.billing_month,
            'billing_year': rp.billing_year,
        })

    recent_leases = Lease.objects.filter(
        unit_id__in=unit_ids
    ).select_related('tenant', 'unit').order_by('-date_created')[:limit]

    for lease in recent_leases:
        events.append({
            'type': 'lease',
            'message': f'Lease created for {lease.unit.unit_number} — expires {lease.end_date.strftime("%d %b %Y")}',
            'timestamp': lease.date_created.isoformat(),
            'relative_time': _relative_time(lease.date_created),
            'tenant_id': lease.tenant_id,
            'navigate': 'property-tenants',
        })

    recent_tenants = Tenant.objects.filter(
        id__in=Lease.objects.filter(unit_id__in=unit_ids).values_list('tenant_id', flat=True)
    ).order_by('-date_added')[:limit]

    for tenant in recent_tenants:
        lease = Lease.objects.filter(tenant=tenant, unit_id__in=unit_ids).order_by('-date_created').first()
        unit_num = lease.unit.unit_number if lease else 'N/A'
        events.append({
            'type': 'tenant',
            'message': f'New tenant {tenant.full_name} registered — {unit_num}',
            'timestamp': tenant.date_added.isoformat(),
            'relative_time': _relative_time(tenant.date_added),
            'tenant_id': tenant.id,
            'navigate': 'property-tenants',
        })

    audit_logs = PaymentAuditLog.objects.filter(
        rent_payment__unit_id__in=unit_ids
    ).select_related('rent_payment__tenant', 'rent_payment__unit').order_by('-timestamp')[:limit]

    for log in audit_logs:
        if 'Payment +' in log.change_description:
            rp = log.rent_payment
            events.append({
                'type': 'partial_payment',
                'message': f'Payment update for {rp.unit.unit_number} — {log.change_description}',
                'timestamp': log.timestamp.isoformat(),
                'relative_time': _relative_time(log.timestamp),
                'tenant_id': rp.tenant_id,
                'navigate': 'financials-tenant-detail',
                'billing_month': rp.billing_month,
                'billing_year': rp.billing_year,
            })

    events.sort(key=lambda e: e['timestamp'], reverse=True)
    return events[:limit]


def build_dashboard_snapshot(property_id, month=None, year=None):
    today = date.today()
    month = int(month or today.month)
    year = int(year or today.year)

    summary = build_dashboard_summary(property_id, month, year)
    grid_units, _ = build_payment_grid(property_id, month, year)

    overdue_tenants = sum(
        1 for u in grid_units
        if not u['is_vacant'] and (u['is_overdue'] or u['status'] in (RentPayment.UNPAID, RentPayment.PARTIAL))
        and u.get('due_date') and today > u['due_date']
    )

    leases_expiring = Lease.objects.filter(
        unit__property_id=property_id,
        status=Lease.ACTIVE,
        end_date__gte=today,
        end_date__lte=today + timedelta(days=30),
    ).count()

    occupied_ids = set(
        Lease.objects.filter(unit__property_id=property_id, status=Lease.ACTIVE).values_list('unit_id', flat=True)
    )
    vacant_units = Unit.objects.filter(property_id=property_id).exclude(id__in=occupied_ids)

    longest_vacancy = None
    longest_days = 0
    for unit in vacant_units:
        days = (today - _vacancy_start(unit, property_id)).days
        if days > longest_days:
            longest_days = days
            longest_vacancy = {'unit_number': unit.unit_number, 'days': days}

    return {
        'month': month,
        'year': year,
        'month_label': date(year, month, 1).strftime('%B %Y'),
        'occupied_units': summary['occupied'],
        'expected_rent': summary['rent_expected'],
        'collected': summary['rent_collected'],
        'collection_rate': summary['collection_rate'],
        'outstanding': summary['outstanding'],
        'overdue_tenants': overdue_tenants,
        'leases_expiring': leases_expiring,
        'vacant_units': summary['vacant'],
        'longest_vacancy': longest_vacancy,
    }
