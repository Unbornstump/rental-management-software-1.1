# RMS Backend Restructure - Migration Guide

## Summary
The Django backend has been restructured from a monolithic `engine.core` app into domain-specific apps:
- `engine.thegate` - Auth, staff, roles (CustomUser, SecurityQuestion, RecoveryCode)
- `engine.core` - Shared models (AuditLog, SystemSettings, format_audit_log_details)
- `engine.properties` - Property models (Property, Landlord, LandlordProperty, Commission, LandlordPayout, PenaltyRule)
- `engine.units` - Unit models (Unit, TenantUnit, MaintenanceRequest, MaintenanceAssignment, Expense)
- `engine.tenants` - Tenant models (Tenant, Lease, Invoice, Payment, Deposit, Reminder, MessageTemplate, MessageLog)
- `engine.financials` - Financial models (already existed, updated FK references)

## Changes Made
- All models moved to their respective apps
- `AUTH_USER_MODEL` changed from `core.CustomUser` to `thegate.CustomUser`
- Foreign keys updated to use string references with new app labels
- All serializers, views, URLs, and admin registrations created for new apps
- Root `urls.py` updated to include new app URL patterns
- Import paths updated across the codebase

## Migration Strategy

### IMPORTANT: Test on a copy of your database first!

```bash
# Backup your database
cp db.sqlite3 db.sqlite3.backup
```

### Step 1: Create initial migrations for new apps

```bash
python manage.py makemigrations thegate
python manage.py makemigrations properties
python manage.py makemigrations units
python manage.py makemigrations tenants
```

### Step 2: Create data migration to move models

You'll need to create a custom migration for each app to move data from the old `core` tables to the new app tables. The migrations should use `SeparateDatabaseAndState` to handle the transition.

Example for `thegate` (create `engine/thegate/migrations/0002_move_auth_models.py`):

```python
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('thegate', '0001_initial'),
        ('core', '0006_property_commission_percent'),
    ]

    operations = [
        # Move CustomUser data
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RunSQL(
                    "INSERT INTO thegate_customuser (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, must_change_password, created_by_id) SELECT id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, must_change_password, created_by_id FROM core_customuser",
                    reverse_sql="DELETE FROM thegate_customuser WHERE id IN (SELECT id FROM core_customuser)"
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    "INSERT INTO thegate_customuser (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, must_change_password, created_by_id) SELECT id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, must_change_password, created_by_id FROM core_customuser",
                    reverse_sql="DELETE FROM thegate_customuser WHERE id IN (SELECT id FROM core_customuser)"
                ),
            ],
        ),
        # Similar operations for SecurityQuestion and RecoveryCode
    ]
```

### Step 3: Alternative approach - Use Django's built-in migration operations

A safer approach is to use Django's `migrations.RunPython` with custom migration functions:

```python
from django.db import migrations

def move_custom_users(apps, schema_editor):
    CustomUserOld = apps.get_model('core', 'CustomUser')
    CustomUserNew = apps.get_model('thegate', 'CustomUser')
    
    for old_user in CustomUserOld.objects.all():
        CustomUserNew.objects.create(
            id=old_user.id,
            password=old_user.password,
            last_login=old_user.last_login,
            is_superuser=old_user.is_superuser,
            username=old_user.username,
            first_name=old_user.first_name,
            last_name=old_user.last_name,
            email=old_user.email,
            is_staff=old_user.is_staff,
            is_active=old_user.is_active,
            date_joined=old_user.date_joined,
            role=old_user.role,
            must_change_password=old_user.must_change_password,
            created_by_id=old_user.created_by_id,
        )

def reverse_move_custom_users(apps, schema_editor):
    CustomUserNew = apps.get_model('thegate', 'CustomUser')
    CustomUserNew.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('thegate', '0001_initial'),
        ('core', '0006_property_commission_percent'),
    ]

    operations = [
        migrations.RunPython(move_custom_users, reverse_move_custom_users),
    ]
```

### Step 4: After data migration, drop old tables

Create a final migration in `core` to drop the moved models:

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0006_property_commission_percent'),
        ('thegate', '0002_move_auth_models'),
        ('properties', '0002_move_property_models'),
        ('units', '0002_move_unit_models'),
        ('tenants', '0002_move_tenant_models'),
    ]

    operations = [
        migrations.DeleteModel('CustomUser'),
        migrations.DeleteModel('SecurityQuestion'),
        migrations.DeleteModel('RecoveryCode'),
        migrations.DeleteModel('Property'),
        migrations.DeleteModel('Unit'),
        migrations.DeleteModel('Landlord'),
        migrations.DeleteModel('LandlordProperty'),
        migrations.DeleteModel('Commission'),
        migrations.DeleteModel('LandlordPayout'),
        migrations.DeleteModel('PenaltyRule'),
        migrations.DeleteModel('Tenant'),
        migrations.DeleteModel('TenantUnit'),
        migrations.DeleteModel('Lease'),
        migrations.DeleteModel('Invoice'),
        migrations.DeleteModel('Payment'),
        migrations.DeleteModel('Deposit'),
        migrations.DeleteModel('Reminder'),
        migrations.DeleteModel('MessageTemplate'),
        migrations.DeleteModel('MessageLog'),
        migrations.DeleteModel('MaintenanceRequest'),
        migrations.DeleteModel('MaintenanceAssignment'),
        migrations.DeleteModel('Expense'),
    ]
```

### Step 5: Apply migrations

```bash
python manage.py migrate
```

## URL Changes

The API endpoints have changed. Update your frontend to use the new URL patterns:

**Old URLs:**
- `/api/properties/` → `/api/properties/properties/`
- `/api/units/` → `/api/units/units/`
- `/api/tenants/` → `/api/tenants/tenants/`
- `/api/landlords/` → `/api/properties/landlords/`
- `/api/leases/` → `/api/tenants/leases/`
- `/api/invoices/` → `/api/tenants/invoices/`
- `/api/payments/` → `/api/tenants/payments/`

**New URL Structure:**
- `/api/properties/properties/` - Property endpoints
- `/api/properties/landlords/` - Landlord endpoints
- `/api/properties/commissions/` - Commission endpoints
- `/api/units/units/` - Unit endpoints
- `/api/units/expenses/` - Expense endpoints
- `/api/units/maintenance-requests/` - Maintenance endpoints
- `/api/tenants/tenants/` - Tenant endpoints
- `/api/tenants/leases/` - Lease endpoints
- `/api/tenants/invoices/` - Invoice endpoints
- `/api/tenants/payments/` - Payment endpoints
- `/api/financials/` - Financials endpoints (unchanged)
- `/api/dashboard/` - Dashboard endpoints (unchanged)

## Verification Steps

After migration, run these checks:

```bash
# Check for any issues
python manage.py check

# Verify no pending migrations
python manage.py makemigrations --check --dry-run

# Run tests
python manage.py test

# Test key endpoints manually
# - Login (should still work with existing users)
# - Dashboard summary
# - Tenant payment
```

## Rollback Plan

If anything goes wrong:

```bash
# Restore from backup
cp db.sqlite3.backup db.sqlite3

# Or revert migrations
python manage.py migrate core 0006_property_commission_percent
python manage.py migrate thegate zero
python manage.py migrate properties zero
python manage.py migrate units zero
python manage.py migrate tenants zero
```

## Notes

- The `financials` app already existed and only had FK references updated
- All models use string-based FK references to avoid circular imports
- App labels are set explicitly in each `apps.py` to maintain short, consistent labels
- The `core` app now only contains shared models (AuditLog, SystemSettings)
