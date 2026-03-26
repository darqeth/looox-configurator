'use client'

import {
  ShapeSlug,
  GlasKleur,
  LightType,
  SHAPES,
  ORGANIC_SIZES,
  GLAS_KLEUREN,
  POSITION_LABELS,
  LIGHT_TYPE_LABELS,
  CONTROLS_FOR_TYPE,
  EXTRA_OPTIONS,
  calcTotalPrice,
} from '@/lib/configurator-config'
import { LightConfig } from './step-verlichting'
import BestelModal from './bestel-modal'

interface StepSamenvattingProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur: GlasKleur
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  optionSubChoices: Record<string, string>
  projectName: string
  reference: string
  description: string
  saving: boolean
  schunineZijdenFile: File | null
  onProjectNameChange: (v: string) => void
  onReferenceChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onSchunineZijdenFileChange: (f: File | null) => void
  onGoToStep: (step: number) => void
  onSave: (asConcept: boolean) => void
  onOrder: (params: {
    quantity: number
    discount: { id: string; type: 'pct' | 'fixed'; value: number; useType: 'single' | 'per_user' } | null
  }) => void
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-lx-divider last:border-0">
      <span className="text-[12.5px] text-lx-text-secondary font-medium flex-shrink-0 w-32">{label}</span>
      <span className="text-[13px] text-lx-text-primary font-medium flex-1">{value || '—'}</span>
      <button onClick={onEdit} className="text-[12px] text-lx-cta font-semibold hover:underline flex-shrink-0">
        Wijzigen
      </button>
    </div>
  )
}

function getControlName(type: LightType | null, controlId: string | null): string {
  if (!type || !controlId) return ''
  const controls = CONTROLS_FOR_TYPE[type]
  return controls.find((c) => c.id === controlId)?.name ?? controlId
}

function getLightSummary(config: LightConfig): string {
  if (config.position === 'geen' || !config.position) return 'Geen'
  const pos = POSITION_LABELS[config.position] ?? config.position
  const type = config.type ? LIGHT_TYPE_LABELS[config.type] : ''
  const ctrl = config.type ? getControlName(config.type, config.control) : ''
  return [pos, type, ctrl].filter(Boolean).join(' · ')
}

function getDimensionSummary(shape: ShapeSlug, width: number, height: number, diameter: number | null, organicSizeKey: string | null): string {
  if (shape === 'rond') return diameter ? `⌀ ${diameter} cm` : '—'
  if (shape === 'organic') {
    const size = ORGANIC_SIZES.find(s => s.key === organicSizeKey)
    return size?.label ?? '—'
  }
  return `${width} × ${height} cm`
}

export default function StepSamenvatting({
  shape, width, height, diameter, organicSizeKey, glasKleur,
  directLight, indirectLight, selectedOptions, optionSubChoices,
  projectName, reference, description,
  saving, schunineZijdenFile, onProjectNameChange, onReferenceChange,
  onDescriptionChange, onSchunineZijdenFileChange,
  onGoToStep, onSave, onOrder,
}: StepSamenvattingProps) {
  const hasSchunineZijden = selectedOptions.includes('schuine-zijden')
  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? shape
  const glasKleurNaam = GLAS_KLEUREN.find(g => g.id === glasKleur)?.name ?? glasKleur

  const unitPrice = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey, glasKleur,
    directPosition: directLight.position,
    directType: directLight.type,
    directControl: directLight.control,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    indirectControl: indirectLight.control,
    selectedOptions,
    optionSubChoices,
  })

  const selectedOptionNames = selectedOptions
    .map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  const orderDisabled = !projectName.trim() || saving || (hasSchunineZijden && !schunineZijdenFile)

  return (
    <div className="space-y-6">
      {/* Configuratie samenvatting */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Configuratie</p>
        <Row label="Vorm" value={shapeName} onEdit={() => onGoToStep(0)} />
        <Row label="Afmeting" value={`${getDimensionSummary(shape, width, height, diameter, organicSizeKey)} · ${glasKleurNaam}`} onEdit={() => onGoToStep(1)} />
        <Row label="Directe verlichting" value={getLightSummary(directLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Indirecte verlichting" value={getLightSummary(indirectLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Extra opties" value={selectedOptionNames || 'Geen'} onEdit={() => onGoToStep(3)} />
      </div>

      {/* Prijs */}
      <div className="flex items-center justify-between bg-lx-panel-bg rounded-xl px-4 py-3">
        <span className="text-[12.5px] text-lx-text-secondary">Eenheidsprijs excl. btw</span>
        <span className="text-[17px] font-bold text-lx-cta">€{unitPrice.toLocaleString('nl-NL')}</span>
      </div>

      {/* Project details */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary">Projectgegevens</p>

        <div>
          <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">
            Projectnaam <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Bijv. Badkamer renovatie De Vries"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">Order referentie</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="Bijv. PO-2026-0042"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">Bijzonderheden voor LoooX</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Bijv. specifieke installatiewensen, afwijkend leveradres, deadline"
            rows={2}
            className="w-full rounded-xl border border-black/12 px-3.5 py-2.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors resize-none"
          />
        </div>

        {/* Upload maattekening — alleen bij schuine zijden */}
        {hasSchunineZijden && (
          <div>
            <label className="text-[12px] font-semibold text-lx-text-secondary mb-1 block">
              Maattekening schuine zijden <span className="text-red-400">*</span>
            </label>
            <p className="text-[11.5px] text-lx-text-secondary mb-2 leading-snug">
              Upload een tekening of schets met de gewenste hoeken en zijden (PNG, JPG of PDF, max. 10 MB).
            </p>
            {schunineZijdenFile ? (
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-lx-panel-bg border border-lx-cta/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="flex-1 text-[13px] text-lx-text-primary font-medium truncate">{schunineZijdenFile.name}</span>
                <button
                  type="button"
                  onClick={() => onSchunineZijdenFileChange(null)}
                  className="text-lx-text-secondary hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onSchunineZijdenFileChange(f)
                  }}
                />
                <div className="border-2 border-dashed border-lx-cta/25 hover:border-lx-cta/50 rounded-xl p-5 text-center transition-colors hover:bg-lx-panel-bg">
                  <svg className="mx-auto mb-2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-[12.5px] text-lx-text-secondary">
                    Sleep een bestand hierheen of <span className="text-lx-cta font-semibold">klik om te uploaden</span>
                  </p>
                </div>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Volgende stappen info */}
      <div className="bg-lx-panel-bg rounded-xl px-4 py-3 flex gap-3">
        <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <p className="text-[12px] text-lx-text-secondary leading-relaxed">
          {shape === 'op-aanvraag'
            ? 'Dit is een offerteaanvraag — geen betaling vereist. Je ontvangt binnen 1 werkdag een bevestiging. Productietijd is ca. 10 werkdagen na akkoord.'
            : 'Je bestelling wordt direct in behandeling genomen. Je ontvangt binnen 1 werkdag een orderbevestiging. Productietijd is ca. 10 werkdagen.'}
        </p>
      </div>

      {/* Actieknoppen */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onSave(false)}
          disabled={!projectName.trim() || saving}
          className="flex-1 h-11 rounded-xl border-2 border-lx-cta text-lx-cta text-[13.5px] font-semibold hover:bg-lx-panel-bg/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Opslaan…' : 'Opslaan'}
        </button>
        <BestelModal
          shape={shape}
          unitPrice={unitPrice}
          projectName={projectName}
          saving={saving}
          disabled={orderDisabled}
          onOrder={onOrder}
        />
      </div>
      {!projectName.trim() && (
        <p className="text-[11px] text-lx-text-secondary text-center">Vul een projectnaam in om door te gaan</p>
      )}
      {hasSchunineZijden && !schunineZijdenFile && projectName.trim() && (
        <p className="text-[11px] text-lx-text-secondary text-center">Upload een maattekening om te kunnen bestellen</p>
      )}
    </div>
  )
}
