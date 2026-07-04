from django.urls import path
from .views import (
    LoginView, get_current_user, change_password,
    StaffListView, StaffDetailView, reset_staff_password,
    AuditLogListView, SystemSettingsView, reset_all_staff_passwords
)

urlpatterns = [
    # Authentication
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', get_current_user, name='get_current_user'),
    path('auth/change-password/', change_password, name='change_password'),
    
    # Staff Management (Manager only)
    path('admin/staff/', StaffListView.as_view(), name='staff_list'),
    path('admin/staff/<int:pk>/', StaffDetailView.as_view(), name='staff_detail'),
    path('admin/staff/<int:staff_id>/reset-password/', reset_staff_password, name='reset_staff_password'),
    path('admin/staff/reset-all-passwords/', reset_all_staff_passwords, name='reset_all_staff_passwords'),
    
    # Audit Log (Manager only)
    path('admin/audit-log/', AuditLogListView.as_view(), name='audit_log'),
    
    # System Settings (Manager only)
    path('admin/settings/', SystemSettingsView.as_view(), name='system_settings'),
]
