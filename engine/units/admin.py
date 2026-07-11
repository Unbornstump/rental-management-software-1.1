from django.contrib import admin
from .models import Unit, TenantUnit, MaintenanceRequest, MaintenanceAssignment, Expense


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['property', 'unit_number', 'unit_type', 'rent_amount', 'status', 'date_added']
    list_filter = ['unit_type', 'status', 'property']
    search_fields = ['unit_number', 'property__name']


@admin.register(TenantUnit)
class TenantUnitAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'unit', 'move_in_date', 'move_out_date', 'is_active']
    list_filter = ['is_active']
    date_hierarchy = 'move_in_date'


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ['unit', 'priority', 'status', 'date_reported']
    list_filter = ['priority', 'status']
    date_hierarchy = 'date_reported'


@admin.register(MaintenanceAssignment)
class MaintenanceAssignmentAdmin(admin.ModelAdmin):
    list_display = ['request', 'assigned_to', 'assigned_date', 'resolved_date', 'cost']
    list_filter = ['assigned_date', 'resolved_date']
    date_hierarchy = 'assigned_date'


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['property', 'unit', 'category', 'amount', 'date']
    list_filter = ['category', 'date', 'property']
    date_hierarchy = 'date'
