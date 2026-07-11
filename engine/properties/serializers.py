from rest_framework import serializers
from .models import Property, Landlord, LandlordProperty, Commission, LandlordPayout, PenaltyRule


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ['id', 'name', 'location', 'property_type', 'owner_details', 'commission_percent', 'date_added', 'is_active']
        read_only_fields = ['id', 'date_added']


class LandlordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landlord
        fields = ['id', 'full_name', 'national_id', 'phone', 'email', 'bank_account_details', 'mpesa_number', 'date_added']
        read_only_fields = ['id', 'date_added']


class LandlordPropertySerializer(serializers.ModelSerializer):
    landlord_name = serializers.CharField(source='landlord.full_name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = LandlordProperty
        fields = ['id', 'landlord', 'landlord_name', 'property', 'property_name', 'commission_rate']
        read_only_fields = ['id']


class CommissionSerializer(serializers.ModelSerializer):
    landlord_name = serializers.CharField(source='landlord.full_name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = Commission
        fields = ['id', 'payment', 'landlord', 'landlord_name', 'property', 'property_name', 'commission_amount', 'date_calculated']
        read_only_fields = ['id', 'date_calculated']


class LandlordPayoutSerializer(serializers.ModelSerializer):
    landlord_name = serializers.CharField(source='landlord.full_name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = LandlordPayout
        fields = [
            'id', 'landlord', 'landlord_name', 'property', 'property_name', 'period_month', 'period_year',
            'gross_rent_collected', 'commission_deducted', 'net_amount',
            'payout_date', 'payout_method', 'status',
        ]
        read_only_fields = ['id']


class PenaltyRuleSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = PenaltyRule
        fields = ['id', 'property', 'property_name', 'grace_period_days', 'penalty_type', 'penalty_value']
        read_only_fields = ['id']
