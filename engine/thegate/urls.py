from django.urls import path
from .views import (
    LoginView, get_current_user, change_password, save_security_questions,
    verify_security_questions, login_with_recovery_code, setup_status,
    check_username_availability, register_manager, StaffListView,
    StaffDetailView, reset_staff_password, AuditLogListView,
    SystemSettingsView, reset_all_staff_passwords, administration_stats,
    recover_send_email, recover_verify_code, recover_verify_question,
    recover_set_password, recover_generate_code, recovery_settings_update,
    get_recovery_settings, recover_get_question
)

urlpatterns = [
    # Authentication
    path('auth/setup-status/', setup_status, name='setup_status'),
    path('auth/username-availability/', check_username_availability, name='check_username_availability'),
    path('admin/check-username/', check_username_availability, name='check_staff_username_availability'),
    path('auth/register/', register_manager, name='register_manager'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', get_current_user, name='get_current_user'),
    path('auth/change-password/', change_password, name='change_password'),
    path('auth/security-questions/', save_security_questions, name='save_security_questions'),
    path('auth/verify-security-questions/', verify_security_questions, name='verify_security_questions'),
    path('auth/login-with-recovery-code/', login_with_recovery_code, name='login_with_recovery_code'),
    
    # Password Recovery - New Flow
    path('auth/recover/send-email/', recover_send_email, name='recover_send_email'),
    path('auth/recover/verify-code/', recover_verify_code, name='recover_verify_code'),
    path('auth/recover/verify-question/', recover_verify_question, name='recover_verify_question'),
    path('auth/recover/set-password/', recover_set_password, name='recover_set_password'),
    path('auth/recover/generate-code/', recover_generate_code, name='recover_generate_code'),
    path('auth/recover/settings/', get_recovery_settings, name='get_recovery_settings'),
    path('auth/recover/settings/update/', recovery_settings_update, name='recovery_settings_update'),
    path('auth/recover/question-text/', recover_get_question, name='recover_get_question'),
    
    # Staff Management (Manager only)
    path('admin/staff/', StaffListView.as_view(), name='staff_list'),
    path('admin/staff/<int:pk>/', StaffDetailView.as_view(), name='staff_detail'),
    path('admin/staff/<int:staff_id>/reset-password/', reset_staff_password, name='reset_staff_password'),
    path('admin/staff/reset-all-passwords/', reset_all_staff_passwords, name='reset_all_staff_passwords'),
    
    # Audit Log (Manager only)
    path('admin/audit-log/', AuditLogListView.as_view(), name='audit_log'),
    
    # System Settings (Manager only)
    path('admin/settings/', SystemSettingsView.as_view(), name='system_settings'),
    
    # Control Center Stats
    path('admin/administration-stats/', administration_stats, name='administration_stats'),
]
