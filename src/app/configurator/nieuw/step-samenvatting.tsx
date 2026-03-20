'use client'

import {
  ShapeSlug,
  LightType,
  SHAPES,
  ORGANIC_SIZES,
  POSITION_LABELS,
  LIGHT_TYPE_LABELS,
  CONTROLS_FOR_TYPE,
  EXTRA_OPTIONS,
  calcTotalPrice,
} from '@/lib/configurator-config'
import { LightConfig } from './step-verlichting'

interface StepSamenvattingProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  projectName: string
  reference: string
  description: string
  quantity: number
  saving: boolean
  onProjectNameChange: (v: string) => void
  onReferenceChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onQuantityChange: (v: number) => void
  onGoToStep: (step: number) => void
  onSave: (asConcept: boolean) => void
  onOrder: () => void
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
  shape, width, height, diameter, organicSizeKey,
  directLight, indirectLight, selectedOptions,
  projectName, reference, description, quantity,
  saving, onProjectNameChange, onReferenceChange,
  onDescriptionChange, onQuantityChange, onGoToStep, onSave, onOrder,
}: StepSamenvattingProps) {
  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? shape
  const totalPrice = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey,
    directPosition: directLight.position,
    directType: directLight.type,
    directControl: directLight.control,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    indirectControl: indirectLight.control,
    selectedOptions,
  })
  const selectedOptionNames = selectedOptions
    .map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6">
      {/* Configuratie samenvatting */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Configuratie</p>
        <Row label="Vorm" value={shapeName} onEdit={() => onGoToStep(0)} />
        <Row label="Afmeting" value={getDimensionSummary(shape, width, height, diameter, organicSizeKey)} onEdit={() => onGoToStep(1)} />
        <Row label="Directe verlichting" value={getLightSummary(directLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Indirecte verlichting" value={getLightSummary(indirectLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Extra opties" value={selectedOptionNames || 'Geen'} onEdit={() => onGoToStep(3)} />
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

        <div className="flex items-center gap-4">
          <div>
            <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">Aantal</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 hover:bg-lx-border transition-colors flex items-center justify-center text-lg font-light"
              >−</button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-9 rounded-xl border border-black/12 text-center text-[14px] font-semibold text-lx-text-primary outline-none focus:border-lx-cta bg-white"
              />
              <button
                onClick={() => onQuantityChange(quantity + 1)}
                className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 hover:bg-lx-border transition-colors flex items-center justify-center text-lg font-light"
              >+</button>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-lx-text-secondary mb-1">Totaal project</p>
            <p className="text-[18px] font-bold text-lx-cta">
              €{(totalPrice * quantity).toLocaleString('nl-NL')}
            </p>
            <p className="text-[10.5px] text-lx-text-secondary">{quantity}× €{totalPrice.toLocaleString('nl-NL')} p.st. excl. btw</p>
          </div>
        </div>
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
        <button
          onClick={onOrder}
          disabled={!projectName.trim() || saving}
          className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving
            ? (shape === 'op-aanvraag' ? 'Aanvraag indienen…' : 'Bestelling plaatsen…')
            : (shape === 'op-aanvraag' ? 'Offerte aanvragen →' : 'Bestellen →')}
        </button>
      </div>
      {!projectName.trim() && (
        <p className="text-[11px] text-lx-text-secondary text-center">Vul een projectnaam in om door te gaan</p>
      )}
    </div>
  )
}
