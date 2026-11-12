'use client'

import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { leesMeubel } from '@/lib/meubel-opslag'
import { formatPct, getMeubelOrderOpbouw, indelingLabel, indelingTekst, kleurLabel, meubelAfmeting, meubelOptiesTekst, waskomTekst } from '@/lib/meubel-config'
import { formatOrganicSize } from '@/lib/configurator-config'
import { formatEuro } from '@/lib/mms'
import type { AdminOrder } from './admin-bestellingen-list'

// Detail van een bestelling voor admin, met de PDF's als vangnet wanneer de
// mail niet is aangekomen. Opent door op het ordernummer in de lijst te klikken.

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek', rond: 'Rond', organic: 'Organic', 'op-aanvraag': 'Op aanvraag',
  'rounded-rect': 'Afgerond', ovaal: 'Ovaal', elips: 'Ellips', arc: 'Boog',
  projectspiegel: 'Projectspiegel', sol: 'Sol', luna: 'Luna', meubel: 'Meubel',
}

function Rij({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-lx-divider last:border-0">
      <span className="text-[12px] text-lx-text-muted font-medium flex-shrink-0">{label}</span>
      <span className="text-[12.5px] text-lx-text-primary font-medium text-right">{value || '—'}</span>
    </div>
  )
}

const pdfKnop = 'flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-black/10 text-lx-text-secondary hover:text-lx-cta hover:border-lx-cta/30 hover:bg-white text-[12.5px] font-semibold transition-colors'

export default function OrderDetailModal({ order, statusLabel, onClose }: {
  order: AdminOrder
  statusLabel: string
  onClose: () => void
}) {
  const titelId = useId()
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [onClose])

  const opts = (order.config?.selected_options ?? {}) as Record<string, unknown>
  const shape = (opts.shape as string | undefined) ?? 'rechthoek'
  const meubel = leesMeubel(opts)
  const isOfferte = shape === 'op-aanvraag' || meubel?.opAanvraag === true
  const datum = new Date(order.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  let afmeting = '—'
  if (shape === 'organic' && opts.organicSizeKey) afmeting = formatOrganicSize(opts.organicSizeKey as string)
  else if ((shape === 'rond' || shape === 'sol' || shape === 'luna') && opts.diameter) afmeting = `∅ ${opts.diameter} cm`
  else if (order.config?.width && order.config?.height) afmeting = `B ${order.config.width} × H ${order.config.height} cm`

  const opbouw = meubel && !isOfferte ? getMeubelOrderOpbouw(Math.round(Number(order.unit_price) * 100), meubel.factor) : null
  const altAdres = typeof opts.altShippingAddress === 'string' ? opts.altShippingAddress.split('\t').filter(Boolean).join(' ') : ''

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-lx-divider flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titelId} className="text-[15px] font-bold text-lx-text-primary font-mono leading-snug">{order.order_number}</h2>
              <p className="text-[12px] text-lx-text-muted mt-0.5">{isOfferte ? 'Offerteaanvraag' : 'Bestelling'}{order.order_group ? ` · regel van project ${order.order_group}` : ''} · {datum}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-lx-panel-bg text-lx-text-secondary">{statusLabel}</span>
              <button
                onClick={onClose}
                autoFocus
                aria-label="Sluiten"
                className="w-7 h-7 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-muted cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="px-6 py-3 bg-lx-panel-bg border-b border-lx-divider">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lx-text-muted mb-1.5">Klant</p>
            <p className="text-[13px] font-semibold text-lx-text-primary">{order.profile?.full_name ?? '—'}</p>
            {order.profile?.company && <p className="text-[12px] text-lx-text-secondary">{order.profile.company}</p>}
            <p className="text-[12px] text-lx-text-muted">{order.profile?.email ?? ''}</p>
          </div>

          <div className="px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lx-text-muted mb-2">{isOfferte ? 'Aanvraag' : 'Bestelling'}</p>
            <Rij label="Project" value={order.config?.name ?? '—'} />
            {order.config?.article_number && <Rij label="Artikelnummer" value={order.config.article_number} />}
            {meubel ? (
              <>
                <Rij label="Model" value={meubel.model.naam} />
                <Rij label="Afmeting" value={meubelAfmeting(meubel.model, meubel.lengte)} />
                <Rij label={indelingLabel(meubel.model)} value={indelingTekst(meubel.model, meubel.lades, meubel.ladeBreedtes, meubel.ladeRuimte)} />
                {meubel.waskomVorm && <Rij label="Waskom" value={waskomTekst(meubel)} />}
                  {meubel.regaalBreedte > 0 && <Rij label="Regaalkast" value={`${meubel.regaalBreedte} mm breed, ${meubel.regaalZijde}`} />}
                <Rij label={kleurLabel(meubel.model)} value={meubel.houtkleurNaam} />
                <Rij label="Opties" value={meubelOptiesTekst(meubel)} />
                {meubel.attachmentUrl && (
                  <a href={meubel.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block py-2.5 text-[12.5px] font-semibold text-lx-cta hover:underline border-b border-lx-divider">Maattekening uitsparingen openen</a>
                )}
              </>
            ) : (
              <>
                <Rij label="Vorm" value={SHAPE_LABELS[shape] ?? shape} />
                <Rij label="Afmeting" value={afmeting} />
              </>
            )}
            <Rij label="Aantal" value={`${order.quantity}×`} />
            {isOfferte ? (
              <Rij label="Prijs" value="Op aanvraag" />
            ) : (
              <>
                {opbouw && <Rij label="Bruto per stuk" value={formatEuro(opbouw.brutoCents / 100)} />}
                {opbouw && <Rij label="Dealer korting" value={formatPct(opbouw.kortingPct)} />}
                <Rij label={meubel ? 'Netto per stuk' : 'Stuksprijs'} value={formatEuro(Number(order.unit_price))} />
              </>
            )}
            {altAdres && <Rij label="Afleveradres" value={altAdres} />}
            {order.notes && <Rij label="Opmerking" value={order.notes} />}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-lx-panel-bg border-t border-lx-divider flex-shrink-0">
          {order.config && (
            <div className="flex gap-2 mb-3">
              <a href={`/api/pdf/offerte/${order.config.id}`} download className={pdfKnop}>Klantofferte</a>
              <a href={`/api/pdf/order/by-config/${order.config.id}`} download className={pdfKnop}>{isOfferte ? 'Offerteaanvraag' : 'Orderbevestiging'}</a>
            </div>
          )}
          {order.order_group && (
            <a href={`/api/pdf/order/groep/${order.order_group}`} download className={`${pdfKnop} mb-3`}>Hele projectorder {order.order_group}</a>
          )}
          <div className="flex items-baseline justify-end">
            <span className="text-[18px] font-bold text-lx-cta">{isOfferte ? 'Op aanvraag' : formatEuro(Number(order.total_price))}</span>
            {!isOfferte && <span className="text-[11px] text-lx-text-muted ml-1.5">totaal excl. btw</span>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
