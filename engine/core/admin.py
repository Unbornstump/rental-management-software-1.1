from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import (
    Property, Unit, Landlord, LandlordProperty, Commission, LandlordPayout,
    Tenant, TenantUnit, Lease, Invoice, Payment, PenaltyRule, Reminder,
    Expense, MessageTemplate, MessageLog,
    MaintenanceRequest, MaintenanceAssignment,
)

User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email')

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'property_type', 'is_active', 'date_added')
    list_filter = ('property_type', 'is_active')
    search_fields = ('name', 'location')

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'property', 'unit_type', 'rent_amount', 'status')
    list_filter = ('unit_type', 'status')
    search_fields = ('unit_number', 'property__name')

@admin.register(Landlord)
class LandlordAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'email')
    search_fields = ('full_name', 'phone', 'email')

@admin.register(LandlordProperty)
class LandlordPropertyAdmin(admin.ModelAdmin):
    list_display = ('landlord', 'property', 'commission_rate')

@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    list_display = ('payment', 'landlord', 'property', 'commission_amount', 'date_calculated')

@admin.register(LandlordPayout)
class LandlordPayoutAdmin(admin.ModelAdmin):
    list_display = ('landlord', 'property', 'period_month', 'period_year', 'net_amount', 'status')
    list_filter = ('status', 'period_year')

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'status', 'date_added')
    list_filter = ('status',)
    search_fields = ('full_name', 'phone')
 
@admin.register(TenantUnit)
class TenantUnitAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'move_in_date', 'move_out_date', 'is_active')

@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'start_date', 'end_date', 'status')
    list_filter = ('status',)
    search_fields = ('tenant__full_name', 'unit__unit_number')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'month', 'year', 'amount_due', 'status')
    list_filter = ('status', 'year', 'month')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'tenant', 'amount_paid', 'payment_date', 'payment_method')
    list_filter = ('payment_method',)

@admin.register(PenaltyRule)
class PenaltyRuleAdmin(admin.ModelAdmin):
    list_display = ('property', 'grace_period_days', 'penalty_type', 'penalty_value')

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'channel', 'status', 'sent_date')
    list_filter = ('channel', 'status')

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('property', 'unit', 'category', 'amount', 'date')
    list_filter = ('category', 'property')

@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel', 'date_created')

@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'channel', 'status', 'date_sent')
    list_filter = ('channel', 'status')

@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ('unit', 'priority', 'status', 'date_reported')
    list_filter = ('priority', 'status')

@admin.register(MaintenanceAssignment)
class MaintenanceAssignmentAdmin(admin.ModelAdmin):
    list_display = ('request', 'assigned_to', 'assigned_date', 'resolved_date', 'cost')
