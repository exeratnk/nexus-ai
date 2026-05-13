from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, Chat, ProjectFolder


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Пароли не совпадают.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'bio', 'avatar', 'date_joined', 'updated')
        read_only_fields = ('id', 'date_joined', 'updated')


class ProjectFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectFolder
        fields = ('id', 'name', 'created', 'updated')
        read_only_fields = ('id', 'created', 'updated')


class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ('id', 'name', 'folder', 'messages', 'model', 'deep_mode', 'created', 'updated')
        read_only_fields = ('id', 'created', 'updated')

    def validate_messages(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('messages должно быть массивом.')
        return value

    def validate_folder(self, value):
        request = self.context.get('request')
        if value and request and value.user_id != request.user.id:
            raise serializers.ValidationError('Нельзя использовать чужую папку.')
        return value
