from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TenantViewSet, LeaseViewSet, InvoiceViewSet, PaymentViewSet,
    DepositViewSet, ReminderViewSet, MessageTemplateViewSet, MessageLogViewSet
)

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)
router.register(r'leases', LeaseViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'deposits', DepositViewSet)
router.register(r'reminders', ReminderViewSet)
router.register(r'message-templates', MessageTemplateViewSet)
router.register(r'message-logs', MessageLogViewSet)

app_name = 'tenants'

urlpatterns = [
    path('', include(router.urls)),
]
