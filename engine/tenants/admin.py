from django.contrib import admin
from .models import Tenant, Lease, Invoice, Payment, Deposit, Reminder, MessageTemplate, MessageLog


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'email', 'status', 'date_added']
    list_filter = ['status']
    search_fields = ['full_name', 'phone', 'email']


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'unit', 'start_date', 'end_date', 'rent_amount', 'status', 'date_created']
    list_filter = ['status']
    date_hierarchy = 'start_date'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'unit', 'month', 'year', 'amount_due', 'penalty_amount', 'due_date', 'status']
    list_filter = ['status', 'month', 'year']
    date_hierarchy = 'date_generated'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'tenant', 'amount_paid', 'payment_date', 'payment_method', 'receipt_number']
    list_filter = ['payment_method', 'payment_date']
    date_hierarchy = 'payment_date'


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ['lease', 'amount_paid', 'date_paid', 'amount_refunded', 'refund_date']
    date_hierarchy = 'date_paid'


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'tenant', 'channel', 'sent_date', 'status']
    list_filter = ['channel', 'status']
    date_hierarchy = 'sent_date'


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'channel', 'date_created']
    list_filter = ['channel']


@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'channel', 'status', 'date_sent']
    list_filter = ['channel', 'status']
    date_hierarchy = 'date_sent'
