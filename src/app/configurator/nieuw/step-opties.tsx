'use client'

import { ShapeSlug, EXTRA_OPTIONS } from '@/lib/configurator-config'

function OptionIcon({ id, active }: { id: string; active: boolean }) {
  const imgIds: Record<string, string> = {
    'verwarming': '/icons/verwarming.png',
    'makeup-spiegel': '/icons/makeup_spiegel.png',
    'bluetooth-speaker': '/icons/speaker.png',
    'digitale-klok': '/icons/clock.png',
  }
  if (imgIds[id]) {
    return (
      <img
        src={imgIds[id]}
        alt=""
        width={32}
        height={32}
        className={`object-contain transition-all ${active ? 'opacity-100' : 'opacity-40'}`}
        style={active ? { filter: 'brightness(0) saturate(100%) invert(30%) sepia(40%) saturate(500%) hue-rotate(100deg) brightness(70%)' } : {}}
      />
    )
  }
  // Fallback SVG icons — zelfde opacity-behandeling als PNG icons
  const svgClass = `transition-all ${active ? 'opacity-100' : 'opacity-40'}`
  if (id === 'afgeronde-hoeken') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={svgClass}>
      <path d="M3 9V7a4 4 0 0 1 4-4h2"/><path d="M21 9V7a4 4 0 0 0-4-4h-2"/>
      <path d="M3 15v2a4 4 0 0 0 4 4h2"/><path d="M21 15v2a4 4 0 0 1-4 4h-2"/>
    </svg>
  )
  if (id === 'frame-in-kleur') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={svgClass}>
      <rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  )
  if (id === 'schuine-zijden') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={svgClass}>
      <polygon points="5,3 19,3 21,21 3,21"/>
    </svg>
  )
  return <div className="w-8 h-8 rounded-lg bg-lx-panel-bg" />
}

interface StepOptiesProps {
  shape: ShapeSlug
  selectedOptions: string[]
  onChange: (options: string[]) => void
  optionSubChoices: Record<string, string>
  onSubChoiceChange: (optionId: string, choiceId: string) => void
}

export default function StepOpties({ shape, selectedOptions, onChange, optionSubChoices, onSubChoiceChange }: StepOptiesProps) {
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
        <p className="text-[14px] text-lx-text-secondary">Geen extra opties beschikbaar voor deze vorm.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {available.map((option) => {
        const isSelected = selectedOptions.includes(option.id)
        const incompatibleReason = getIncompatibleReason(option.id)
        const isDisabled = !isSelected && incompatibleReason !== null
        const selectedSubChoice = optionSubChoices[option.id]

        return (
          <button
            key={option.id}
            onClick={() => !isDisabled && toggle(option.id)}
            disabled={isDisabled}
            className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
              isDisabled
                ? 'opacity-45 cursor-not-allowed border-black/8 bg-white'
                : isSelected
                ? 'border-lx-cta bg-lx-panel-bg/50'
                : 'border-black/10 bg-white hover:border-lx-cta/50 hover:bg-lx-panel-bg'
            }`}
          >
            {/* Top row: icon + text + price badge */}
            <div className="flex items-start gap-4">
              {/* Prijs badge */}
              <span className={`absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isSelected ? 'bg-lx-icon-bg text-lx-cta' : 'bg-lx-panel-bg text-lx-text-secondary'
              }`}>
                {option.priceDisplay ?? `+€${option.price}`}
              </span>

              {/* Icoon */}
              <div className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-lx-cta' : 'text-lx-text-secondary'}`}>
                <OptionIcon id={option.id} active={isSelected} />
              </div>

              {/* Tekst */}
              <div className="flex-1 min-w-0 pr-14">
                <p className={`text-[13.5px] font-semibold ${isSelected ? 'text-lx-cta' : 'text-lx-text-primary'}`}>
                  {option.name}
                </p>
                {isDisabled && incompatibleReason ? (
                  <p className="text-[11px] text-red-400 mt-0.5">{incompatibleReason}</p>
                ) : (
                  <p className="text-[11.5px] text-lx-text-secondary mt-0.5 leading-snug">{option.description}</p>
                )}
              </div>
            </div>

            {/* Sub-choices (shown when selected and option has subChoices) */}
            {isSelected && option.subChoices && (
              <div
                className="mt-3 pt-3 border-t border-lx-divider w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[10.5px] font-semibold text-lx-text-muted uppercase tracking-wide">
                    {option.subChoices.label}
                  </p>
                  {!selectedSubChoice && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Verplicht</span>
                  )}
                </div>

                {/* Color swatches */}
                {(option.subChoices.options[0]?.color !== undefined || option.subChoices.options[0]?.image !== undefined) ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {option.subChoices.options.map((choice) => (
                      <div key={choice.id} className="relative group">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onSubChoiceChange(option.id, choice.id)
                          }}
                          className={`rounded-lg border-2 overflow-hidden transition-all ring-offset-1 ${
                            selectedSubChoice === choice.id
                              ? 'border-lx-cta ring-2 ring-lx-cta/20 scale-105'
                              : 'border-transparent hover:border-lx-cta/40 hover:scale-105'
                          } ${choice.image ? 'w-10 h-10' : 'w-7 h-7 rounded-full'}`}
                          style={choice.image ? undefined : { backgroundColor: choice.color }}
                        >
                          {choice.image && (
                            <img src={choice.image} alt={choice.name} className="w-full h-full object-cover" />
                          )}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {choice.name}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-lx-text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Pill buttons for position/location */
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {option.subChoices.options.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={e => {
                          e.stopPropagation()
                          onSubChoiceChange(option.id, choice.id)
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
                          selectedSubChoice === choice.id
                            ? 'bg-lx-cta text-white border-lx-cta'
                            : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50 hover:text-lx-cta'
                        }`}
                      >
                        {choice.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
