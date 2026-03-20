'use client'

import Image from 'next/image'
import {
  ShapeSlug,
  LightType,
  DIRECT_LIGHT_POSITIONS,
  INDIRECT_LIGHT_POSITIONS,
  POSITION_LABELS,
  LIGHT_TYPE_LABELS,
  LIGHT_TYPE_DESCRIPTIONS,
  CONTROLS_FOR_TYPE,
  CONTROL_PRICES,
} from '@/lib/configurator-config'

type LightConfig = {
  position: string
  type: LightType | null
  control: string | null
}

interface LightSectionProps {
  title: string
  positions: string[]
  config: LightConfig
  onChange: (updates: Partial<LightConfig>) => void
}

const CONTROL_IMG: Record<string, string> = {
  'tip-touch': '/icons/tiptouch.png',
  '3-staps-dimmer': '/icons/3traps_dimmer.png',
  'wip-schakelaar': '/icons/wipschakelaar.png',
  'motion-sensor': '/icons/motion.png',
}

function ControlIcon({ id, active }: { id: string; active: boolean }) {
  if (CONTROL_IMG[id]) {
    return (
      <Image
        src={CONTROL_IMG[id]}
        alt=""
        width={32}
        height={32}
        className={`object-contain transition-all ${active ? 'opacity-100' : 'opacity-35'}`}
        style={active ? { filter: 'brightness(0) saturate(100%) invert(30%) sepia(40%) saturate(500%) hue-rotate(100deg) brightness(70%)' } : {}}
      />
    )
  }
  const svgClass = `transition-all ${active ? 'opacity-100' : 'opacity-35'}`
  if (id === 'externe-schakeling') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svgClass}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg>
  )
  if (id === 'afstandsbediening') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svgClass}><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
  )
  return <div className="w-7 h-7" />
}

function LightSection({ title, positions, config, onChange }: LightSectionProps) {
  const lightTypes: LightType[] = ['3000k', '4000k', 'rgbw', 'cct']

  if (positions.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-semibold text-lx-text-primary">{title}</p>

      {/* Positie */}
      <div className="flex flex-wrap gap-2">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => onChange({ position: pos, type: pos === 'geen' ? null : config.type, control: pos === 'geen' ? null : config.control })}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
              config.position === pos
                ? 'bg-lx-cta text-white border-lx-cta'
                : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
            }`}
          >
            {POSITION_LABELS[pos]}
          </button>
        ))}
      </div>

      {/* Lichttype */}
      {config.position !== 'geen' && (
        <div className="pl-0.5 space-y-3">
          <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Lichttype</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {lightTypes.map((lt) => (
              <button
                key={lt}
                onClick={() => onChange({ type: lt, control: CONTROLS_FOR_TYPE[lt][0]?.auto ? CONTROLS_FOR_TYPE[lt][0].id : null })}
                className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  config.type === lt
                    ? 'bg-lx-panel-bg border-lx-cta text-lx-cta'
                    : 'bg-white border-black/10 text-lx-text-primary hover:border-lx-cta/50'
                }`}
              >
                <span className="text-[13px] font-bold">{LIGHT_TYPE_LABELS[lt]}</span>
                <span className="text-[10.5px] text-lx-text-secondary leading-tight">{LIGHT_TYPE_DESCRIPTIONS[lt]}</span>
              </button>
            ))}
          </div>

          {/* Bediening */}
          {config.type && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Bediening</p>
                {!config.control && !CONTROLS_FOR_TYPE[config.type][0]?.auto && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Verplicht</span>
                )}
              </div>

              {CONTROLS_FOR_TYPE[config.type][0]?.auto ? (
                <div className="relative flex items-center gap-3 p-3 bg-lx-panel-bg rounded-xl border border-black/8">
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-lx-icon-bg text-lx-cta">
                    +€{CONTROL_PRICES['afstandsbediening']}
                  </span>
                  <div className="text-lx-cta"><ControlIcon id="afstandsbediening" active={true} /></div>
                  <div className="pr-14">
                    <p className="text-[13px] font-semibold text-lx-text-primary">Afstandsbediening</p>
                    <p className="text-[11px] text-lx-text-secondary">RGB+W werkt altijd met afstandsbediening</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTROLS_FOR_TYPE[config.type].map((ctrl) => {
                    const price = CONTROL_PRICES[ctrl.id] ?? 0
                    const isActive = config.control === ctrl.id
                    return (
                      <button
                        key={ctrl.id}
                        onClick={() => onChange({ control: ctrl.id })}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-lx-panel-bg border-lx-cta text-lx-cta'
                            : 'bg-white border-black/10 text-lx-text-secondary hover:border-lx-cta/50 hover:text-lx-cta'
                        }`}
                      >
                        <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-lx-icon-bg text-lx-cta' : 'bg-lx-panel-bg text-lx-text-secondary'
                        }`}>
                          {price === 0 ? 'Inbegrepen' : `+€${price}`}
                        </span>
                        <ControlIcon id={ctrl.id} active={isActive} />
                        <span className="text-[11.5px] font-semibold text-center leading-tight text-lx-text-primary">{ctrl.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface StepVerlichtingProps {
  shape: ShapeSlug
  directLight: LightConfig
  indirectLight: LightConfig
  onDirectChange: (updates: Partial<LightConfig>) => void
  onIndirectChange: (updates: Partial<LightConfig>) => void
}

export default function StepVerlichting({
  shape,
  directLight,
  indirectLight,
  onDirectChange,
  onIndirectChange,
}: StepVerlichtingProps) {
  const directPositions = DIRECT_LIGHT_POSITIONS[shape] ?? []
  const indirectPositions = INDIRECT_LIGHT_POSITIONS[shape] ?? []

  const hasAnyLight = directPositions.length > 0 || indirectPositions.length > 0

  if (!hasAnyLight) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-lx-panel-bg flex items-center justify-center text-lx-text-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.3 6.4-5.5 7.5V18h-3v-1.5C7.3 15.4 5 12.5 5 9a7 7 0 0 1 7-7z"/></svg>
        </div>
        <p className="text-[14px] text-lx-text-secondary">Geen verlichtingsopties beschikbaar voor deze vorm.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {directPositions.length > 0 && (
        <>
          <LightSection
            title="Directe verlichting"
            positions={directPositions}
            config={directLight}
            onChange={onDirectChange}
          />
          {indirectPositions.length > 0 && <div className="border-t border-lx-divider" />}
        </>
      )}

      {indirectPositions.length > 0 && (
        <LightSection
          title="Indirecte verlichting"
          positions={indirectPositions}
          config={indirectLight}
          onChange={onIndirectChange}
        />
      )}
    </div>
  )
}

export type { LightConfig }
