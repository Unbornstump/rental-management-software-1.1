from django.contrib import admin
from .models import Property, Landlord, LandlordProperty, Commission, LandlordPayout, PenaltyRule


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'property_type', 'is_active', 'date_added']
    list_filter = ['property_type', 'is_active']
    search_fields = ['name', 'location']


@admin.register(Landlord)
class LandlordAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'email', 'date_added']
    search_fields = ['full_name', 'phone', 'email']


@admin.register(LandlordProperty)
class LandlordPropertyAdmin(admin.ModelAdmin):
    list_display = ['landlord', 'property', 'commission_rate']
    list_filter = ['landlord', 'property']


@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    list_display = ['landlord', 'property', 'commission_amount', 'date_calculated']
    list_filter = ['date_calculated']
    date_hierarchy = 'date_calculated'


@admin.register(LandlordPayout)
class LandlordPayoutAdmin(admin.ModelAdmin):
    list_display = ['landlord', 'property', 'period_month', 'period_year', 'net_amount', 'status', 'payout_date']
    list_filter = ['status', 'period_year', 'period_month']


@admin.register(PenaltyRule)
class PenaltyRuleAdmin(admin.ModelAdmin):
    list_display = ['property', 'grace_period_days', 'penalty_type', 'penalty_value']
    list_filter = ['penalty_type']
