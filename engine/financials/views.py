from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, F, Count, Case, When
from django.db import transaction
from django.utils import timezone
from datetime import date, datetime, timedelta
from decimal import Decimal

from .models import (
    RentPayment, CreditLedger, ArrearsRecord,
    PaymentAuditLog, PaymentStreak, PaymentTransaction
)
from .serializers import (
    RentPaymentSerializer, RentPaymentCreateSerializer,
    CreditLedgerSerializer, ArrearsRecordSerializer,
    PaymentAuditLogSerializer, PaymentStreakSerializer,
    TenantPaymentDashboardSerializer, BulkRentDashboardSerializer,
    PaymentGridSerializer, PaymentTransactionSerializer,
)
from core.models import Lease, Unit, Tenant, CustomUser, Property
from core.permissions import RolePermission
from calendar import monthrange


def calculate_due_date(lease, month, year):
    due_day = lease.start_date.day
    try:
        return date(year, month, due_day)
    except ValueError:
        return date(year, month, monthrange(year, month)[1])


def compute_credit_breakdown(credit_amount, monthly_rent):
    credit_amount = Decimal(str(credit_amount or 0))
    monthly_rent = Decimal(str(monthly_rent or 0))
    if monthly_rent <= 0 or credit_amount <= 0:
        return {
            'credit_full_months': 0,
            'credit_days': 0,
            'daily_rate': Decimal('0.00'),
        }
    full_months = int(credit_amount // monthly_rent)
    remainder = credit_amount % monthly_rent
    daily_rate = (monthly_rent / Decimal('30')).quantize(Decimal('0.01'))
    credit_days = int(remainder / daily_rate) if daily_rate > 0 else 0
    return {
        'credit_full_months': full_months,
        'credit_days': credit_days,
        'daily_rate': daily_rate,
    }


def generate_receipt_number(payment):
    latest_tx = payment.transactions.order_by('-id').first()
    if latest_tx and latest_tx.receipt_number:
        return latest_tx.receipt_number
    return f"RCP-{payment.billing_year}-{payment.id:04d}"


def get_month_transactions(rent_payment):
    """Return transaction queryset, or synthesize legacy single entry if none exist."""
    txs = list(
        rent_payment.transactions.select_related('recorded_by').order_by('payment_date', 'created_at')
    )
    if txs:
        return txs
    if rent_payment.amount_paid and rent_payment.amount_paid > 0:
        return [{
            'id': None,
            'amount': rent_payment.amount_paid,
            'payment_method': rent_payment.payment_method,
            'payment_method_display': dict(RentPayment.PAYMENT_METHOD_CHOICES).get(
                rent_payment.payment_method, rent_payment.payment_method
            ),
            'reference_number': rent_payment.reference_number,
            'payment_date': rent_payment.payment_date,
            'notes': rent_payment.notes,
            'receipt_number': generate_receipt_number(rent_payment),
            'recorded_by_name': rent_payment.recorded_by.username if rent_payment.recorded_by else '',
            'created_at': rent_payment.updated_at,
            '_legacy': True,
        }]
    return []


def serialize_month_transactions(rent_payment):
    txs = get_month_transactions(rent_payment)
    if not txs:
        return []
    if isinstance(txs[0], dict):
        return txs
    return PaymentTransactionSerializer(txs, many=True).data


def summarize_payment_methods(transactions_data):
    method_labels = {
        'cash': 'Cash',
        'mpesa': 'M-Pesa',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
    }
    seen = []
    for tx in transactions_data:
        method = tx.get('payment_method') if isinstance(tx, dict) else tx.payment_method
        label = method_labels.get(method, method)
        if label and label not in seen:
            seen.append(label)
    return ' + '.join(seen) if seen else '—'


def summarize_references(transactions_data):
    refs = []
    for tx in transactions_data:
        ref = tx.get('reference_number') if isinstance(tx, dict) else tx.reference_number
        if ref and ref not in refs:
            refs.append(ref)
    return ', '.join(refs) if refs else '—'


def next_month_name(month, year):
    if month == 12:
        return 'January'
    return date(year, month + 1, 1).strftime('%B')


def _ledger_entry_sort_key(payment_date, tiebreaker):
    """Build a consistently comparable sort key across dates, datetimes, and ids."""
    if isinstance(tiebreaker, datetime):
        secondary = tiebreaker.timestamp()
    elif hasattr(tiebreaker, 'timestamp'):
        secondary = tiebreaker.timestamp()
    elif hasattr(tiebreaker, 'toordinal'):
        secondary = float(tiebreaker.toordinal())
    else:
        secondary = float(tiebreaker)
    return (payment_date, secondary)


def serialize_ledger_entries(tenant):
    method_labels = {
        'cash': 'Cash',
        'mpesa': 'M-Pesa',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
    }
    entries = []

    rent_txs = PaymentTransaction.objects.filter(
        rent_payment__tenant=tenant
    ).select_related('rent_payment', 'recorded_by').order_by('-payment_date', '-created_at')

    for tx in rent_txs:
        entries.append({
            'id': tx.id,
            'payment_type': 'rent',
            'amount': tx.amount,
            'payment_date': tx.payment_date,
            'payment_method': tx.payment_method,
            'payment_method_display': method_labels.get(tx.payment_method, tx.payment_method or ''),
            'reference_number': tx.reference_number,
            'receipt_number': tx.receipt_number,
            'recorded_by_name': tx.recorded_by.username if tx.recorded_by else '',
            'billing_month': tx.rent_payment.billing_month,
            'billing_year': tx.rent_payment.billing_year,
            'notes': tx.notes,
            'sort_key': _ledger_entry_sort_key(tx.payment_date, tx.created_at),
        })

    entries.sort(key=lambda e: e['sort_key'], reverse=True)
    for entry in entries:
        entry.pop('sort_key', None)
    return entries


def get_or_create_rent_payment(lease, month, year, user=None):
    existing = RentPayment.objects.filter(
        tenant=lease.tenant,
        unit=lease.unit,
        lease=lease,
        billing_month=month,
        billing_year=year,
    ).first()
    if existing:
        return existing, False

    payment = RentPayment.objects.create(
        tenant=lease.tenant,
        unit=lease.unit,
        lease=lease,
        billing_month=month,
        billing_year=year,
        due_date=calculate_due_date(lease, month, year),
        amount_expected=lease.rent_amount,
        amount_paid=Decimal('0.00'),
        recorded_by=user,
    )
    return payment, True


def apply_payment_record(rent_payment, incremental_amount, payment_method, reference_number, payment_date, notes, user):
    incremental_amount = Decimal(str(incremental_amount))

    if incremental_amount <= 0:
        raise ValueError('Payment amount must be greater than zero')

    with transaction.atomic():
        old_status = rent_payment.status
        old_amount = rent_payment.amount_paid
        new_total = old_amount + incremental_amount

        credit_ledger, _ = CreditLedger.objects.get_or_create(tenant=rent_payment.tenant)
        old_surplus = max(Decimal('0'), old_amount - rent_payment.amount_expected)
        new_surplus = max(Decimal('0'), new_total - rent_payment.amount_expected)
        credit_added = new_surplus - old_surplus
        if credit_added > 0:
            credit_ledger.add_credit(credit_added)
            if rent_payment.amount_expected > 0:
                credit_ledger.total_months_credit += credit_added / rent_payment.amount_expected
            credit_ledger.save()

        rent_payment.amount_paid = new_total
        rent_payment.payment_date = payment_date
        if payment_method:
            rent_payment.payment_method = payment_method
        if reference_number:
            rent_payment.reference_number = reference_number
        if notes:
            rent_payment.notes = notes
        rent_payment.recorded_by = user
        rent_payment.save()

        payment_tx = PaymentTransaction.objects.create(
            rent_payment=rent_payment,
            amount=incremental_amount,
            payment_method=payment_method or '',
            reference_number=reference_number or '',
            payment_date=payment_date,
            notes=notes or '',
            recorded_by=user,
        )

        arrears_record, _ = ArrearsRecord.objects.get_or_create(tenant=rent_payment.tenant)

        if rent_payment.status in [RentPayment.PAID, RentPayment.OVERPAID]:
            if old_status in [RentPayment.UNPAID, RentPayment.PARTIAL]:
                arrears_record.decrement_arrears(rent_payment.amount_expected)
                streak, _ = PaymentStreak.objects.get_or_create(tenant=rent_payment.tenant)
                if not rent_payment.is_late:
                    streak.increment_streak()
                streak.last_payment_date = payment_date
                streak.save()
        elif rent_payment.status in [RentPayment.UNPAID, RentPayment.PARTIAL]:
            if old_status in [RentPayment.PAID, RentPayment.OVERPAID]:
                arrears_record.increment_arrears(rent_payment.amount_expected)
                streak, _ = PaymentStreak.objects.get_or_create(tenant=rent_payment.tenant)
                streak.reset_streak()

        PaymentAuditLog.objects.create(
            rent_payment=rent_payment,
            changed_by=user,
            old_status=old_status,
            new_status=rent_payment.status,
            old_amount_paid=old_amount,
            new_amount_paid=rent_payment.amount_paid,
            change_description=f"Rent +{incremental_amount} via {payment_method or 'N/A'} (total now {rent_payment.amount_paid})",
        )

    return rent_payment, payment_tx


def build_payment_grid(property_id, month, year):
    units = Unit.objects.filter(property_id=property_id).order_by('unit_number')
    active_leases = Lease.objects.filter(
        unit__property_id=property_id,
        status=Lease.ACTIVE,
    ).select_related('tenant', 'unit')
    lease_by_unit = {lease.unit_id: lease for lease in active_leases}

    payments = RentPayment.objects.filter(
        billing_month=month,
        billing_year=year,
        unit__property_id=property_id,
    ).select_related('tenant', 'unit', 'recorded_by')
    payment_by_unit = {p.unit_id: p for p in payments}

    streaks = PaymentStreak.objects.filter(
        tenant_id__in=[l.tenant_id for l in active_leases]
    )
    streak_by_tenant = {s.tenant_id: s.current_streak for s in streaks}

    grid_units = []
    summary = {
        'total_units': 0,
        'occupied': 0,
        'vacant': 0,
        'paid': 0,
        'unpaid': 0,
        'partial': 0,
        'overpaid': 0,
        'total_collected': Decimal('0.00'),
        'total_expected': Decimal('0.00'),
    }

    for unit in units:
        lease = lease_by_unit.get(unit.id)
        payment = payment_by_unit.get(unit.id)
        is_vacant = lease is None

        if is_vacant:
            item_status = 'vacant'
            amount_expected = Decimal('0.00')
            amount_paid = Decimal('0.00')
            summary['vacant'] += 1
        else:
            summary['occupied'] += 1
            amount_expected = payment.amount_expected if payment else lease.rent_amount
            amount_paid = payment.amount_paid if payment else Decimal('0.00')
            item_status = payment.status if payment else RentPayment.UNPAID
            if item_status in summary:
                summary[item_status] += 1
            summary['total_collected'] += amount_paid
            summary['total_expected'] += amount_expected

        due_date = payment.due_date if payment else (calculate_due_date(lease, month, year) if lease else None)
        is_overdue = False
        days_overdue = 0
        if not is_vacant and item_status in [RentPayment.UNPAID, RentPayment.PARTIAL]:
            if due_date and date.today() > due_date:
                is_overdue = True
                days_overdue = (date.today() - due_date).days

        grid_units.append({
            'unit_id': unit.id,
            'unit_number': unit.unit_number,
            'unit_type': unit.get_unit_type_display_value(),
            'is_vacant': is_vacant,
            'tenant_id': lease.tenant_id if lease else None,
            'tenant_name': lease.tenant.full_name if lease else '',
            'tenant_phone': lease.tenant.phone if lease else '',
            'lease_id': lease.id if lease else None,
            'lease_start': lease.start_date if lease else None,
            'lease_end': lease.end_date if lease else None,
            'payment_id': payment.id if payment else None,
            'status': item_status,
            'amount_expected': amount_expected,
            'amount_paid': amount_paid,
            'due_date': due_date,
            'payment_date': payment.payment_date if payment else None,
            'payment_method': payment.payment_method if payment else '',
            'reference_number': payment.reference_number if payment else '',
            'notes': payment.notes if payment else '',
            'is_late': payment.is_late if payment else False,
            'days_overdue': payment.days_overdue if payment and payment.is_late else days_overdue,
            'is_overdue': is_overdue,
            'payment_streak': streak_by_tenant.get(lease.tenant_id, 0) if lease else 0,
            'recorded_by_name': payment.recorded_by.username if payment and payment.recorded_by else '',
        })

    summary['total_units'] = len(grid_units)
    if summary['total_expected'] > 0:
        summary['collection_rate'] = round(
            float(summary['total_collected'] / summary['total_expected'] * 100), 1
        )
    else:
        summary['collection_rate'] = 0.0

    return grid_units, summary


class RentPaymentViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tenant__full_name', 'unit__unit_number', 'reference_number']
    ordering_fields = ['billing_year', 'billing_month', 'due_date', 'payment_date']
    ordering = ['-billing_year', '-billing_month', 'due_date']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), RolePermission([CustomUser.MANAGER, CustomUser.ACCOUNTANT])()]
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), RolePermission([CustomUser.MANAGER, CustomUser.ACCOUNTANT])()]
        if self.action in ['destroy']:
            return [IsAuthenticated(), RolePermission([CustomUser.MANAGER])()]
        if self.action in ['record_payment', 'record_for_tenant']:
            return [IsAuthenticated(), RolePermission([CustomUser.MANAGER, CustomUser.ACCOUNTANT])()]
        # Make summary/payment grid and related dashboard endpoints broadly accessible to any authenticated user
        if self.action in ['tenant_dashboard', 'payment_grid', 'summary', 'tenant_history', 'bulk_dashboard', 'global_summary']:
            return [IsAuthenticated()]
        if self.action == 'generate_billing_cycle':
            return [IsAuthenticated(), RolePermission([CustomUser.MANAGER])()]
        return [IsAuthenticated(), RolePermission([CustomUser.MANAGER])()]

    def get_queryset(self):
        queryset = RentPayment.objects.select_related(
            'tenant', 'unit', 'lease', 'recorded_by', 'unit__property'
        )
        
        # Filter by property
        property_id = self.request.query_params.get('property')
        if property_id:
            queryset = queryset.filter(unit__property_id=property_id)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            queryset = queryset.filter(billing_month=month)
        if year:
            queryset = queryset.filter(billing_year=year)
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return RentPaymentCreateSerializer
        return RentPaymentSerializer

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_amount = instance.amount_paid
        
        serializer.save(recorded_by=self.request.user)
        
        # Log the change
        new_status = serializer.instance.status
        new_amount = serializer.instance.amount_paid
        
        if old_status != new_status or old_amount != new_amount:
            PaymentAuditLog.objects.create(
                rent_payment=instance,
                changed_by=self.request.user,
                old_status=old_status,
                new_status=new_status,
                old_amount_paid=old_amount,
                new_amount_paid=new_amount,
                change_description=f"Payment updated: {old_status} -> {new_status}, {old_amount} -> {new_amount}"
            )

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        rent_payment = self.get_object()
        amount_paid = request.data.get('amount_paid')
        payment_method = request.data.get('payment_method')
        reference_number = request.data.get('reference_number', '')
        payment_date = request.data.get('payment_date', date.today())
        notes = request.data.get('notes', '')

        if amount_paid is None:
            return Response(
                {'error': 'amount_paid is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount_paid = Decimal(str(amount_paid))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount_paid'}, status=status.HTTP_400_BAD_REQUEST)

        if amount_paid <= 0:
            return Response({'error': 'amount_paid must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rent_payment, _payment_tx = apply_payment_record(
                rent_payment, amount_paid, payment_method, reference_number,
                payment_date, notes, request.user
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(rent_payment)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def record_for_tenant(self, request):
        """Create payment record on-demand and record payment in one step."""
        tenant_id = request.data.get('tenant_id')
        month = request.data.get('month')
        year = request.data.get('year')
        amount_paid = request.data.get('amount_paid')
        payment_method = request.data.get('payment_method', '')
        reference_number = request.data.get('reference_number', '')
        payment_date = request.data.get('payment_date', date.today().isoformat())
        notes = request.data.get('notes', '')
        note_only = request.data.get('note_only', False)

        if not tenant_id or not month or not year:
            return Response(
                {'error': 'tenant_id, month, and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

        active_lease = Lease.objects.filter(tenant=tenant, status=Lease.ACTIVE).first()
        if not active_lease:
            return Response({'error': 'No active lease found for tenant'}, status=status.HTTP_404_NOT_FOUND)

        month = int(month)
        year = int(year)

        if isinstance(payment_date, str):
            payment_date = date.fromisoformat(payment_date)

        rent_payment, created = get_or_create_rent_payment(active_lease, month, year, request.user)

        if note_only:
            if notes:
                rent_payment.notes = notes
                rent_payment.recorded_by = request.user
                rent_payment.save()
            serializer = self.get_serializer(rent_payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        if amount_paid is None:
            return Response({'error': 'amount_paid is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_paid = Decimal(str(amount_paid))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount_paid'}, status=status.HTTP_400_BAD_REQUEST)

        if amount_paid <= 0:
            return Response({'error': 'amount_paid must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rent_payment, _payment_tx = apply_payment_record(
                rent_payment, amount_paid, payment_method, reference_number,
                payment_date, notes, request.user
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(rent_payment)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def tenant_dashboard(self, request):
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response(
                {'error': 'tenant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        active_lease = Lease.objects.filter(
            tenant=tenant,
            status=Lease.ACTIVE
        ).select_related('unit', 'unit__property').first()

        if not active_lease:
            return Response(
                {'error': 'No active lease found for tenant'},
                status=status.HTTP_404_NOT_FOUND
            )

        today = date.today()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))

        current_payment = RentPayment.objects.filter(
            tenant=tenant,
            billing_month=month,
            billing_year=year
        ).first()

        credit_ledger, _ = CreditLedger.objects.get_or_create(tenant=tenant)
        arrears_record, _ = ArrearsRecord.objects.get_or_create(tenant=tenant)
        payment_streak, _ = PaymentStreak.objects.get_or_create(tenant=tenant)

        last_payment = RentPayment.objects.filter(
            tenant=tenant,
            status__in=[RentPayment.PAID, RentPayment.OVERPAID]
        ).order_by('-payment_date').first()

        payment_history = RentPayment.objects.filter(
            tenant=tenant
        ).select_related('unit', 'recorded_by').order_by('-billing_year', '-billing_month')

        amount_expected = current_payment.amount_expected if current_payment else active_lease.rent_amount
        amount_paid = current_payment.amount_paid if current_payment else Decimal('0.00')
        current_status = current_payment.status if current_payment else RentPayment.UNPAID
        due_date = current_payment.due_date if current_payment else calculate_due_date(active_lease, month, year)

        is_overdue = False
        days_overdue = 0
        if current_status in [RentPayment.UNPAID, RentPayment.PARTIAL] and due_date and date.today() > due_date:
            is_overdue = True
            days_overdue = (date.today() - due_date).days

        credit_breakdown = compute_credit_breakdown(credit_ledger.credit_balance, active_lease.rent_amount)
        surplus_amount = max(Decimal('0'), amount_paid - amount_expected)
        month_tx_data = serialize_month_transactions(current_payment) if current_payment else []
        ledger_entries = serialize_ledger_entries(tenant)

        data = {
            'tenant_id': tenant.id,
            'tenant_name': tenant.full_name,
            'phone': tenant.phone or '',
            'unit_number': active_lease.unit.unit_number,
            'unit_type': active_lease.unit.get_unit_type_display_value(),
            'unit_type_code': active_lease.unit.unit_type or '',
            'property_name': active_lease.unit.property.name,
            'property_address': active_lease.unit.property.location or '',
            'lease_id': active_lease.id,
            'lease_start': active_lease.start_date,
            'lease_end': active_lease.end_date,
            'rent_amount': active_lease.rent_amount,
            'billing_month': month,
            'billing_year': year,
            'payment_id': current_payment.id if current_payment else None,
            'current_month_status': current_status,
            'current_month_paid': amount_paid,
            'current_month_expected': amount_expected,
            'current_month_due_date': due_date,
            'amount_owed': max(amount_expected - amount_paid, Decimal('0.00')),
            'payment_date': current_payment.payment_date if current_payment else None,
            'payment_method': current_payment.payment_method if current_payment else '',
            'reference_number': current_payment.reference_number if current_payment else '',
            'notes': current_payment.notes if current_payment else '',
            'is_late': current_payment.is_late if current_payment else False,
            'is_overdue': is_overdue,
            'days_overdue': current_payment.days_overdue if current_payment and current_payment.is_late else days_overdue,
            'credit_balance': credit_ledger.credit_balance,
            'months_credit': credit_ledger.total_months_credit,
            'credit_full_months': credit_breakdown['credit_full_months'],
            'credit_days': credit_breakdown['credit_days'],
            'daily_rate': credit_breakdown['daily_rate'],
            'months_in_arrears': arrears_record.months_in_arrears,
            'total_outstanding': arrears_record.total_outstanding,
            'last_payment_date': last_payment.payment_date if last_payment else None,
            'last_payment_amount': last_payment.amount_paid if last_payment else None,
            'last_payment_method': last_payment.payment_method if last_payment else None,
            'payment_streak': payment_streak.current_streak,
            'recorded_by_name': current_payment.recorded_by.username if current_payment and current_payment.recorded_by else '',
            'receipt_number': generate_receipt_number(current_payment) if current_payment and current_payment.amount_paid > 0 else '',
            'surplus_amount': surplus_amount,
            'next_month_name': next_month_name(month, year),
            'month_transactions': month_tx_data,
            'payment_methods_summary': summarize_payment_methods(month_tx_data),
            'references_summary': summarize_references(month_tx_data),
            'payment_history': payment_history,
            'ledger_entries': ledger_entries,
        }

        serializer = TenantPaymentDashboardSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def payment_grid(self, request):
        today = date.today()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))
        property_id = request.query_params.get('property')

        if not property_id:
            return Response({'error': 'property is required'}, status=status.HTTP_400_BAD_REQUEST)

        grid_units, summary = build_payment_grid(property_id, month, year)
        data = {'units': grid_units, 'summary': summary}
        serializer = PaymentGridSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = date.today()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))
        property_id = request.query_params.get('property')

        if not property_id:
            return Response({'error': 'property is required'}, status=status.HTTP_400_BAD_REQUEST)

        _, summary = build_payment_grid(property_id, month, year)
        return Response(summary)

    @action(detail=False, methods=['get'])
    def tenant_history(self, request):
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

        payments = RentPayment.objects.filter(tenant=tenant).select_related(
            'unit', 'recorded_by'
        ).order_by('-billing_year', '-billing_month')

        status_filter = request.query_params.get('status')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if status_filter:
            payments = payments.filter(status=status_filter)
        if month:
            payments = payments.filter(billing_month=month)
        if year:
            payments = payments.filter(billing_year=year)

        serializer = RentPaymentSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def bulk_dashboard(self, request):
        today = date.today()
        month = request.query_params.get('month', today.month)
        year = request.query_params.get('year', today.year)
        property_id = request.query_params.get('property')

        queryset = RentPayment.objects.filter(
            billing_month=month,
            billing_year=year
        ).select_related('tenant', 'unit', 'unit__property')

        if property_id:
            queryset = queryset.filter(unit__property_id=property_id)

        rent_payments = queryset.all()

        total_expected = rent_payments.aggregate(total=Sum('amount_expected'))['total'] or Decimal('0.00')
        total_collected = rent_payments.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        collection_rate = round(float(total_collected / total_expected * 100), 1) if total_expected > 0 else 0.0

        summary = {
            'total': rent_payments.count(),
            'paid': rent_payments.filter(status=RentPayment.PAID).count(),
            'unpaid': rent_payments.filter(status=RentPayment.UNPAID).count(),
            'partial': rent_payments.filter(status=RentPayment.PARTIAL).count(),
            'overpaid': rent_payments.filter(status=RentPayment.OVERPAID).count(),
            'total_collected': total_collected,
            'total_expected': total_expected,
            'collection_rate': collection_rate,
        }

        data = {
            'rent_payments': RentPaymentSerializer(rent_payments, many=True).data,
            'summary': summary
        }

        serializer = BulkRentDashboardSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def global_summary(self, request):
        """Global financials summary across all properties for the logged-in manager."""
        today = date.today()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))

        # Get all properties (assuming manager has access to all properties)
        properties = Property.objects.filter(is_active=True).order_by('name')

        # Calculate the first and last day of the billing month
        from calendar import monthrange
        month_start = date(year, month, 1)
        month_end = date(year, month, monthrange(year, month)[1])

        # Get leases that were active during the billing month
        # A lease is active if it overlaps with the billing month
        active_leases = Lease.objects.filter(
            unit__property__in=properties,
            start_date__lte=month_end,
            end_date__gte=month_start
        ).select_related('tenant', 'unit', 'unit__property')

        # Get rent payments for the selected month/year
        rent_payments = RentPayment.objects.filter(
            billing_month=month,
            billing_year=year,
            unit__property__in=properties
        ).select_related('tenant', 'unit', 'unit__property')

        # Build payment lookup by unit
        payment_by_unit = {p.unit_id: p for p in rent_payments}

        # Calculate per-property data
        property_data = []
        total_expected = Decimal('0.00')
        total_collected = Decimal('0.00')
        total_commission = Decimal('0.00')
        total_units = 0
        total_occupied = 0

        for property_obj in properties:
            # Get units for this property
            property_units = Unit.objects.filter(property=property_obj)
            unit_count = property_units.count()
            total_units += unit_count

            # Get active leases for this property
            property_leases = active_leases.filter(unit__property=property_obj)
            occupied_count = property_leases.count()
            total_occupied += occupied_count

            # Calculate expected rent from active leases
            property_expected = sum(lease.rent_amount for lease in property_leases)
            total_expected += property_expected

            # Calculate collected rent from actual payments
            property_collected = Decimal('0.00')
            for lease in property_leases:
                payment = payment_by_unit.get(lease.unit_id)
                if payment:
                    property_collected += payment.amount_paid

            total_collected += property_collected

            # Calculate commission
            commission_pct = property_obj.commission_percent or Decimal('0.00')
            commission_amt = property_collected * (commission_pct / Decimal('100'))
            total_commission += commission_amt

            # Calculate net to owner
            net_to_owner = property_collected - commission_amt

            # Determine status
            if occupied_count == 0:
                status = 'no_tenants'
            elif property_collected >= property_expected:
                status = 'full'
            elif property_collected > 0:
                status = 'partial'
            else:
                status = 'no_collection'

            property_data.append({
                'id': property_obj.id,
                'name': property_obj.name,
                'property_type': property_obj.property_type,
                'location': property_obj.location,
                'units': unit_count,
                'occupied': occupied_count,
                'expected': property_expected,
                'collected': property_collected,
                'commission_percent': commission_pct,
                'commission_amount': commission_amt,
                'net_to_owner': net_to_owner,
                'outstanding': property_expected - property_collected,
                'status': status
            })

        # Calculate collection rate
        collection_rate = round(float(total_collected / total_expected * 100), 1) if total_expected > 0 else 0.0

        # Build summary
        summary = {
            'total_properties': len(properties),
            'total_units': total_units,
            'total_occupied': total_occupied,
            'occupancy_rate': round(float(total_occupied / total_units * 100), 1) if total_units > 0 else 0.0,
            'total_expected': total_expected,
            'total_collected': total_collected,
            'collection_rate': collection_rate,
            'total_commission': total_commission,
            'net_to_owners': total_collected - total_commission,
            'total_outstanding': total_expected - total_collected,
            'properties': property_data
        }

        return Response(summary)

    @action(detail=False, methods=['post'])
    def generate_billing_cycle(self, request):
        month = request.data.get('month')
        year = request.data.get('year')
        property_id = request.data.get('property')

        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_leases = Lease.objects.filter(status=Lease.ACTIVE).select_related('unit')
        if property_id:
            active_leases = active_leases.filter(unit__property_id=property_id)
        
        created_count = 0
        skipped_count = 0

        for lease in active_leases:
            # Check if rent payment already exists
            existing = RentPayment.objects.filter(
                tenant=lease.tenant,
                unit=lease.unit,
                lease=lease,
                billing_month=month,
                billing_year=year
            ).first()

            if existing:
                skipped_count += 1
                continue

            due_date = calculate_due_date(lease, month, year)

            RentPayment.objects.create(
                tenant=lease.tenant,
                unit=lease.unit,
                lease=lease,
                billing_month=month,
                billing_year=year,
                due_date=due_date,
                amount_expected=lease.rent_amount,
                amount_paid=Decimal('0.00'),
                recorded_by=request.user
            )
            created_count += 1

        return Response({
            'message': f'Billing cycle generated successfully',
            'created': created_count,
            'skipped': skipped_count
        })


class CreditLedgerViewSet(viewsets.ModelViewSet):
    queryset = CreditLedger.objects.select_related('tenant')
    serializer_class = CreditLedgerSerializer
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]


class ArrearsRecordViewSet(viewsets.ModelViewSet):
    queryset = ArrearsRecord.objects.select_related('tenant')
    serializer_class = ArrearsRecordSerializer
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]


class PaymentAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentAuditLog.objects.select_related('rent_payment', 'changed_by')
    serializer_class = PaymentAuditLogSerializer
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-timestamp']


class PaymentStreakViewSet(viewsets.ModelViewSet):
    queryset = PaymentStreak.objects.select_related('tenant')
    serializer_class = PaymentStreakSerializer
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]
