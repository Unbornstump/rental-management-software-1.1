from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UnitViewSet, TenantUnitViewSet, MaintenanceRequestViewSet,
    MaintenanceAssignmentViewSet, ExpenseViewSet
)

router = DefaultRouter()
router.register(r'units', UnitViewSet)
router.register(r'tenant-units', TenantUnitViewSet)
router.register(r'maintenance-requests', MaintenanceRequestViewSet)
router.register(r'maintenance-assignments', MaintenanceAssignmentViewSet)
router.register(r'expenses', ExpenseViewSet)

app_name = 'units'

urlpatterns = [
    path('', include(router.urls)),
]
