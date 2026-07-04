from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, F
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import (
    RentPayment, CreditLedger, ArrearsRecord,
    PaymentAuditLog, PaymentStreak
)
from .serializers import (
    RentPaymentSerializer, RentPaymentCreateSerializer,
    CreditLedgerSerializer, ArrearsRecordSerializer,
    PaymentAuditLogSerializer, PaymentStreakSerializer,
    TenantPaymentDashboardSerializer, BulkRentDashboardSerializer
)
from core.models import Lease, Unit


class RentPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tenant__full_name', 'unit__unit_number', 'reference_number']
    ordering_fields = ['billing_year', 'billing_month', 'due_date', 'payment_date']
    ordering = ['-billing_year', '-billing_month', 'due_date']

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

        if not amount_paid:
            return Response(
                {'error': 'amount_paid is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount_paid = Decimal(str(amount_paid))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount_paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Check for credit balance first
            credit_ledger, _ = CreditLedger.objects.get_or_create(
                tenant=rent_payment.tenant
            )

            # If overpayment, add to credit
            if amount_paid > rent_payment.amount_expected:
                surplus = amount_paid - rent_payment.amount_expected
                credit_ledger.add_credit(surplus)
                credit_ledger.total_months_credit += surplus / rent_payment.amount_expected
                credit_ledger.save()

            # If credit exists and payment is partial, apply credit
            elif amount_paid < rent_payment.amount_expected and credit_ledger.credit_balance > 0:
                remaining = rent_payment.amount_expected - amount_paid
                if credit_ledger.credit_balance >= remaining:
                    credit_ledger.deduct_credit(remaining)
                    amount_paid = rent_payment.amount_expected
                else:
                    amount_paid += credit_ledger.credit_balance
                    credit_ledger.credit_balance = Decimal('0.00')
                    credit_ledger.save()

            # Update rent payment
            old_status = rent_payment.status
            old_amount = rent_payment.amount_paid
            
            rent_payment.amount_paid = amount_paid
            rent_payment.payment_date = payment_date
            rent_payment.payment_method = payment_method
            rent_payment.reference_number = reference_number
            rent_payment.notes = notes
            rent_payment.recorded_by = request.user
            rent_payment.save()

            # Update arrears
            arrears_record, _ = ArrearsRecord.objects.get_or_create(
                tenant=rent_payment.tenant
            )
            
            if rent_payment.status in [RentPayment.PAID, RentPayment.OVERPAID]:
                if old_status in [RentPayment.UNPAID, RentPayment.PARTIAL]:
                    arrears_record.decrement_arrears(rent_payment.amount_expected)
                    
                    # Update payment streak
                    streak, _ = PaymentStreak.objects.get_or_create(
                        tenant=rent_payment.tenant
                    )
                    if not rent_payment.is_late:
                        streak.increment_streak()
                    streak.last_payment_date = payment_date
                    streak.save()
            elif rent_payment.status in [RentPayment.UNPAID, RentPayment.PARTIAL]:
                if old_status in [RentPayment.PAID, RentPayment.OVERPAID]:
                    arrears_record.increment_arrears(rent_payment.amount_expected)
                    
                    # Reset streak
                    streak, _ = PaymentStreak.objects.get_or_create(
                        tenant=rent_payment.tenant
                    )
                    streak.reset_streak()

            # Log the change
            PaymentAuditLog.objects.create(
                rent_payment=rent_payment,
                changed_by=request.user,
                old_status=old_status,
                new_status=rent_payment.status,
                old_amount_paid=old_amount,
                new_amount_paid=amount_paid,
                change_description=f"Payment recorded: {amount_paid} via {payment_method}"
            )

        serializer = self.get_serializer(rent_payment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tenant_dashboard(self, request):
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            return Response(
                {'error': 'tenant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from core.models import Tenant
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get active lease
        active_lease = Lease.objects.filter(
            tenant=tenant,
            status=Lease.ACTIVE
        ).first()

        if not active_lease:
            return Response(
                {'error': 'No active lease found for tenant'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get current month rent payment
        today = date.today()
        current_payment = RentPayment.objects.filter(
            tenant=tenant,
            billing_month=today.month,
            billing_year=today.year
        ).first()

        # Get credit ledger
        credit_ledger, _ = CreditLedger.objects.get_or_create(tenant=tenant)

        # Get arrears record
        arrears_record, _ = ArrearsRecord.objects.get_or_create(tenant=tenant)

        # Get payment streak
        payment_streak, _ = PaymentStreak.objects.get_or_create(tenant=tenant)

        # Get last payment
        last_payment = RentPayment.objects.filter(
            tenant=tenant,
            status__in=[RentPayment.PAID, RentPayment.OVERPAID]
        ).order_by('-payment_date').first()

        # Get payment history
        payment_history = RentPayment.objects.filter(
            tenant=tenant
        ).order_by('-billing_year', '-billing_month')[:12]

        data = {
            'tenant_id': tenant.id,
            'tenant_name': tenant.full_name,
            'phone': tenant.phone,
            'unit_number': active_lease.unit.unit_number,
            'property_name': active_lease.unit.property.name,
            'lease_start': active_lease.start_date,
            'lease_end': active_lease.end_date,
            'rent_amount': active_lease.rent_amount,
            'current_month_status': current_payment.status if current_payment else 'unpaid',
            'current_month_paid': current_payment.amount_paid if current_payment else Decimal('0.00'),
            'current_month_expected': current_payment.amount_expected if current_payment else active_lease.rent_amount,
            'current_month_due_date': current_payment.due_date if current_payment else None,
            'credit_balance': credit_ledger.credit_balance,
            'months_credit': credit_ledger.total_months_credit,
            'months_in_arrears': arrears_record.months_in_arrears,
            'total_outstanding': arrears_record.total_outstanding,
            'last_payment_date': last_payment.payment_date if last_payment else None,
            'last_payment_amount': last_payment.amount_paid if last_payment else None,
            'last_payment_method': last_payment.payment_method if last_payment else None,
            'payment_streak': payment_streak.current_streak,
            'payment_history': RentPaymentSerializer(payment_history, many=True).data
        }

        serializer = TenantPaymentDashboardSerializer(data)
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

        # Calculate summary
        summary = {
            'total': rent_payments.count(),
            'paid': rent_payments.filter(status=RentPayment.PAID).count(),
            'unpaid': rent_payments.filter(status=RentPayment.UNPAID).count(),
            'partial': rent_payments.filter(status=RentPayment.PARTIAL).count(),
            'overpaid': rent_payments.filter(status=RentPayment.OVERPAID).count(),
            'total_collected': rent_payments.aggregate(
                total=Sum('amount_paid')
            )['total'] or Decimal('0.00'),
            'total_expected': rent_payments.aggregate(
                total=Sum('amount_expected')
            )['total'] or Decimal('0.00'),
        }

        data = {
            'rent_payments': RentPaymentSerializer(rent_payments, many=True).data,
            'summary': summary
        }

        serializer = BulkRentDashboardSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate_billing_cycle(self, request):
        month = request.data.get('month')
        year = request.data.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active leases
        active_leases = Lease.objects.filter(status=Lease.ACTIVE)
        
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

            # Calculate due date (1st of next month by default, or based on lease start day)
            due_day = lease.start_date.day
            try:
                due_date = date(year, month, due_day)
            except ValueError:
                # If the day doesn't exist in that month, use last day
                from calendar import monthrange
                due_date = date(year, month, monthrange(year, month)[1])

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
    permission_classes = [IsAuthenticated]


class ArrearsRecordViewSet(viewsets.ModelViewSet):
    queryset = ArrearsRecord.objects.select_related('tenant')
    serializer_class = ArrearsRecordSerializer
    permission_classes = [IsAuthenticated]


class PaymentAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentAuditLog.objects.select_related('rent_payment', 'changed_by')
    serializer_class = PaymentAuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-timestamp']


class PaymentStreakViewSet(viewsets.ModelViewSet):
    queryset = PaymentStreak.objects.select_related('tenant')
    serializer_class = PaymentStreakSerializer
    permission_classes = [IsAuthenticated]
