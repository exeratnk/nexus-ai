from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, Chat, ProjectFolder, Subscription
from .subscriptions import (
    can_use_deep_mode,
    ensure_subscription,
    get_allowed_models,
    get_daily_limit,
    get_effective_plan,
    get_remaining_messages,
)


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
    subscription = serializers.SerializerMethodField()
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(write_only=True, required=False, allow_blank=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'avatar',
            'date_joined',
            'updated',
            'subscription',
            'current_password',
            'new_password',
            'new_password2',
        )
        read_only_fields = ('id', 'date_joined', 'updated')

    def validate(self, attrs):
        current_password = attrs.get('current_password', '')
        new_password = attrs.get('new_password', '')
        new_password2 = attrs.get('new_password2', '')

        password_fields_filled = any([current_password, new_password, new_password2])
        if not password_fields_filled:
            return attrs

        if not current_password:
            raise serializers.ValidationError({'current_password': 'Введите текущий пароль.'})
        if not new_password:
            raise serializers.ValidationError({'new_password': 'Введите новый пароль.'})
        if not new_password2:
            raise serializers.ValidationError({'new_password2': 'Подтвердите новый пароль.'})
        if new_password != new_password2:
            raise serializers.ValidationError({'new_password': 'Новые пароли не совпадают.'})
        if not self.instance or not self.instance.check_password(current_password):
            raise serializers.ValidationError({'current_password': 'Текущий пароль введён неверно.'})
        if current_password == new_password:
            raise serializers.ValidationError({'new_password': 'Новый пароль должен отличаться от текущего.'})

        validate_password(new_password, self.instance)
        return attrs

    def update(self, instance, validated_data):
        current_password = validated_data.pop('current_password', '')
        new_password = validated_data.pop('new_password', '')
        validated_data.pop('new_password2', '')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if current_password and new_password:
            instance.set_password(new_password)

        instance.save()
        return instance

    def get_subscription(self, obj):
        subscription = ensure_subscription(obj)
        daily_message_limit = get_daily_limit(subscription)
        remaining, used = get_remaining_messages(subscription, obj)

        return {
            'plan': subscription.plan,
            'effective_plan': get_effective_plan(subscription),
            'subscription_status': subscription.subscription_status,
            'current_period_end': subscription.current_period_end,
            'is_pro': subscription.is_pro,
            'daily_message_limit': daily_message_limit,
            'daily_messages_used': used,
            'daily_messages_remaining': remaining,
            'allowed_models': get_allowed_models(subscription),
            'can_use_deep_mode': can_use_deep_mode(subscription),
        }


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


class SubscriptionPlanChangeSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=Subscription.Plan.choices)


class SubscriptionCheckoutCreateSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=Subscription.Plan.choices)
    success_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    cancel_url = serializers.CharField(required=False, allow_blank=True, max_length=500)


class SubscriptionCheckoutPaymentSerializer(serializers.Serializer):
    cardholder_name = serializers.CharField(max_length=120)
    card_number = serializers.CharField(max_length=24)
    expiry = serializers.CharField(max_length=7)
    cvc = serializers.CharField(max_length=4)
