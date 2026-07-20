from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from core.models import CustomUser, Property, Unit, Lease
from core.permissions import RolePermission
from .models import RentPayment

from .dashboard import (
    build_dashboard_summary,
    build_payment_status,
    build_dashboard_alerts,
    build_dashboard_activity,
    build_dashboard_snapshot,
)


class PropertyDashboardMixin:
    def get_property_id(self, request):
        property_id = request.query_params.get('property')
        if not property_id:
            return None
        return int(property_id)

    def require_property(self, request):
        property_id = self.get_property_id(request)
        if not property_id:
            return None, Response(
                {'error': 'property is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return property_id, None


class DashboardSummaryView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        data = build_dashboard_summary(
            property_id,
            request.query_params.get('month'),
            request.query_params.get('year'),
        )
        return Response(data)


class DashboardPaymentStatusView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        data = build_payment_status(
            property_id,
            request.query_params.get('month'),
            request.query_params.get('year'),
        )
        return Response(data)


class DashboardAlertsView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        return Response(build_dashboard_alerts(property_id))


class DashboardActivityView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        limit = int(request.query_params.get('limit', 8))
        return Response(build_dashboard_activity(property_id, limit=limit))


class DashboardSnapshotView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated, RolePermission([CustomUser.MANAGER])]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        data = build_dashboard_snapshot(
            property_id,
            request.query_params.get('month'),
            request.query_params.get('year'),
        )
        return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_hub_stats(request):
    """Return real statistics for the Financial Hub card in Control Center.
    
    If property query param is provided, returns stats scoped to that property.
    Otherwise, returns global stats across all properties.
    """
    from datetime import date
    from decimal import Decimal
    from calendar import monthrange
    
    property_id = request.query_params.get('property')
    month = int(request.query_params.get('month', date.today().month))
    year = int(request.query_params.get('year', date.today().year))
    
    # Get all active properties
    properties = Property.objects.filter(is_active=True)
    if property_id:
        try:
            properties = properties.filter(id=int(property_id))
            if not properties.exists():
                return Response({'error': 'Invalid property ID'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid property ID'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate the first and last day of the billing month
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
    
    # Calculate totals
    total_expected = Decimal('0.00')
    total_collected = Decimal('0.00')
    total_commission = Decimal('0.00')
    
    for property_obj in properties:
        # Get active leases for this property
        property_leases = active_leases.filter(unit__property=property_obj)
        
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
    
    # Calculate collection rate
    collection_rate = round(float(total_collected / total_expected * 100), 1) if total_expected > 0 else 0.0
    net_to_owners = total_collected - total_commission
    has_payments = total_collected > 0
    
    # Get last updated time (most recent payment or property update)
    last_payment = rent_payments.order_by('-updated_at').first()
    last_updated = last_payment.updated_at if last_payment else None
    
    return Response({
        'collection_rate': collection_rate,
        'net_to_owners': float(net_to_owners),
        'total_collected': float(total_collected),
        'total_expected': float(total_expected),
        'has_payments': has_payments,
        'last_updated': last_updated.isoformat() if last_updated else None
    })
