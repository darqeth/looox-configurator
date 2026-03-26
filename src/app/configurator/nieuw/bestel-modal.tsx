'use client'

import { useState } from 'react'
import { useDiscountCode } from '@/hooks/useDiscountCode'
import type { ShapeSlug } from '@/lib/configurator-config'

interface BestelModalProps {
  shape: ShapeSlug
  unitPrice: number
  projectName: string
  saving: boolean
  disabled?: boolean
  onOrder: (params: {
    quantity: number
    discount: { id: string; type: 'pct' | 'fixed'; value: number; useType: 'single' | 'per_user' } | null
  }) => void
}

export default function BestelModal({ shape, unitPrice, projectName, saving, disabled, onOrder }: BestelModalProps) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [checked, setChecked] = useState(false)

  const isAanvraag = shape === 'op-aanvraag'
  const subtotal = unitPrice * quantity
  const { input: discountInput, setInput: setDiscountInput, validating: discountValidating, error: discountError, setError: setDiscountError, applied: appliedDiscount, setApplied: setAppliedDiscount, discountAmount, validate: handleValidate, reset: resetDiscount } = useDiscountCode(subtotal)
  const finalTotal = subtotal - discountAmount

  function handleClose() {
    if (saving) return
    setOpen(false)
    setQuantity(1)
    setChecked(false)
    resetDiscount()
  }

  function handleConfirm() {
    if (!checked || saving) return
    onOrder({
      quantity,
      discount: appliedDiscount
        ? { id: appliedDiscount.id, type: appliedDiscount.type, value: appliedDiscount.value, useType: appliedDiscount.useType }
        : null,
    })
  }

  return (
    <>
      {/* Trigger knop */}
      <button
        onClick={() => setOpen(true)}
        disabled={disabled || saving}
        className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving
          ? (isAanvraag ? 'Aanvraag indienen…' : 'Bestelling plaatsen…')
          : (isAanvraag ? 'Offerte aanvragen →' : 'Bestellen →')}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-lx-divider">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold text-lx-text-primary leading-snug">
                    {isAanvraag ? 'Offerte aanvragen' : 'Bestelling bevestigen'}
                  </h2>
                  <p className="text-[12px] text-lx-text-secondary mt-0.5">{projectName}</p>
                </div>
                <button onClick={handleClose} className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Prijs samenvatting */}
              <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-lx-text-secondary">Eenheidsprijs</span>
                  <span className="text-[14px] font-bold text-lx-cta">
                    €{unitPrice.toLocaleString('nl-NL')} <span className="text-[11px] font-normal text-lx-text-secondary">excl. btw</span>
                  </span>
                </div>
                {appliedDiscount && (
                  <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
                    <span className="text-[12px] text-green-600">
                      Korting ({appliedDiscount.type === 'pct' ? `${appliedDiscount.value}%` : `€${appliedDiscount.value} eenmalig`})
                    </span>
                    <span className="text-[12px] font-semibold text-green-600">
                      −€{discountAmount.toLocaleString('nl-NL')}
                    </span>
                  </div>
                )}
                {(appliedDiscount || quantity > 1) && (
                  <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
                    <span className="text-[12.5px] text-lx-text-secondary font-medium">Totaal {quantity}×</span>
                    <span className="text-[15px] font-bold text-lx-text-primary">€{finalTotal.toLocaleString('nl-NL')}</span>
                  </div>
                )}
              </div>

              {/* Aantal */}
              <div>
                <label className="text-[12px] font-semibold text-lx-text-secondary mb-2 block">Aantal</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 hover:bg-lx-border transition-colors flex items-center justify-center text-lg font-light"
                    tabIndex={-1}
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-9 rounded-xl border border-black/12 text-center text-[14px] font-semibold text-lx-text-primary outline-none focus:border-lx-cta bg-white"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 hover:bg-lx-border transition-colors flex items-center justify-center text-lg font-light"
                    tabIndex={-1}
                  >+</button>
                </div>
              </div>

              {/* Kortingscode — niet bij op-aanvraag */}
              {!isAanvraag && (
                <div>
                  <label className="text-[12px] font-semibold text-lx-text-secondary mb-2 block">
                    Kortingscode <span className="font-normal">(optioneel)</span>
                  </label>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200">
                      <span className="text-[12.5px] text-green-700 font-semibold font-mono">{appliedDiscount.code}</span>
                      <button
                        onClick={() => { setAppliedDiscount(null); setDiscountInput('') }}
                        className="text-[11px] text-lx-text-secondary hover:text-red-400 transition-colors"
                      >
                        Verwijderen
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountInput}
                          onChange={(e) => { setDiscountInput(e.target.value); setDiscountError('') }}
                          onKeyDown={(e) => e.key === 'Enter' && discountInput.trim() && handleValidate()}
                          placeholder="Bijv. LX-ABCD-1234"
                          className="flex-1 h-9 rounded-xl border border-black/12 px-3.5 text-[13px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
                        />
                        <button
                          onClick={handleValidate}
                          disabled={!discountInput.trim() || discountValidating}
                          className="px-3.5 h-9 rounded-xl bg-lx-panel-bg border border-black/12 text-[12.5px] font-semibold text-lx-text-secondary hover:text-lx-text-primary disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          {discountValidating ? '…' : 'Valideer'}
                        </button>
                      </div>
                      {discountError && (
                        <p className="text-[11px] text-red-500 mt-1">{discountError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Controleer checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checked ? 'bg-lx-cta border-lx-cta' : 'bg-white border-black/20'
                  }`}>
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[12.5px] text-lx-text-secondary leading-relaxed">
                  Ik heb de configuratie gecontroleerd en wil deze {isAanvraag ? 'aanvragen' : 'bestellen'}
                </span>
              </label>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 h-11 rounded-xl border border-black/10 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors disabled:opacity-40"
              >
                Annuleren
              </button>
              <button
                onClick={handleConfirm}
                disabled={!checked || saving}
                className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving
                  ? (isAanvraag ? 'Aanvraag indienen…' : 'Bestelling plaatsen…')
                  : (isAanvraag ? 'Offerte aanvragen →' : 'Bestellen →')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
