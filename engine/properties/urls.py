from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet, LandlordViewSet, LandlordPropertyViewSet,
    CommissionViewSet, LandlordPayoutViewSet, PenaltyRuleViewSet
)

router = DefaultRouter()
router.register(r'properties', PropertyViewSet)
router.register(r'landlords', LandlordViewSet)
router.register(r'landlord-properties', LandlordPropertyViewSet)
router.register(r'commissions', CommissionViewSet)
router.register(r'landlord-payouts', LandlordPayoutViewSet)
router.register(r'penalty-rules', PenaltyRuleViewSet)

app_name = 'properties'

urlpatterns = [
    path('', include(router.urls)),
]
