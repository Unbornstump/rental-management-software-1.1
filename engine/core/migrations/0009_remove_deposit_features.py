from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_unit_type_expansion'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='lease',
            name='deposit_amount',
        ),
        migrations.DeleteModel(
            name='Deposit',
        ),
    ]
