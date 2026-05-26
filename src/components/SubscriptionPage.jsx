import React, { useEffect, useState } from 'react'
import {
  changeSubscriptionPlan,
  createSubscriptionCheckout,
  getSubscriptionPlans,
  paySubscriptionCheckout,
} from '../api.js'
import { BoltIcon, CrownIcon, ShieldIcon } from './GlassIcons.jsx'
import SubscriptionPaymentModal from './SubscriptionPaymentModal.jsx'

export default function SubscriptionPage({
  user,
  accessToken,
  onRequireAuth,
  onRefreshSubscription,
}) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [actionPlan, setActionPlan] = useState('')
  const [checkout, setCheckout] = useState(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const currentPlan = user?.subscription?.effective_plan || (user?.subscription?.is_pro ? 'pro' : 'free')
  const hasActivePro = Boolean(user?.subscription?.is_pro)

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      setLoading(true)
      try {
        const response = await getSubscriptionPlans(accessToken)
        if (!cancelled) {
          setPlans(response?.plans || [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Не удалось загрузить тарифы')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPlans()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  async function handleSelectPlan(planId) {
    setError('')
    setSuccessMessage('')

    if (planId === 'free') {
      if (hasActivePro) return
      if (currentPlan === 'free') return
      setActionPlan(planId)
      try {
        await changeSubscriptionPlan(accessToken, 'free')
        await onRefreshSubscription?.()
        setSuccessMessage('Тариф Free активирован.')
      } catch (changeError) {
        setError(changeError.message || 'Не удалось переключить тариф')
      } finally {
        setActionPlan('')
      }
      return
    }

    if (!user) {
      onRequireAuth?.()
      return
    }

    setActionPlan(planId)
    try {
      const response = await createSubscriptionCheckout(accessToken, {
        plan: planId,
        success_url: `${window.location.origin}/subscription`,
        cancel_url: `${window.location.origin}/subscription`,
      })
      setCheckout(response.checkout)
    } catch (checkoutError) {
      setError(checkoutError.message || 'Не удалось открыть оплату')
    } finally {
      setActionPlan('')
    }
  }

  async function handlePaymentSubmit(paymentData) {
    if (!checkout?.checkout_token) return

    setError('')
    setPaymentSubmitting(true)
    try {
      await paySubscriptionCheckout(accessToken, checkout.checkout_token, paymentData)
      await onRefreshSubscription?.()
      setCheckout(null)
      setSuccessMessage('Оплата прошла успешно. Тариф Pro активирован.')
    } catch (paymentError) {
      setError(paymentError.message || 'Не удалось завершить оплату')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  return (
    <>
      <section className="subscription-page">
        <div className="subscription-page-hero">
          <div className="subscription-page-copy">
            <span className="brand-kicker">Billing</span>
            <h1>Выберите тариф для рабочего пространства</h1>
            <p>
              Free остаётся тарифом по умолчанию. Переход на Pro запускает checkout без
              перезагрузки и обновляет статус после подтверждения оплаты.
            </p>
          </div>
        </div>

        {(error || successMessage) && (
          <div className={`subscription-feedback ${error ? 'is-error' : 'is-success'}`}>
            {error || successMessage}
          </div>
        )}

        <div className="subscription-cards">
          {plans.map(plan => {
            const isCurrent = currentPlan === plan.id
            const isPro = plan.id === 'pro'
            const canSelectFree = plan.id !== 'free' || !hasActivePro
            const buttonLabel = isCurrent
              ? 'Выбрано'
              : plan.id === 'free'
                ? 'Перейти на Free'
                : 'Выбрать Pro'

            return (
              <article
                key={plan.id}
                className={`subscription-tier-card ${isCurrent ? 'is-current' : ''} ${isPro ? 'is-pro' : ''}`}
              >
                <div className="subscription-tier-head">
                  <span className={`plan-pill ${isPro ? 'plan-pill-pro' : 'plan-pill-free'}`}>
                    {isPro ? <CrownIcon size={13} /> : <ShieldIcon size={13} />}
                    {plan.name}
                  </span>
                  {isCurrent && <span className="subscription-current-marker">Текущий</span>}
                </div>

                <div className="subscription-tier-price">{plan.price_display}</div>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>

                <ul className="subscription-feature-list">
                  {plan.features.map(feature => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                {canSelectFree ? (
                  <button
                    type="button"
                    className={`glass-shimmer ${isPro ? 'auth-submit' : 'btn-ghost'} subscription-tier-action`}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent || actionPlan === plan.id || (isPro && currentPlan === 'pro')}
                  >
                    {actionPlan === plan.id ? (
                      'Обрабатываем…'
                    ) : (
                      <>
                        {isPro && <BoltIcon size={15} />}
                        <span>{buttonLabel}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="subscription-tier-action subscription-tier-action-note">
                    Free недоступен при активном Pro
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {loading && <div className="subscription-page-loading">Загружаем тарифы…</div>}
      </section>

      {checkout && (
        <SubscriptionPaymentModal
          checkout={checkout}
          submitting={paymentSubmitting}
          error={error}
          onClose={() => {
            if (paymentSubmitting) return
            setCheckout(null)
            setError('')
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </>
  )
}
