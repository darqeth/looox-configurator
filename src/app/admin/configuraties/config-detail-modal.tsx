'use client'

import { useState } from 'react'
import DeleteButton from '@/app/(main)/configuraties/delete-button'
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
  rechthoek:       'Rechthoek',
  rond:            'Rond',
  organic:         'Organic',
  'op-aanvraag':   'Op aanvraag',
  'rounded-rect':  'Afgerond',
  ovaal:           'Ovaal',
  arc:             'Boog',
  projectspiegel:  'Projectspiegel',
}

const statusLabels: Record<string, { label: string; className: string }> = {
  draft:   { label: 'Concept',    className: 'bg-gray-100 text-lx-text-secondary border-gray-200' },
  saved:   { label: 'Opgeslagen', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered: { label: 'Besteld',    className: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' },
}

function ShapeIcon({ shape }: { shape: string }) {
  if (shape === 'rond') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/></svg>
  if (shape === 'organic') return <svg width="15" height="15" viewBox="0 0 200 200" fill="none" stroke="var(--lx-cta)" strokeWidth="16"><path d="M97.8,156.3c-2.7.7-5.4,1.3-8.2,1.1s-1.6-.1-2.2-.3c-3.6-.9-7-1.8-10.2-3.9-22.6-14.7-38.4-35.2-49.6-59.6-9.1-20-8.5-45.1,11.5-56.1s23.8-6.8,36.6-6c27.2,1.8,53.5,9.3,77.2,22.5s22.1,16.3,24.3,28.6c.8,4.4-.7,9.4-.7,9.4-2.6,8.3-7.1,15.4-12.4,22.3-10.1,13-22.9,21.9-37.3,30.2-5.4,3.1-20.8,9.5-29,11.7Z"/></svg>
  if (shape === 'op-aanvraag') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/><path d="M12 8v4m0 4h.01"/></svg>
  if (shape === 'rounded-rect') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="4"/></svg>
  if (shape === 'ovaal') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="7" width="18" height="10" rx="5"/></svg>
  if (shape === 'arc') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><path d="M3 18 L3 12 A9 9 0 0 1 21 12 L21 18 Z"/></svg>
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
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

  const isProjectspiegel = shape === 'projectspiegel'

  return (
    <>
      {/* Klikbare rij */}
      <button
        onClick={() => setOpen(true)}
        className={`w-full transition-colors text-left cursor-pointer ${isProjectspiegel ? 'border-l-[3px] border-l-teal-400 bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-lx-panel-bg/50'}`}
      >
        {/* Mobile layout */}
        <div className="flex gap-3 px-4 py-3.5 sm:hidden">
          <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShapeIcon shape={shape} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-lx-text-primary truncate">{config.name ?? 'Naamloze configuratie'}</p>
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5 ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
              {profile?.full_name ?? profile?.email ?? '—'}{profile?.company ? ` · ${profile.company}` : ''}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-lx-text-secondary">{metaParts.join(' · ')} · {date}</span>
              <span className="text-[12.5px] font-bold text-lx-text-primary">€{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Tablet / Desktop layout */}
        <div className="hidden sm:flex items-center gap-4 px-5 py-3.5">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
            <ShapeIcon shape={shape} />
          </div>

          {/* Col: Naam + article# + datum */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">
                {config.name ?? 'Naamloze configuratie'}
              </p>
              {config.article_number && (
                <span className="text-[10.5px] font-mono font-medium text-lx-text-muted flex-shrink-0">{config.article_number}</span>
              )}
            </div>
            <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
              <span className="lg:hidden">{metaParts.join(' · ')} · </span>
              {date}
            </p>
          </div>

          {/* Col: Vorm + afmeting — desktop only */}
          <div className="hidden lg:block w-[148px] flex-shrink-0">
            <p className="text-[12px] font-medium text-lx-text-primary">{shapeLabel[shape] ?? shape}</p>
            <p className="text-[11px] text-lx-text-secondary mt-0.5">{dimensionLabel || '—'}</p>
          </div>

          {/* Col: Klant */}
          <div className="w-[156px] flex-shrink-0 min-w-0">
            <p className="text-[12px] font-medium text-lx-text-primary truncate">
              {profile?.full_name ?? profile?.email ?? '—'}
            </p>
            <p className="text-[11px] text-lx-text-secondary truncate">{profile?.company ?? ''}</p>
          </div>

          {/* Col: Prijs */}
          <div className="w-[88px] flex-shrink-0 text-right">
            <p className="text-[13px] font-bold text-lx-text-primary">
              €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[10.5px] text-lx-text-secondary mt-0.5">excl. btw</p>
          </div>

          {/* Col: Status */}
          <div className="w-[96px] flex-shrink-0 flex justify-center">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap border ${status.className}`}>
              {status.label}
            </span>
          </div>

          {/* Pijl */}
          <div className="w-4 flex-shrink-0 flex justify-end">
            <svg className="text-lx-text-muted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </div>
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
              </div>
              {/* Prijs + verwijderen */}
              <div className="flex items-center justify-between">
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
        </div>
      )}
    </>
  )
}
