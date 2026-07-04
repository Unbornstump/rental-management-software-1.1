# Generated migration

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        # Add fields to CustomUser
        migrations.RemoveField(
            model_name='customuser',
            name='role',
        ),
        migrations.AddField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('manager', 'Manager'),
                    ('accountant', 'Accountant'),
                    ('property_officer', 'Property Officer'),
                    ('caretaker', 'Caretaker'),
                ],
                default='manager',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='must_change_password',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_staff',
                to='core.customuser',
            ),
        ),
        # Create AuditLog model
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=255)),
                ('target_model', models.CharField(max_length=64)),
                ('target_id', models.IntegerField(blank=True, null=True)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_logs',
                    to='core.customuser',
                )),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        # Create SystemSettings model
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company_name', models.CharField(default='Rental Management System', max_length=255)),
                ('company_logo', models.FileField(blank=True, null=True, upload_to='logos/')),
                ('contact_phone', models.CharField(blank=True, max_length=50)),
                ('address', models.TextField(blank=True)),
                ('rent_due_day', models.IntegerField(default=1)),
                ('currency', models.CharField(default='KES', max_length=10)),
                ('grace_period_days', models.IntegerField(default=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name_plural': 'System Settings',
            },
        ),
        # Add indexes to AuditLog
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', '-timestamp'], name='core_auditl_user_id_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action', '-timestamp'], name='core_auditl_action_timestamp_idx'),
        ),
    ]
