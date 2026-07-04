from django.contrib import admin
from .models import (
    RentPayment, CreditLedger, ArrearsRecord,
    PaymentAuditLog, PaymentStreak, PaymentTransaction
)


@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'tenant', 'unit', 'billing_month', 'billing_year',
        'amount_expected', 'amount_paid', 'status',
        'payment_date', 'is_late', 'days_overdue'
    ]
    list_filter = ['status', 'payment_method', 'is_late', 'billing_month', 'billing_year']
    search_fields = ['tenant__full_name', 'unit__unit_number', 'reference_number']
    readonly_fields = ['created_at', 'updated_at', 'is_late', 'days_overdue']
    date_hierarchy = 'payment_date'
    ordering = ['-billing_year', '-billing_month', '-due_date']

    fieldsets = (
        ('Tenant & Unit Information', {
            'fields': ('tenant', 'unit', 'lease')
        }),
        ('Billing Cycle', {
            'fields': ('billing_month', 'billing_year', 'due_date')
        }),
        ('Payment Details', {
            'fields': ('amount_expected', 'amount_paid', 'payment_date',
                       'payment_method', 'reference_number', 'status')
        }),
        ('Additional Information', {
            'fields': ('notes', 'recorded_by')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at', 'is_late', 'days_overdue'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CreditLedger)
class CreditLedgerAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'credit_balance', 'total_months_credit', 'last_updated']
    search_fields = ['tenant__full_name']
    readonly_fields = ['created_at', 'last_updated']


@admin.register(ArrearsRecord)
class ArrearsRecordAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'months_in_arrears', 'total_outstanding', 'last_updated']
    search_fields = ['tenant__full_name']
    readonly_fields = ['created_at', 'last_updated']


@admin.register(PaymentAuditLog)
class PaymentAuditLogAdmin(admin.ModelAdmin):
    list_display = ['rent_payment', 'changed_by', 'old_status', 'new_status', 'timestamp']
    list_filter = ['old_status', 'new_status', 'timestamp']
    search_fields = ['rent_payment__tenant__full_name', 'changed_by__username']
    readonly_fields = ['rent_payment', 'changed_by', 'old_status', 'new_status',
                      'old_amount_paid', 'new_amount_paid', 'change_description', 'timestamp']
    date_hierarchy = 'timestamp'


@admin.register(PaymentStreak)
class PaymentStreakAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'current_streak', 'longest_streak', 'last_payment_date', 'updated_at']
    search_fields = ['tenant__full_name']
    readonly_fields = ['updated_at']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'rent_payment', 'amount', 'payment_method', 'payment_date', 'recorded_by']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['receipt_number', 'rent_payment__tenant__full_name', 'reference_number']
    readonly_fields = ['receipt_number', 'created_at']
