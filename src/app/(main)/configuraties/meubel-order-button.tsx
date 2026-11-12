'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { placeMeubelOrder } from '@/lib/actions/orders'
import { MEUBEL_AANTAL_MAX, calcMeubelNettoCents, formatCents, ladeBreedtesTekst, ladeLabel } from '@/lib/meubel-config'
import type { OpgeslagenMeubel } from '@/lib/meubel-opslag'

// Bestelmodal voor een Tailor-Made meubel. Dit is de enige plek waar de dealer
// de nettoprijs ziet: de tabelprijs, zonder dealerkorting, staffel of kortingscode.
// Een meubel op aanvraag heeft geen prijs en wordt een offerteaanvraag.

const inputCls = 'w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors'
const labelCls = 'text-[12px] font-semibold text-lx-text-secondary mb-1.5 block'

export default function MeubelOrderButton({ configId, configName, meubel }: {
  configId: string
  configName: string
  meubel: OpgeslagenMeubel
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const titelId = useId()
  const opAanvraag = meubel.opAanvraag
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(meubel.quantity)
  const [notes, setNotes] = useState('')
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [altShipping, setAltShipping] = useState(false)
  const [alt, setAlt] = useState({ straat: '', huisnummer: '', woonplaats: '', provincie: '', land: 'NL' })

  const nettoCents = opAanvraag ? null : calcMeubelNettoCents({
    modelId: meubel.model.id, lengte: meubel.lengte, lades: meubel.lades, houtkleur: meubel.houtkleur,
  })
  // Staat het meubel niet meer in de prijslijst, dan kan het niet besteld worden
  const bestelbaar = opAanvraag || nettoCents !== null
  const altOk = !altShipping || (alt.straat.trim() !== '' && alt.woonplaats.trim() !== '')

  function sluit() {
    if (loading) return
    setOpen(false)
    setQuantity(meubel.quantity); setNotes(''); setChecked(false); setFout(null); setResult(null); setAltShipping(false)
  }

  useEffect(() => {
    if (!open) return
    const opToets = (e: KeyboardEvent) => { if (e.key === 'Escape') sluit() }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading])

  async function bestel() {
    if (!checked || !bestelbaar || !altOk) return
    setLoading(true)
    setFout(null)
    try {
      // Zelfde opbouw als bij spiegels, zodat PDF en admin het adres hetzelfde lezen
      const altShippingAddress = altShipping
        ? [alt.straat, alt.huisnummer, alt.woonplaats, alt.provincie, alt.land].map((v) => v.trim()).join('\t')
        : null
      const { orderNumber } = await placeMeubelOrder(configId, quantity, notes, altShippingAddress)
      setResult(orderNumber)
      for (const key of ['orders', 'configurations', 'sidebar', 'dashboard', 'looox-circle']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    } catch (e) {
      console.error(e)
      setFout(e instanceof Error ? e.message : 'Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2.5 rounded-lg bg-lx-cta text-white text-[12.5px] font-semibold hover:bg-lx-cta-hover transition-colors whitespace-nowrap cursor-pointer"
      >
        {opAanvraag ? 'Aanvragen →' : 'Bestellen →'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={sluit}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titelId}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {result ? (
              <div className="p-7 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-lx-icon-bg flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" stroke="var(--lx-cta)" strokeWidth="2.5" />
                  </svg>
                </div>
                <div>
                  <p id={titelId} className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">
                    {opAanvraag ? 'Offerte aangevraagd' : 'Bestelling geplaatst'}
                  </p>
                  <p className="text-[20px] font-bold text-lx-text-primary font-mono tracking-wide">{result}</p>
                </div>
                <p className="text-[13px] text-lx-text-secondary">
                  {opAanvraag ? 'Je ontvangt een bevestiging per e-mail. LoooX neemt contact op over de prijs.' : 'Je ontvangt een orderbevestiging per e-mail.'}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => router.push('/bestellingen')}
                    className="flex-1 h-10 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors cursor-pointer"
                  >
                    Mijn bestellingen
                  </button>
                  <button
                    onClick={sluit}
                    className="flex-1 h-10 rounded-xl border border-black/10 text-lx-text-secondary text-[13px] font-semibold hover:bg-lx-panel-bg transition-colors cursor-pointer"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-lx-divider flex-shrink-0">
                  <h2 id={titelId} className="text-[17px] font-bold text-lx-text-primary">{opAanvraag ? 'Offerte aanvragen' : 'Meubel bestellen'}</h2>
                  <p className="text-[13px] text-lx-text-secondary mt-0.5 truncate">{configName}</p>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                  <div className="bg-lx-panel-bg rounded-xl px-4 py-3 text-[12.5px] text-lx-text-primary leading-relaxed">
                    <p className="font-semibold">{meubel.model.naam} · {meubel.houtkleurNaam}</p>
                    <p className="text-lx-text-secondary">
                      {meubel.lengte} mm lang · {meubel.model.hoogte} mm hoog · {meubel.model.diepte} mm diep
                    </p>
                    <p className="text-lx-text-secondary">
                      {ladeLabel(meubel.model, meubel.lades)} · {ladeBreedtesTekst(meubel.ladeBreedtes, meubel.lengte, meubel.lades)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span id={`${titelId}-aantal`} className="text-[13px] font-medium text-lx-text-primary flex-shrink-0">Aantal</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Eén minder"
                        className="w-9 h-9 rounded-xl bg-white border border-black/10 text-lx-text-primary text-lg font-light hover:bg-lx-panel-bg transition-colors flex items-center justify-center cursor-pointer"
                      >−</button>
                      <input
                        inputMode="numeric"
                        aria-labelledby={`${titelId}-aantal`}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(MEUBEL_AANTAL_MAX, Math.max(1, parseInt(e.target.value.replace(/\D/g, '')) || 1)))}
                        className="w-16 h-9 rounded-xl border-2 border-lx-cta text-center text-[14px] font-bold text-lx-cta bg-white outline-none"
                      />
                      <button
                        onClick={() => setQuantity((q) => Math.min(MEUBEL_AANTAL_MAX, q + 1))}
                        aria-label="Eén meer"
                        className="w-9 h-9 rounded-xl bg-white border border-black/10 text-lx-text-primary text-lg font-light hover:bg-lx-panel-bg transition-colors flex items-center justify-center cursor-pointer"
                      >+</button>
                    </div>
                  </div>

                  {opAanvraag ? (
                    <div className="bg-lx-panel-bg rounded-xl px-4 py-3">
                      <p className="text-[14px] font-bold text-lx-cta">Op aanvraag</p>
                      <p className="text-[12px] text-lx-text-secondary mt-0.5 leading-relaxed">
                        Dit meubel is groter dan de standaardmaten. Je vraagt een offerte aan; LoooX bepaalt de prijs.
                      </p>
                    </div>
                  ) : nettoCents !== null ? (
                    <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-lx-text-secondary">Netto per stuk</span>
                        <span className="text-lx-text-primary font-semibold tabular-nums">{formatCents(nettoCents)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-lx-divider pt-1.5">
                        <span className="text-[12.5px] text-lx-text-secondary font-medium">Totaal netto ex. BTW</span>
                        <span className="text-[18px] font-bold text-lx-cta tabular-nums">{formatCents(nettoCents * quantity)}</span>
                      </div>
                      <p className="text-[11px] text-lx-text-muted">Inkoopprijs volgens de Tailor-Made prijslijst.</p>
                    </div>
                  ) : (
                    <p role="alert" className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                      Dit meubel staat niet meer in de prijslijst. Open de configuratie en sla hem opnieuw op.
                    </p>
                  )}

                  <div>
                    <Vinkje checked={altShipping} onChange={setAltShipping}>
                      <span className="text-[13px] text-lx-text-primary font-medium">Alternatief afleveradres</span>
                    </Vinkje>
                    {altShipping && (
                      <div className="mt-3 space-y-2.5">
                        <p className="text-[11.5px] text-lx-text-secondary leading-snug">
                          Let op: het afleveradres mag geen privéadres zijn, alleen een zakelijk of bedrijfsadres.
                        </p>
                        <div className="grid grid-cols-[1fr_6rem] gap-2.5">
                          <label><span className={labelCls}>Straat</span>
                            <input type="text" maxLength={100} value={alt.straat} onChange={(e) => setAlt({ ...alt, straat: e.target.value })} className={inputCls} />
                          </label>
                          <label><span className={labelCls}>Huisnr.</span>
                            <input type="text" maxLength={20} value={alt.huisnummer} onChange={(e) => setAlt({ ...alt, huisnummer: e.target.value })} className={inputCls} />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <label><span className={labelCls}>Woonplaats</span>
                            <input type="text" maxLength={100} value={alt.woonplaats} onChange={(e) => setAlt({ ...alt, woonplaats: e.target.value })} className={inputCls} />
                          </label>
                          <label><span className={labelCls}>Provincie</span>
                            <input type="text" maxLength={100} value={alt.provincie} onChange={(e) => setAlt({ ...alt, provincie: e.target.value })} className={inputCls} />
                          </label>
                        </div>
                        <label><span className={labelCls}>Land</span>
                          <select value={alt.land} onChange={(e) => setAlt({ ...alt, land: e.target.value })} className={inputCls}>
                            <option value="NL">Nederland</option>
                            <option value="BE">België</option>
                          </select>
                        </label>
                        {!altOk && <p className="text-[11.5px] text-red-600">Vul minimaal straat en woonplaats in.</p>}
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <span className={labelCls}>Bijzonderheden <span className="font-normal">(optioneel)</span></span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={5000}
                      rows={2}
                      className="w-full rounded-xl border border-black/12 px-3.5 py-2.5 text-[13px] text-lx-text-primary outline-none focus:border-lx-cta bg-white transition-colors resize-none"
                    />
                  </label>

                  <Vinkje checked={checked} onChange={setChecked} boven>
                    <span className="text-[12.5px] text-lx-text-secondary leading-relaxed">
                      {opAanvraag ? 'Ik heb de configuratie gecontroleerd en wil een offerte aanvragen' : 'Ik heb de configuratie gecontroleerd en wil deze bestellen'}
                    </span>
                  </Vinkje>

                  {fout && (
                    <p role="alert" className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{fout}</p>
                  )}
                </div>

                <div className="px-6 pb-6 pt-3 flex gap-3 flex-shrink-0">
                  <button
                    onClick={sluit}
                    className="flex-1 h-11 rounded-xl border border-black/10 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors cursor-pointer"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={bestel}
                    disabled={!checked || loading || !bestelbaar || !altOk}
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? (opAanvraag ? 'Aanvraag versturen…' : 'Bestelling plaatsen…') : opAanvraag ? 'Aanvragen →' : 'Bestellen →'}
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

function Vinkje({ checked, onChange, boven = false, children }: {
  checked: boolean
  onChange: (v: boolean) => void
  /** Vakje bovenaan uitlijnen bij tekst over meerdere regels */
  boven?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`flex gap-2.5 cursor-pointer select-none ${boven ? 'items-start' : 'items-center'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta peer-focus-visible:ring-offset-2 ${boven ? 'mt-0.5' : ''} ${checked ? 'bg-lx-cta border-lx-cta' : 'bg-white border-black/20'}`}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children}
    </label>
  )
}
