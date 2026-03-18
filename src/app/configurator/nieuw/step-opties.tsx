'use client'

import { ShapeSlug, EXTRA_OPTIONS } from '@/lib/configurator-config'

const OPTION_ICONS: Record<string, React.ReactNode> = {
  verwarming: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 21a5 5 0 0 1 0-7l7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7"/>
      <path d="M9 3a3 3 0 0 1 4.5 2.5"/>
    </svg>
  ),
  'makeup-spiegel': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7"/>
      <line x1="16.5" y1="16.5" x2="22" y2="22"/>
      <text x="11" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">5×</text>
    </svg>
  ),
  'bluetooth-speaker': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
    </svg>
  ),
  'afgeronde-hoeken': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9V7a4 4 0 0 1 4-4h2"/>
      <path d="M21 9V7a4 4 0 0 0-4-4h-2"/>
      <path d="M3 15v2a4 4 0 0 0 4 4h2"/>
      <path d="M21 15v2a4 4 0 0 1-4 4h-2"/>
    </svg>
  ),
  'digitale-klok': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10v4M10 10v4M14 10v4M18 10v4" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'frame-in-kleur': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  ),
  'schuine-zijden': (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polygon points="5,3 19,3 21,21 3,21"/>
    </svg>
  ),
}

interface StepOptiesProps {
  shape: ShapeSlug
  selectedOptions: string[]
  onChange: (options: string[]) => void
}

export default function StepOpties({ shape, selectedOptions, onChange }: StepOptiesProps) {
  const available = EXTRA_OPTIONS.filter((opt) => opt.shapes.includes(shape))

  function getIncompatibleReason(optionId: string): string | null {
    const option = EXTRA_OPTIONS.find((o) => o.id === optionId)
    if (!option) return null

    for (const selectedId of selectedOptions) {
      if (option.incompatibleWith.includes(selectedId)) {
        const conflicting = EXTRA_OPTIONS.find((o) => o.id === selectedId)
        return `Niet combineerbaar met ${conflicting?.name}`
      }
    }

    // Check if any selected option lists this one as incompatible
    for (const selectedId of selectedOptions) {
      const selected = EXTRA_OPTIONS.find((o) => o.id === selectedId)
      if (selected?.incompatibleWith.includes(optionId)) {
        return `Niet combineerbaar met ${selected.name}`
      }
    }

    return null
  }

  function toggle(optionId: string) {
    if (selectedOptions.includes(optionId)) {
      onChange(selectedOptions.filter((id) => id !== optionId))
    } else {
      onChange([...selectedOptions, optionId])
    }
  }

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-[14px] text-[#6B7280]">Geen extra opties beschikbaar voor deze vorm.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {available.map((option) => {
        const isSelected = selectedOptions.includes(option.id)
        const incompatibleReason = getIncompatibleReason(option.id)
        const isDisabled = !isSelected && incompatibleReason !== null

        return (
          <button
            key={option.id}
            onClick={() => !isDisabled && toggle(option.id)}
            disabled={isDisabled}
            className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              isDisabled
                ? 'opacity-45 cursor-not-allowed border-black/8 bg-white'
                : isSelected
                ? 'border-[#3D6B4F] bg-[#3D6B4F]/5'
                : 'border-black/10 bg-white hover:border-[#3D6B4F]/50 hover:bg-[#F5F3EF]'
            }`}
          >
            {/* Prijs badge */}
            <span className={`absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isSelected ? 'bg-[#3D6B4F]/15 text-[#3D6B4F]' : 'bg-[#F5F3EF] text-[#6B7280]'
            }`}>
              +€{option.price}
            </span>

            {/* Icoon */}
            <div className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'}`}>
              {OPTION_ICONS[option.id] ?? (
                <div className="w-8 h-8 rounded-lg bg-[#F5F3EF]" />
              )}
            </div>

            {/* Tekst */}
            <div className="flex-1 min-w-0 pr-10">
              <p className={`text-[13.5px] font-semibold ${isSelected ? 'text-[#3D6B4F]' : 'text-[#1A1A1A]'}`}>
                {option.name}
              </p>
              {isDisabled && incompatibleReason ? (
                <p className="text-[11px] text-red-400 mt-0.5">{incompatibleReason}</p>
              ) : (
                <p className="text-[11.5px] text-[#9CA3AF] mt-0.5 leading-snug">{option.description}</p>
              )}
            </div>

            {/* Toggle */}
            <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
              isSelected ? 'bg-[#3D6B4F] border-[#3D6B4F]' : 'border-black/20 bg-white'
            }`}>
              {isSelected && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
