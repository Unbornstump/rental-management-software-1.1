from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        return Response(build_dashboard_alerts(property_id))


class DashboardActivityView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        property_id, err = self.require_property(request)
        if err:
            return err
        limit = int(request.query_params.get('limit', 8))
        return Response(build_dashboard_activity(property_id, limit=limit))


class DashboardSnapshotView(PropertyDashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

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
