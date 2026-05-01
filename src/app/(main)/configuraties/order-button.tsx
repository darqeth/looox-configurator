'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrderFromConfig } from '@/lib/actions/orders'
import { useDiscountCode } from '@/hooks/useDiscountCode'
import { MirrorPreview, type ConfigPreview } from '@/app/configurator/nieuw/price-panel'
import { SHAPES, ORGANIC_SIZES, GLAS_KLEUREN, EXTRA_OPTIONS, POSITION_LABELS, LIGHT_TYPE_LABELS, type GlasKleur } from '@/lib/configurator-config'
import { getMaatwerkStaffelKorting, getMaatwerkStaffelTip, type MaatwerkStaffelTip } from '@/lib/maatwerk-staffel'

interface OrderButtonProps {
  configId: string
  configName: string
  metaSummary: string
  price: number
  korting: number
  isProjectspiegel?: boolean
  projectspiegelStuks?: number
  configPreview?: ConfigPreview
  canSeePurchasePrices?: boolean
}

function lightSummary(light: { position: string; type: string | null } | undefined): string {
  if (!light || !light.position || light.position === 'geen') return 'Geen'
  const pos = POSITION_LABELS[light.position] ?? light.position
  const type = light.type ? (LIGHT_TYPE_LABELS[light.type as keyof typeof LIGHT_TYPE_LABELS] ?? light.type) : null
  return type ? `${pos} · ${type}` : pos
}

function PreviewCard({ preview }: { preview: ConfigPreview }) {
  const [expanded, setExpanded] = useState(false)

  const shapeName = SHAPES.find(s => s.slug === preview.shape)?.name ?? preview.shape
  const glasKleurName = GLAS_KLEUREN.find(g => g.id === preview.glasKleur)?.name ?? null

  let dimensionLabel = ''
  if (preview.shape === 'rond' && preview.diameter) dimensionLabel = `⌀ ${preview.diameter} cm`
  else if (preview.shape === 'organic' && preview.organicSizeKey) {
    dimensionLabel = ORGANIC_SIZES.find(s => s.key === preview.organicSizeKey)?.label ?? ''
  } else if (preview.width && preview.height) dimensionLabel = `${preview.width} × ${preview.height} cm`

  const directPos = preview.directLight?.position
  const indirectPos = preview.indirectLight?.position
  const extraNames = preview.extras?.map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name ?? id) ?? []

  return (
    <div className="bg-lx-panel-bg rounded-xl overflow-hidden">
      {/* Klikbare header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[0.03] transition-colors"
      >
        <div className="flex-shrink-0 rounded-lg overflow-hidden bg-white/60 w-[72px] h-[72px] flex items-center justify-center">
          <MirrorPreview
            shape={preview.shape}
            width={preview.width ?? 80}
            height={preview.height ?? 60}
            diameter={preview.diameter ?? null}
            organicSizeKey={preview.organicSizeKey ?? null}
            directPosition={directPos && directPos !== 'geen' ? directPos : 'geen'}
            indirectPosition={indirectPos && indirectPos !== 'geen' ? indirectPos : 'geen'}
            glasKleur={(preview.glasKleur ?? 'helder') as GlasKleur}
            size={72}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-[13px] font-semibold text-lx-text-primary">{shapeName}</p>
          {dimensionLabel && <p className="text-[12px] text-lx-text-secondary">{dimensionLabel}{glasKleurName ? ` · ${glasKleurName}` : ''}</p>}
          <p className="text-[11.5px] text-lx-cta font-medium">{expanded ? 'Details verbergen' : 'Alle details bekijken'}</p>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-lx-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Uitklapbaar detail-paneel */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-black/6 space-y-2">
          <div className="pt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <span className="text-[11.5px] text-lx-text-secondary font-medium pt-px">Direct</span>
            <span className="text-[12px] text-lx-text-primary">{lightSummary(preview.directLight)}</span>
            <span className="text-[11.5px] text-lx-text-secondary font-medium pt-px">Indirect</span>
            <span className="text-[12px] text-lx-text-primary">{lightSummary(preview.indirectLight)}</span>
            {extraNames.length > 0 && (
              <>
                <span className="text-[11.5px] text-lx-text-secondary font-medium pt-px">Opties</span>
                <span className="text-[12px] text-lx-text-primary">{extraNames.join(', ')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderButton({ configId, configName, metaSummary, price, korting, isProjectspiegel, projectspiegelStuks, configPreview, canSeePurchasePrices = true }: OrderButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Projectspiegels: prijs is al netto staffelprijs × qty — geen dealer korting, geen extra qty-vermenigvuldiging
  const nettoNaDealer = isProjectspiegel ? price : Math.round(price * (1 - korting / 100))
  const staffelPct = isProjectspiegel ? 0 : getMaatwerkStaffelKorting(quantity)
  const staffelAmountPerStuk = isProjectspiegel ? 0 : Math.round(nettoNaDealer * staffelPct)
  const nettoUnitPrice = nettoNaDealer - staffelAmountPerStuk
  const effectiveQuantity = isProjectspiegel ? 1 : quantity
  const subtotal = nettoUnitPrice * effectiveQuantity
  const staffelTip: MaatwerkStaffelTip | null = isProjectspiegel
    ? null
    : getMaatwerkStaffelTip(nettoNaDealer, quantity)
  const { input: discountInput, setInput: setDiscountInput, validating: discountValidating, error: discountError, setError: setDiscountError, applied: appliedDiscount, setApplied: setAppliedDiscount, discountAmount, validate: handleValidate, reset: resetDiscount } = useDiscountCode(subtotal)
  const finalTotal = subtotal - discountAmount

  async function handleOrder() {
    if (!checked) return
    setLoading(true)
    setOrderError(null)
    try {
      const { orderNumber } = await placeOrderFromConfig(
        configId, effectiveQuantity, notes,
        appliedDiscount?.id ?? null,
        appliedDiscount?.type ?? null,
        appliedDiscount?.value ?? null,
        appliedDiscount?.useType ?? null,
      )
      setResult(orderNumber)
      router.refresh()
    } catch (e) {
      console.error(e)
      setOrderError(e instanceof Error ? e.message : 'Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setQuantity(1)
    setNotes('')
    setChecked(false)
    setLoading(false)
    setResult(null)
    setOrderError(null)
    resetDiscount()
  }

  return (
    <>
      {/* Trigger knop */}
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-lx-cta text-white text-[12.5px] font-semibold hover:bg-lx-cta-hover transition-colors whitespace-nowrap"
      >
        Bestellen →
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className={`relative bg-white rounded-2xl shadow-xl w-full overflow-hidden ${configPreview ? 'max-w-lg' : 'max-w-md'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {result ? (
              /* Bevestiging */
              <div className="p-7 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-lx-icon-bg flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" stroke="var(--lx-cta)" strokeWidth="2.5"
                      strokeDasharray="28" strokeDashoffset="0"
                      style={{ animation: 'drawCheck 0.4s ease-out 0.2s both' }}
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Bestelling geplaatst</p>
                  <p className="text-[20px] font-bold text-lx-text-primary font-mono tracking-wide">{result}</p>
                </div>
                <p className="text-[13px] text-lx-text-secondary">Je ontvangt binnen 1 werkdag een orderbevestiging.</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => router.push('/bestellingen')}
                    className="flex-1 h-10 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
                  >
                    Mijn bestellingen
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 h-10 rounded-xl border border-black/10 text-lx-text-secondary text-[13px] font-semibold hover:bg-lx-panel-bg transition-colors"
                  >
                    Sluiten
                  </button>
                </div>
                <style>{`@keyframes drawCheck { from { stroke-dashoffset: 28; } to { stroke-dashoffset: 0; } }`}</style>
              </div>
            ) : (
              /* Bestelformulier */
              <>
                <div className="px-6 pt-6 pb-4 border-b border-lx-divider">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-bold text-lx-text-primary leading-snug">{configName}</h2>
                      <p className="text-[12px] text-lx-text-secondary mt-0.5">{metaSummary}</p>
                    </div>
                    <button onClick={handleClose} className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Configuratie preview */}
                  {configPreview && <PreviewCard preview={configPreview} />}

                  {/* Prijs samenvatting */}
                  <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
                    {isProjectspiegel ? (
                      <>
                        {projectspiegelStuks && (
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] text-lx-text-secondary">{projectspiegelStuks} stuks (incl. staffelkorting)</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
                          <span className="text-[12.5px] text-lx-text-secondary font-medium">Netto totaal ex. BTW</span>
                          <span className="text-[14px] font-bold text-lx-cta">€{price.toLocaleString('nl-NL')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {canSeePurchasePrices && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[12.5px] text-lx-text-secondary">Bruto ex. BTW</span>
                              <span className="text-[13px] font-medium text-lx-text-primary">€{price.toLocaleString('nl-NL')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[12.5px] text-lx-text-secondary">Dealer korting ({korting}%)</span>
                              <span className="text-[13px] font-medium text-lx-text-secondary">−€{(price - nettoNaDealer).toLocaleString('nl-NL')}</span>
                            </div>
                            {staffelPct > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-[12.5px] text-lx-text-secondary">
                                  Staffelkorting ({(staffelPct * 100).toFixed(0)}%)
                                </span>
                                <span className="text-[12.5px] text-lx-text-secondary">
                                  -{staffelAmountPerStuk.toLocaleString('nl-NL')}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className={`flex items-center justify-between${canSeePurchasePrices ? ' pt-1 border-t border-lx-divider' : ''}`}>
                          <span className="text-[12.5px] text-lx-text-secondary font-medium">Netto ex. BTW</span>
                          <span className="text-[14px] font-bold text-lx-cta">€{nettoUnitPrice.toLocaleString('nl-NL')}</span>
                        </div>
                        {appliedDiscount && (
                          <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
                            <span className="text-[12px] text-green-600">
                              Kortingscode ({appliedDiscount.type === 'pct' ? `${appliedDiscount.value}%` : `€${appliedDiscount.value} eenmalig`})
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
                      </>
                    )}
                  </div>

                  {/* Aantal — verborgen voor projectspiegels (qty zit al in de prijs) */}
                  {!isProjectspiegel && (
                  <div>
                    <label className="text-[12px] font-semibold text-lx-text-secondary mb-2 block">Aantal</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
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
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 hover:bg-lx-border transition-colors flex items-center justify-center text-lg font-light"
                        tabIndex={-1}
                      >+</button>
                    </div>
                  </div>
                  )}

                  {/* Kortingscode */}
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

                  {/* Opmerkingen */}
                  <div>
                    <label className="text-[12px] font-semibold text-lx-text-secondary mb-2 block">Bijzonderheden <span className="font-normal text-lx-text-secondary">(optioneel)</span></label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Bijv. specifieke installatiewensen, deadline…"
                      rows={2}
                      className="w-full rounded-xl border border-black/12 px-3.5 py-2.5 text-[13px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors resize-none"
                    />
                  </div>

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
                      Ik heb de configuratie gecontroleerd en wil deze bestellen
                    </span>
                  </label>
                </div>

                {orderError && (
                  <div className="px-6 pb-2">
                    <div className="flex items-center gap-2 text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {orderError}
                    </div>
                  </div>
                )}

                {staffelTip && (
                  <div className="px-6 pb-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
                      <p className="text-[12px] text-amber-800 leading-relaxed">
                        Bestel er nog <strong>{staffelTip.stuks}</strong> meer (totaal{' '}
                        <strong>{staffelTip.tierQty} stuks</strong>) en betaal{' '}
                        <strong>€{staffelTip.prijsVolgend.toLocaleString('nl-NL')}</strong> per stuk
                        {' '}i.p.v. €{staffelTip.prijsNu.toLocaleString('nl-NL')}.
                      </p>
                    </div>
                  </div>
                )}
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 h-11 rounded-xl border border-black/10 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleOrder}
                    disabled={!checked || loading}
                    className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Bestelling plaatsen…' : 'Bestellen →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
