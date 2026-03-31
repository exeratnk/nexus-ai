from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, Chat


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


class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ('id', 'name', 'messages', 'model', 'deep_mode', 'created', 'updated')
        read_only_fields = ('id', 'created', 'updated')

    def validate_messages(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('messages должно быть массивом.')
        return value
