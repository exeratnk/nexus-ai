from datetime import timedelta

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from .models import DailyMessageUsage, Subscription, SubscriptionCheckoutSession


FREE_MODEL_NAMES = {'nexus-mini', 'nexus-3.7 code', 'gpt-4o-mini', 'gpt-3.5-turbo'}
PRO_MODEL_NAMES = {'nexus-3.8', 'gpt-4o'}
DEMO_PROVIDER_NAME = SubscriptionCheckoutSession.Provider.DEMO
CHECKOUT_WEBHOOK_COMPLETED = 'checkout.session.completed'
CHECKOUT_TTL_MINUTES = 30

PLAN_CATALOG = {
    Subscription.Plan.FREE: {
        'id': Subscription.Plan.FREE,
        'name': 'Free',
        'description': 'Базовый чат для повседневных задач и быстрых диалогов.',
        'price_amount': 0,
        'currency': 'RUB',
        'price_display': '0 ₽',
        'billing_period': 'forever',
        'cta_label': 'Текущий тариф',
        'features': [
            'Базовые модели Nexus',
            'Лимит сообщений в день',
            'Без оплаты по умолчанию',
        ],
    },
    Subscription.Plan.PRO: {
        'id': Subscription.Plan.PRO,
        'name': 'Pro',
        'description': 'Расширенный доступ без дневного лимита и с Pro-возможностями.',
        'price_amount': 990,
        'currency': 'RUB',
        'price_display': '990 ₽ / мес',
        'billing_period': 'month',
        'cta_label': 'Выбрать Pro',
        'features': [
            'Безлимитные сообщения',
            'Модель Nexus 3.8',
            'Глубокий режим',
        ],
    },
}


def get_free_daily_message_limit():
    return int(getattr(settings, 'FREE_DAILY_MESSAGE_LIMIT', 12))


def get_plan_config(plan):
    try:
        return PLAN_CATALOG[plan]
    except KeyError as exc:
        raise ValueError('Неизвестный тариф.') from exc


def get_subscription_catalog():
    return [PLAN_CATALOG[Subscription.Plan.FREE], PLAN_CATALOG[Subscription.Plan.PRO]]


def normalize_subscription_state(subscription, *, persist=True):
    """Оставлен для обратной совместимости с существующими вызовами."""
    return subscription


def get_effective_plan(subscription):
    return Subscription.Plan.PRO if subscription.is_pro else Subscription.Plan.FREE


def get_allowed_models(subscription):
    if subscription.is_pro:
        return sorted(FREE_MODEL_NAMES | PRO_MODEL_NAMES)
    return sorted(FREE_MODEL_NAMES)


def ensure_subscription(user):
    subscription, _ = Subscription.objects.get_or_create(
        user=user,
        defaults={
            'plan': Subscription.Plan.FREE,
            'subscription_status': Subscription.Status.ACTIVE,
        },
    )
    return normalize_subscription_state(subscription)


def get_daily_limit(subscription):
    if subscription.is_pro:
        return None
    return get_free_daily_message_limit()


def get_today_usage(user):
    usage, _ = DailyMessageUsage.objects.get_or_create(
        user=user,
        date=timezone.localdate(),
        defaults={'messages_count': 0},
    )
    return usage


def get_today_usage_count(user):
    usage = DailyMessageUsage.objects.filter(user=user, date=timezone.localdate()).only('messages_count').first()
    return usage.messages_count if usage is not None else 0


def increment_daily_usage(user):
    usage = get_today_usage(user)
    DailyMessageUsage.objects.filter(pk=usage.pk).update(messages_count=F('messages_count') + 1)
    usage.refresh_from_db(fields=('messages_count',))
    return usage


def get_remaining_messages(subscription, user):
    limit = get_daily_limit(subscription)
    used = get_today_usage_count(user)
    if limit is None:
        return None, used
    return max(limit - used, 0), used


def model_requires_pro(model_name):
    return (model_name or '').strip() in PRO_MODEL_NAMES


def can_use_deep_mode(subscription):
    return subscription.is_pro


def serialize_checkout_session(session):
    plan = get_plan_config(session.target_plan)
    return {
        'checkout_token': str(session.checkout_token),
        'provider': session.provider,
        'status': session.status,
        'amount': session.amount,
        'currency': session.currency,
        'price_display': plan['price_display'],
        'target_plan': plan,
        'success_url': session.success_url,
        'cancel_url': session.cancel_url,
        'expires_at': session.expires_at,
        'provider_session_id': session.provider_session_id,
        'provider_payment_id': session.provider_payment_id,
        'payment_method_summary': session.metadata.get('payment_method_summary', ''),
    }


def create_checkout_session(user, plan, success_url='', cancel_url=''):
    subscription = ensure_subscription(user)
    if subscription.is_pro and plan == Subscription.Plan.PRO:
        raise ValueError('Тариф Pro уже активен.')
    if plan != Subscription.Plan.PRO:
        raise ValueError('Checkout нужен только для перехода на тариф Pro.')

    config = get_plan_config(plan)
    now = timezone.now()
    if not subscription.provider_customer_id:
        subscription.provider_customer_id = f'demo-customer-{user.id}'
        subscription.save(update_fields=('provider_customer_id', 'updated_at'))

    return SubscriptionCheckoutSession.objects.create(
        user=user,
        target_plan=plan,
        provider=DEMO_PROVIDER_NAME,
        status=SubscriptionCheckoutSession.Status.OPEN,
        amount=config['price_amount'],
        currency=config['currency'],
        provider_session_id=f'demo-checkout-{user.id}-{int(now.timestamp())}',
        success_url=success_url,
        cancel_url=cancel_url,
        expires_at=now + timedelta(minutes=CHECKOUT_TTL_MINUTES),
        metadata={'plan_snapshot': config},
    )


def activate_pro_subscription(
    user,
    *,
    provider_customer_id=None,
    provider_subscription_id=None,
    period_days=30,
):
    subscription = ensure_subscription(user)
    now = timezone.now()
    subscription.plan = Subscription.Plan.PRO
    subscription.subscription_status = Subscription.Status.ACTIVE
    subscription.current_period_end = now + timedelta(days=period_days)
    if provider_customer_id:
        subscription.provider_customer_id = provider_customer_id
    elif not subscription.provider_customer_id:
        subscription.provider_customer_id = f'demo-customer-{user.id}'
    subscription.provider_subscription_id = (
        provider_subscription_id
        or f'demo-subscription-{user.id}-{int(now.timestamp())}'
    )
    subscription.save(
        update_fields=(
            'plan',
            'subscription_status',
            'current_period_end',
            'provider_customer_id',
            'provider_subscription_id',
            'updated_at',
        )
    )
    return subscription


def _mark_checkout_expired(session):
    session.status = SubscriptionCheckoutSession.Status.EXPIRED
    session.save(update_fields=('status', 'updated_at'))
    return session


def _set_checkout_processing(session, payment_method_summary=''):
    if session.status == SubscriptionCheckoutSession.Status.OPEN:
        session.status = SubscriptionCheckoutSession.Status.PROCESSING
    if not session.provider_payment_id:
        session.provider_payment_id = (
            f'demo-payment-{session.user_id}-{int(timezone.now().timestamp())}'
        )
    if payment_method_summary:
        metadata = dict(session.metadata)
        metadata['payment_method_summary'] = payment_method_summary
        session.metadata = metadata
    session.save(
        update_fields=('status', 'provider_payment_id', 'metadata', 'updated_at')
    )
    return session


def process_checkout_webhook(event):
    event_type = (event or {}).get('type')
    payload = (event or {}).get('data') or {}
    checkout_token = payload.get('checkout_token')

    if not checkout_token:
        raise ValueError('В webhook не передан checkout_token.')

    session = SubscriptionCheckoutSession.objects.select_related('user').get(
        checkout_token=checkout_token
    )

    if event_type != CHECKOUT_WEBHOOK_COMPLETED:
        raise ValueError('Неподдерживаемый тип webhook-события.')

    if session.status == SubscriptionCheckoutSession.Status.PAID:
        return session

    if session.expires_at and session.expires_at <= timezone.now():
        return _mark_checkout_expired(session)

    metadata = dict(session.metadata)
    if payload.get('payment_method_summary'):
        metadata['payment_method_summary'] = payload['payment_method_summary']
    metadata['webhook_confirmed_at'] = timezone.now().isoformat()

    session.status = SubscriptionCheckoutSession.Status.PAID
    session.provider_payment_id = (
        payload.get('provider_payment_id')
        or session.provider_payment_id
        or f'demo-payment-{session.user_id}-{int(timezone.now().timestamp())}'
    )
    session.metadata = metadata
    session.save(
        update_fields=('status', 'provider_payment_id', 'metadata', 'updated_at')
    )

    activate_pro_subscription(
        session.user,
        provider_customer_id=payload.get('provider_customer_id') or None,
        provider_subscription_id=payload.get('provider_subscription_id') or session.provider_session_id,
    )
    return session


def simulate_checkout_payment(session, payment_data):
    subscription = ensure_subscription(session.user)

    if subscription.is_pro:
        raise ValueError('Тариф Pro уже активен.')
    if session.target_plan != Subscription.Plan.PRO:
        raise ValueError('Оплата доступна только для тарифа Pro.')
    if session.status == SubscriptionCheckoutSession.Status.PAID:
        return session
    if session.is_terminal:
        raise ValueError('Checkout уже закрыт.')
    if session.expires_at and session.expires_at <= timezone.now():
        _mark_checkout_expired(session)
        raise ValueError('Сессия оплаты истекла. Создайте новую.')

    digits = ''.join(ch for ch in payment_data.get('card_number', '') if ch.isdigit())
    last4 = digits[-4:] if digits else '4242'
    payment_method_summary = f'Карта ·•••• {last4}'
    _set_checkout_processing(session, payment_method_summary)

    return process_checkout_webhook({
        'type': CHECKOUT_WEBHOOK_COMPLETED,
        'data': {
            'checkout_token': str(session.checkout_token),
            'provider_customer_id': subscription.provider_customer_id,
            'provider_subscription_id': (
                f'demo-subscription-{session.user_id}-{int(timezone.now().timestamp())}'
            ),
            'provider_payment_id': session.provider_payment_id,
            'payment_method_summary': payment_method_summary,
        },
    })


def cancel_pro_subscription(user):
    subscription = ensure_subscription(user)
    subscription.plan = Subscription.Plan.FREE
    subscription.subscription_status = Subscription.Status.CANCELED
    subscription.current_period_end = None
    subscription.provider_subscription_id = ''
    subscription.save(
        update_fields=(
            'plan',
            'subscription_status',
            'current_period_end',
            'provider_subscription_id',
            'updated_at',
        )
    )
    return subscription
