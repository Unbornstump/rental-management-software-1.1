from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_add_recovery_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='unit',
            name='unit_type_custom',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AlterField(
            model_name='unit',
            name='unit_type',
            field=models.CharField(
                choices=[
                    ('single_room', 'Single Room'),
                    ('studio', 'Studio'),
                    ('bedsitter', 'Bedsitter'),
                    ('1br', '1BR'),
                    ('2br', '2BR'),
                    ('3br', '3BR'),
                    ('shop', 'Shop'),
                    ('office', 'Office'),
                    ('other', 'Other'),
                ],
                default='bedsitter',
                max_length=32,
            ),
        ),
    ]
