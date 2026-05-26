from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_subscriptioncheckoutsession'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chat',
            name='folder',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='chats',
                to='users.projectfolder',
            ),
        ),
    ]
