from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RentPaymentViewSet, CreditLedgerViewSet, ArrearsRecordViewSet,
    PaymentAuditLogViewSet, PaymentStreakViewSet
)

router = DefaultRouter()
router.register(r'rent-payments', RentPaymentViewSet, basename='rentpayment')
router.register(r'credit-ledgers', CreditLedgerViewSet, basename='creditledger')
router.register(r'arrears-records', ArrearsRecordViewSet, basename='arrearsrecord')
router.register(r'audit-logs', PaymentAuditLogViewSet, basename='auditlog')
router.register(r'payment-streaks', PaymentStreakViewSet, basename='paymentstreak')

urlpatterns = [
    path('', include(router.urls)),
]
