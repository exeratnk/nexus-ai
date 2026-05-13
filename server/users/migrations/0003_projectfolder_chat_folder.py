# Generated manually for project folders
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_chat'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectFolder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_folders', to='users.user')),
            ],
            options={
                'ordering': ('created',),
                'unique_together': {('user', 'name')},
            },
        ),
        migrations.AddField(
            model_name='chat',
            name='folder',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='chats', to='users.projectfolder'),
        ),
    ]
