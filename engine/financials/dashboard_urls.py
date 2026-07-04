from django.urls import path
from .dashboard_views import (
    DashboardSummaryView,
    DashboardPaymentStatusView,
    DashboardAlertsView,
    DashboardActivityView,
    DashboardSnapshotView,
)

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('payment-status/', DashboardPaymentStatusView.as_view(), name='dashboard-payment-status'),
    path('alerts/', DashboardAlertsView.as_view(), name='dashboard-alerts'),
    path('activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('snapshot/', DashboardSnapshotView.as_view(), name='dashboard-snapshot'),
]
