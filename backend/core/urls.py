from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    UserViewSet, PropertyViewSet, UnitViewSet,
    LandlordViewSet, LandlordPropertyViewSet, CommissionViewSet,
    LandlordPayoutViewSet, TenantViewSet, TenantUnitViewSet,
    LeaseViewSet, InvoiceViewSet, PaymentViewSet,
    PenaltyRuleViewSet, ReminderViewSet, ExpenseViewSet,
    DepositViewSet, MessageTemplateViewSet, MessageLogViewSet,
    MaintenanceRequestViewSet, MaintenanceAssignmentViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'units', UnitViewSet)
router.register(r'landlords', LandlordViewSet)
router.register(r'landlord-properties', LandlordPropertyViewSet)
router.register(r'commissions', CommissionViewSet)
router.register(r'landlord-payouts', LandlordPayoutViewSet)
router.register(r'tenants', TenantViewSet)
router.register(r'tenant-units', TenantUnitViewSet)
router.register(r'leases', LeaseViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'penalty-rules', PenaltyRuleViewSet)
router.register(r'reminders', ReminderViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'deposits', DepositViewSet)
router.register(r'message-templates', MessageTemplateViewSet)
router.register(r'message-logs', MessageLogViewSet)
router.register(r'maintenance-requests', MaintenanceRequestViewSet)
router.register(r'maintenance-assignments', MaintenanceAssignmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
