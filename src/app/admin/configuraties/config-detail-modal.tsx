'use client'

import { leesMeubel, meubelKort, meubelPrijsInput } from '@/lib/meubel-opslag'
import { calcMeubelNettoCents, formatCents, indelingLabel, indelingTekst, kleurLabel, meubelAfmeting, meubelOptiesTekst, waskomTekst, SOLID_KLEUR_LABEL } from '@/lib/meubel-config'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import GroothandelBestelDialog from './groothandel-bestel-dialog'
import DeleteButton from '@/app/(main)/configuraties/delete-button'
import {
  SHAPES,
  formatOrganicSize,
  formatKraangat,
  KRAANGAT_OPTIE_ID,
  POSITION_LABELS,
  LIGHT_TYPE_LABELS,
  CONTROLS_FOR_TYPE,
  EXTRA_OPTIONS,
} from '@/lib/configurator-config'

interface SelectedOptions {
  shape?: string
  width?: number
  height?: number
  diameter?: number
  organicSizeKey?: string
  quantity?: number
  glasdikte?: string
  directLight?: { position?: string; type?: string; control?: string }
  indirectLight?: { position?: string; type?: string; control?: string }
  extras?: string[]
  optionSubChoices?: Record<string, string>
  mmsQuantity?: number
}

export interface ConfigRow {
  id: string
  name: string | null
  article_number: string | null
  total_price: number
  status: string
  updated_at: string
  /** Regels met hetzelfde project_id vormen samen één project */
  project_id?: string | null
  width: number | null
  height: number | null
  selected_options: Record<string, unknown> | null
  profiles: { full_name: string | null; company: string | null; email: string } | null
}

export const configStatusLabels: Record<string, { label: string; className: string }> = {
  draft:   { label: 'Concept',    className: 'bg-gray-100 text-lx-text-secondary border-gray-200' },
  saved:   { label: 'Offerte',    className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered: { label: 'Besteld',    className: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' },
}

function getLightSummary(light?: SelectedOptions['directLight']): string {
  if (!light?.position || light.position === 'geen') return 'Geen'
  const pos = POSITION_LABELS[light.position] ?? light.position
  const type = light.type ? LIGHT_TYPE_LABELS[light.type as keyof typeof LIGHT_TYPE_LABELS] : ''
  const controls = light.type ? CONTROLS_FOR_TYPE[light.type as keyof typeof CONTROLS_FOR_TYPE] : []
  const ctrl = light.control ? (controls?.find((c) => c.id === light.control)?.name ?? light.control) : ''
  return [pos, type, ctrl].filter(Boolean).join(' · ')
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-lx-divider last:border-0">
      <span className="text-[12px] text-lx-text-muted font-medium flex-shrink-0">{label}</span>
      <span className="text-[12.5px] text-lx-text-primary font-medium text-right">{value || '—'}</span>
    </div>
  )
}

/**
 * Detail van een configuratie die nog niet besteld is. `projectOpen` is het aantal
 * nog niet bestelde regels van het project waar deze configuratie bij hoort.
 */
export default function ConfigDetailModal({ config, projectOpen = 0, onClose }: {
  config: ConfigRow
  projectOpen?: number
  onClose: () => void
}) {
  const [bestellen, setBestellen] = useState(false)
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => { if (e.key === 'Escape' && !bestellen) onClose() }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [onClose, bestellen])

  const opts = (config.selected_options ?? {}) as SelectedOptions
  const shape = opts.shape ?? 'rechthoek'
  // Tailor-Made meubel: eigen regels in lijst en detail
  const meubel = leesMeubel(config.selected_options)
  const meubelNetto = meubel && !meubel.opAanvraag
    ? calcMeubelNettoCents(meubelPrijsInput(meubel))
    : null
  // Geen prijs: spiegel op aanvraag of meubel groter dan standaard
  const geenPrijs = shape === 'op-aanvraag' || meubel?.opAanvraag === true
  const diameter = opts.diameter as number | undefined
  const organicKey = opts.organicSizeKey
  const extras = (opts.extras ?? [])
    .map(id => id === KRAANGAT_OPTIE_ID ? formatKraangat(opts.optionSubChoices) : EXTRA_OPTIONS.find(o => o.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  let dimensionLabel = ''
  if (meubel) dimensionLabel = meubelKort(meubel)
  else if (shape === 'rond' && diameter) dimensionLabel = `∅ ${diameter} cm`
  else if (shape === 'organic' && organicKey) dimensionLabel = formatOrganicSize(organicKey)
  else if (config.width && config.height) dimensionLabel = `B ${config.width} × H ${config.height} cm`

  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? shape
  const status = configStatusLabels[config.status] ?? configStatusLabels.draft
  const longDate = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const profile = config.profiles

  const isProjectspiegel = shape === 'projectspiegel'

  return createPortal(
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-lx-divider">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold text-lx-text-primary leading-snug">
                    {config.name ?? 'Naamloze configuratie'}
                  </h2>
                  <p className="text-[12px] text-lx-text-muted mt-0.5">
                    {profile?.company ?? profile?.full_name ?? profile?.email ?? '—'} · {longDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-muted"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Klant */}
            <div className="px-6 py-3 bg-lx-panel-bg border-b border-lx-divider">
              <p className="text-[10px] font-bold uppercase tracking-widest text-lx-text-muted mb-1.5">Klant</p>
              <p className="text-[13px] font-semibold text-lx-text-primary">{profile?.full_name ?? '—'}</p>
              {profile?.company && (
                <p className="text-[12px] text-lx-text-secondary">{profile.company}</p>
              )}
              <p className="text-[12px] text-lx-text-muted">{profile?.email ?? ''}</p>
            </div>

            {/* Configuratie details */}
            <div className="px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-lx-text-muted mb-2">Configuratie</p>
              {config.article_number && <ModalRow label="Artikelnummer" value={config.article_number} />}
              {meubel ? (
                <>
                  <ModalRow label="Model" value={meubel.model.naam} />
                  <ModalRow label="Afmeting" value={meubelAfmeting(meubel.model, meubel.lengte)} />
                  <ModalRow label={indelingLabel(meubel.model)} value={indelingTekst(meubel.model, meubel.lades, meubel.ladeBreedtes, meubel.ladeRuimte, meubel)} />
                  {meubel.waskomVorm && <ModalRow label="Waskom" value={waskomTekst(meubel)} />}
                  {meubel.regaalBreedte > 0 && <ModalRow label="Regaalkast" value={`${meubel.regaalBreedte} mm breed, ${meubel.regaalZijde}`} />}
                  <ModalRow label={kleurLabel(meubel.model)} value={meubel.houtkleurNaam || 'Geen'} />
                  {meubel.solidKleurNaam && <ModalRow label={SOLID_KLEUR_LABEL} value={meubel.solidKleurNaam} />}
                  <ModalRow label="Opties" value={meubelOptiesTekst(meubel)} />
                  {meubel.attachmentUrl && (
                    <a href={meubel.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block py-2.5 text-[12.5px] font-semibold text-lx-cta hover:underline border-b border-lx-divider">Maattekening uitsparingen openen</a>
                  )}
                  <ModalRow label="Aantal" value={`${meubel.quantity}×`} />
                  {meubel.reference && <ModalRow label="Referentie" value={meubel.reference} />}
                  {meubel.opAanvraag ? (
                    <ModalRow label="Prijs" value="Op aanvraag, groter dan standaard" />
                  ) : (
                    <>
                      <ModalRow label="Factor dealer" value={meubel.factor.toLocaleString('nl-NL', { minimumFractionDigits: 1 })} />
                      <ModalRow label="Netto per stuk" value={meubelNetto !== null ? formatCents(meubelNetto) : 'Niet meer in de prijslijst'} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <ModalRow label="Vorm" value={shapeName} />
                  <ModalRow label="Afmeting" value={dimensionLabel || '—'} />
                  {opts.quantity != null && <ModalRow label="Aantal" value={`${opts.quantity}×`} />}
                  {!!opts.mmsQuantity && <ModalRow label="LoooX Glass Cleaner set" value={`${opts.mmsQuantity}×`} />}
                  {isProjectspiegel ? (
                    <ModalRow label="Glasdikte" value={opts.glasdikte ? `${opts.glasdikte} mm` : '—'} />
                  ) : (
                    <>
                      <ModalRow label="Directe verlichting" value={getLightSummary(opts.directLight)} />
                      <ModalRow label="Indirecte verlichting" value={getLightSummary(opts.indirectLight)} />
                      <ModalRow label="Extra opties" value={extras || 'Geen'} />
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer: downloads + prijs + verwijderen */}
            <div className="px-6 py-3.5 bg-lx-panel-bg border-t border-lx-divider">
              {/* PDF downloads */}
              <div className="flex gap-2 mb-3">
                <a
                  href={`/api/pdf/offerte/${config.id}`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-black/10 text-lx-text-secondary hover:text-lx-cta hover:border-lx-cta/30 hover:bg-white text-[12px] font-medium transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  Klantofferte
                </a>
                {/* Een orderbevestiging bestaat pas als de configuratie besteld is */}
                {config.status === 'ordered' && (
                  <a
                    href={`/api/pdf/order/by-config/${config.id}`}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-black/10 text-lx-text-secondary hover:text-lx-cta hover:border-lx-cta/30 hover:bg-white text-[12px] font-medium transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Orderbevestiging
                  </a>
                )}
              </div>
              {/* Besteld via de groothandel: het beheer maakt de order namens de dealer aan */}
              {config.status === 'saved' && (
                <button
                  type="button"
                  onClick={() => setBestellen(true)}
                  className="w-full h-9 mb-3 rounded-xl bg-lx-cta text-white text-[12.5px] font-semibold hover:bg-lx-cta-hover transition-colors cursor-pointer"
                >
                  Op besteld zetten (via groothandel)
                </button>
              )}
              {/* Prijs + verwijderen */}
              <div className="flex items-center justify-between">
                <DeleteButton
                  configId={config.id}
                  configName={config.name ?? 'Naamloze configuratie'}
                  isAdmin
                />
                <div className="text-right">
                  <span className="text-[16px] font-bold text-lx-cta">
                    {geenPrijs ? 'Op aanvraag' : `€${Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`}
                  </span>
                  {!geenPrijs && <span className="text-[11px] text-lx-text-muted ml-1.5">{meubel ? 'bruto excl. btw' : 'excl. btw'}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      {bestellen && (
        <GroothandelBestelDialog config={config} projectOpen={projectOpen} onCancel={() => setBestellen(false)} onKlaar={onClose} />
      )}
    </>,
    document.body,
  )
}
