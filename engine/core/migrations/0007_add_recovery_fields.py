# Generated migration for password recovery upgrade

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_property_commission_percent'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='recovery_email',
            field=models.EmailField(blank=True, help_text='Email used for password recovery', max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='security_question',
            field=models.CharField(blank=True, help_text='Recovery security question', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='security_answer_hash',
            field=models.CharField(blank=True, help_text='Hashed recovery security answer', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='recovery_code_hash',
            field=models.CharField(blank=True, help_text='Hashed recovery code', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='recovery_code_used',
            field=models.BooleanField(default=False, help_text='Whether recovery code has been used'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='recovery_code_expires_at',
            field=models.DateTimeField(blank=True, help_text='When recovery code expires', null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='recovery_attempts',
            field=models.IntegerField(default=0, help_text='Failed recovery attempts counter'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='recovery_locked_until',
            field=models.DateTimeField(blank=True, help_text='When account recovery unlock happens', null=True),
        ),
    ]
