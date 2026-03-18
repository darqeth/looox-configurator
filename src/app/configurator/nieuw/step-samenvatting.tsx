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
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#F0EDE8] last:border-0">
      <span className="text-[12.5px] text-[#9CA3AF] font-medium flex-shrink-0 w-32">{label}</span>
      <span className="text-[13px] text-[#1A1A1A] font-medium flex-1">{value || '—'}</span>
      <button onClick={onEdit} className="text-[12px] text-[#3D6B4F] font-semibold hover:underline flex-shrink-0">
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
  onDescriptionChange, onQuantityChange, onGoToStep, onSave,
}: StepSamenvattingProps) {
  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? shape
  const totalPrice = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey,
    directPosition: directLight.position,
    directType: directLight.type,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    selectedOptions,
  })
  const selectedOptionNames = selectedOptions
    .map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6">
      {/* Configuratie samenvatting */}
      <div className="bg-[#F9F8F7] rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Configuratie</p>
        <Row label="Vorm" value={shapeName} onEdit={() => onGoToStep(0)} />
        <Row label="Afmeting" value={getDimensionSummary(shape, width, height, diameter, organicSizeKey)} onEdit={() => onGoToStep(1)} />
        <Row label="Directe verlichting" value={getLightSummary(directLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Indirecte verlichting" value={getLightSummary(indirectLight)} onEdit={() => onGoToStep(2)} />
        <Row label="Extra opties" value={selectedOptionNames || 'Geen'} onEdit={() => onGoToStep(3)} />
      </div>

      {/* Project details */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Projectgegevens</p>

        <div>
          <label className="text-[12px] font-semibold text-[#6B7280] mb-1.5 block">
            Projectnaam <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Bijv. Badkamer renovatie De Vries"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-[#1A1A1A] placeholder-[#C4C0B8] outline-none focus:border-[#3D6B4F] bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B7280] mb-1.5 block">Order referentie</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="Bijv. PO-2026-0042"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-[#1A1A1A] placeholder-[#C4C0B8] outline-none focus:border-[#3D6B4F] bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B7280] mb-1.5 block">Omschrijving</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optionele notities of bijzonderheden"
            rows={2}
            className="w-full rounded-xl border border-black/12 px-3.5 py-2.5 text-[13.5px] text-[#1A1A1A] placeholder-[#C4C0B8] outline-none focus:border-[#3D6B4F] bg-white transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="text-[12px] font-semibold text-[#6B7280] mb-1.5 block">Aantal</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-xl bg-[#F5F3EF] border border-black/8 hover:bg-[#EDE9E3] transition-colors flex items-center justify-center text-lg font-light"
              >−</button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-9 rounded-xl border border-black/12 text-center text-[14px] font-semibold text-[#1A1A1A] outline-none focus:border-[#3D6B4F] bg-white"
              />
              <button
                onClick={() => onQuantityChange(quantity + 1)}
                className="w-9 h-9 rounded-xl bg-[#F5F3EF] border border-black/8 hover:bg-[#EDE9E3] transition-colors flex items-center justify-center text-lg font-light"
              >+</button>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-[#9CA3AF] mb-1">Totaal project</p>
            <p className="text-[18px] font-bold text-[#3D6B4F]">
              €{(totalPrice * quantity).toLocaleString('nl-NL')}
            </p>
            <p className="text-[10.5px] text-[#9CA3AF]">{quantity}× €{totalPrice.toLocaleString('nl-NL')} p.st. excl. btw</p>
          </div>
        </div>
      </div>

      {/* Actieknoppen */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => onSave(true)}
          disabled={!projectName.trim() || saving}
          className="flex-1 h-11 rounded-xl border-2 border-[#3D6B4F] text-[#3D6B4F] text-[13.5px] font-semibold hover:bg-[#3D6B4F]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Opslaan…' : 'Opslaan als concept'}
        </button>
        <button
          onClick={() => onSave(false)}
          disabled={!projectName.trim() || saving}
          className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-[13.5px] font-semibold hover:bg-[#2e5540] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Opslaan…' : 'Offerte aanvragen'}
        </button>
      </div>
      {!projectName.trim() && (
        <p className="text-[11px] text-[#9CA3AF] text-center">Vul een projectnaam in om op te slaan</p>
      )}
    </div>
  )
}
