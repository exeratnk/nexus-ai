from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Расширенная модель пользователя."""

    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class ProjectFolder(models.Model):
    """Папка, в которую пользователь может группировать проекты."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_folders')
    name = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('created',)
        unique_together = ('user', 'name')

    def __str__(self):
        return f'{self.user.username}: {self.name}'


class Chat(models.Model):
    """Диалог пользователя."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chats')
    folder = models.ForeignKey(
        ProjectFolder,
        on_delete=models.SET_NULL,
        related_name='chats',
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    messages = models.JSONField(default=list, blank=True)
    model = models.CharField(max_length=64, default='gpt-4o')
    deep_mode = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('created',)

    def __str__(self):
        return f'{self.user.username}: {self.name}'
