'use client'

import { useState } from 'react'
import DeleteButton from '@/app/configuraties/delete-button'
import {
  SHAPES,
  ORGANIC_SIZES,
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
  organicSize?: string
  directLight?: { position?: string; type?: string; control?: string }
  indirectLight?: { position?: string; type?: string; control?: string }
  extras?: string[]
}

export interface ConfigRow {
  id: string
  name: string | null
  article_number: string | null
  total_price: number
  status: string
  updated_at: string
  width: number | null
  height: number | null
  selected_options: Record<string, unknown> | null
  profiles: { full_name: string | null; company: string | null; email: string } | null
}

const shapeLabel: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
}

const statusLabels: Record<string, { label: string; className: string }> = {
  draft:   { label: 'Concept',    className: 'bg-gray-100 text-lx-text-secondary' },
  saved:   { label: 'Opgeslagen', className: 'bg-blue-50 text-blue-700' },
  ordered: { label: 'Besteld',    className: 'bg-green-50 text-green-700' },
}

function ShapeIcon({ shape }: { shape: string }) {
  if (shape === 'rond') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/></svg>
  )
  if (shape === 'organic') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><path d="M12 3c4 0 9 2 9 7s-3 9-7 11c-3 1-8-1-10-5S2 7 6 4c1.5-1 4-1 6-1z"/></svg>
  )
  if (shape === 'op-aanvraag') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/><path d="M12 8v4m0 4h.01"/></svg>
  )
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
  )
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

export default function ConfigDetailModal({ config }: { config: ConfigRow }) {
  const [open, setOpen] = useState(false)

  const opts = (config.selected_options ?? {}) as SelectedOptions
  const shape = opts.shape ?? 'rechthoek'
  const diameter = opts.diameter as number | undefined
  const organicKey = opts.organicSize
  const extras = (opts.extras ?? [])
    .map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  let dimensionLabel = ''
  if (shape === 'rond' && diameter) dimensionLabel = `∅ ${diameter} cm`
  else if (shape === 'organic' && organicKey) {
    const size = ORGANIC_SIZES.find(s => s.key === organicKey)
    dimensionLabel = size?.label ?? organicKey.replace('x', ' × ') + ' cm'
  } else if (config.width && config.height) dimensionLabel = `${config.width} × ${config.height} cm`

  const metaParts = [
    shapeLabel[shape] ?? shape,
    dimensionLabel,
    opts.extras?.length ? `${opts.extras.length} extra${opts.extras.length !== 1 ? "'s" : ''}` : '',
  ].filter(Boolean)

  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? shape
  const status = statusLabels[config.status] ?? statusLabels.draft
  const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  const longDate = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const profile = config.profiles

  return (
    <>
      {/* Klikbare rij */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-lx-panel-bg transition-colors text-left cursor-pointer"
      >
        {/* Shape icon */}
        <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
          <ShapeIcon shape={shape} />
        </div>

        {/* Configuratie info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[13.5px] font-semibold text-lx-text-primary truncate leading-snug">
              {config.name ?? 'Naamloze configuratie'}
            </p>
            {config.article_number && (
              <span className="text-[10.5px] font-mono font-medium text-lx-text-muted flex-shrink-0">{config.article_number}</span>
            )}
          </div>
          <p className="text-[11.5px] text-lx-text-secondary mt-0.5 truncate">
            {metaParts.join(' · ')}
            <span className="text-lx-placeholder"> · {date}</span>
          </p>
        </div>

        {/* Klant */}
        <div className="hidden sm:block text-right flex-shrink-0 w-40">
          <p className="text-[12.5px] font-medium text-lx-text-primary truncate">
            {profile?.full_name ?? profile?.email ?? '—'}
          </p>
          <p className="text-[11px] text-lx-text-secondary truncate">{profile?.company ?? ''}</p>
        </div>

        {/* Prijs */}
        <div className="text-right flex-shrink-0 w-20 hidden md:block">
          <p className="text-[13.5px] font-bold text-lx-text-primary">
            €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-[10.5px] text-lx-text-secondary">excl. btw</p>
        </div>

        {/* Status */}
        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${status.className}`}>
          {status.label}
        </span>

        {/* Pijl-indicator */}
        <svg className="flex-shrink-0 text-lx-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
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
                    onClick={() => setOpen(false)}
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
              <ModalRow label="Vorm" value={shapeName} />
              <ModalRow label="Afmeting" value={dimensionLabel || '—'} />
              <ModalRow label="Directe verlichting" value={getLightSummary(opts.directLight)} />
              <ModalRow label="Indirecte verlichting" value={getLightSummary(opts.indirectLight)} />
              <ModalRow label="Extra opties" value={extras || 'Geen'} />
            </div>

            {/* Footer: prijs + verwijderen */}
            <div className="px-6 py-3.5 bg-lx-panel-bg border-t border-lx-divider flex items-center justify-between">
              <DeleteButton
                configId={config.id}
                configName={config.name ?? 'Naamloze configuratie'}
                isAdmin
              />
              <div className="text-right">
                <span className="text-[16px] font-bold text-lx-cta">
                  €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] text-lx-text-muted ml-1.5">excl. btw</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
