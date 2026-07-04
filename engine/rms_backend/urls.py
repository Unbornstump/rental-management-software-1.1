from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('thegate.urls')),  # Auth, staff, audit, settings via thegate
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('core.urls')),  # Core data endpoints
    path('api/financials/', include('financials.urls')),
    path('api/dashboard/', include('financials.dashboard_urls')),
]
