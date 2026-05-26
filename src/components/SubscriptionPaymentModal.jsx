import React, { useEffect, useState } from 'react'

const INITIAL_FORM = {
  cardholder_name: '',
  card_number: '',
  expiry: '',
  cvc: '',
}

export default function SubscriptionPaymentModal({
  checkout,
  submitting,
  error,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    setForm(INITIAL_FORM)
  }, [checkout?.checkout_token])

  function handleChange(event) {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={event => event.stopPropagation()}>
        <div className="payment-modal-head">
          <div>
            <span className="brand-kicker">Checkout</span>
            <h3>Оплата тарифа {checkout?.target_plan?.name}</h3>
          </div>
          <button className="auth-close glass-shimmer" type="button" onClick={onClose}>×</button>
        </div>

        <div className="payment-summary-card">
          <div>
            <strong>{checkout?.target_plan?.name}</strong>
            <p>{checkout?.target_plan?.description}</p>
          </div>
          <span className="payment-summary-price">{checkout?.price_display}</span>
        </div>

        <form className="payment-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Имя владельца</span>
            <div className="auth-field-control">
              <input
                name="cardholder_name"
                value={form.cardholder_name}
                onChange={handleChange}
                placeholder="IVAN PETROV"
                autoComplete="cc-name"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Номер карты</span>
            <div className="auth-field-control">
              <input
                name="card_number"
                value={form.card_number}
                onChange={handleChange}
                placeholder="4242 4242 4242 4242"
                autoComplete="cc-number"
                required
              />
            </div>
          </label>

          <div className="payment-form-grid">
            <label className="auth-field">
              <span>Срок</span>
              <div className="auth-field-control">
                <input
                  name="expiry"
                  value={form.expiry}
                  onChange={handleChange}
                  placeholder="12/30"
                  autoComplete="cc-exp"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>CVC</span>
              <div className="auth-field-control">
                <input
                  name="cvc"
                  value={form.cvc}
                  onChange={handleChange}
                  placeholder="123"
                  autoComplete="cc-csc"
                  required
                />
              </div>
            </label>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="payment-modal-actions">
            <button type="button" className="btn-ghost glass-shimmer" onClick={onClose}>
              Назад
            </button>
            <button type="submit" className="auth-submit glass-shimmer" disabled={submitting}>
              {submitting ? 'Проводим оплату…' : `Оплатить ${checkout?.price_display || ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
