'use client'

import {
  ShapeSlug,
  LightType,
  DIRECT_LIGHT_POSITIONS,
  INDIRECT_LIGHT_POSITIONS,
  POSITION_LABELS,
  LIGHT_TYPE_LABELS,
  LIGHT_TYPE_DESCRIPTIONS,
  CONTROLS_FOR_TYPE,
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

const CONTROL_ICONS: Record<string, React.ReactNode> = {
  'externe-schakeling': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  'tip-touch': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11V6a3 3 0 0 1 6 0v5"/><path d="M12 14v3"/><path d="M9 17h6"/><path d="M7 11h10v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-6Z"/></svg>
  ),
  '3-staps-dimmer': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11V6a3 3 0 0 1 6 0v5"/><path d="M7 11h10v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-6Z"/><path d="m9 15 1.5 1.5 3-3"/></svg>
  ),
  'wip-schakelaar': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="12"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
  ),
  'motion-sensor': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12s2.3-4 7-4 7 4 7 4"/><path d="M5 12s2.3 4 7 4 7-4 7-4"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  'afstandsbediening': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
  ),
}

function LightSection({ title, positions, config, onChange }: LightSectionProps) {
  const lightTypes: LightType[] = ['3000k', '4000k', 'rgbw', 'cct']

  if (positions.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-semibold text-[#1A1A1A]">{title}</p>

      {/* Positie */}
      <div className="flex flex-wrap gap-2">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => onChange({ position: pos, type: pos === 'geen' ? null : config.type, control: pos === 'geen' ? null : config.control })}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
              config.position === pos
                ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]'
                : 'bg-white text-[#1A1A1A] border-black/12 hover:border-[#3D6B4F] hover:text-[#3D6B4F]'
            }`}
          >
            {POSITION_LABELS[pos]}
          </button>
        ))}
      </div>

      {/* Lichttype */}
      {config.position !== 'geen' && (
        <div className="pl-0.5 space-y-3">
          <p className="text-[11.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Lichttype</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {lightTypes.map((lt) => (
              <button
                key={lt}
                onClick={() => onChange({ type: lt, control: CONTROLS_FOR_TYPE[lt][0]?.auto ? CONTROLS_FOR_TYPE[lt][0].id : null })}
                className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  config.type === lt
                    ? 'bg-[#3D6B4F]/8 border-[#3D6B4F] text-[#3D6B4F]'
                    : 'bg-white border-black/10 text-[#1A1A1A] hover:border-[#3D6B4F]/50'
                }`}
              >
                <span className="text-[13px] font-bold">{LIGHT_TYPE_LABELS[lt]}</span>
                <span className="text-[10.5px] text-[#9CA3AF] leading-tight">{LIGHT_TYPE_DESCRIPTIONS[lt]}</span>
              </button>
            ))}
          </div>

          {/* Bediening */}
          {config.type && (
            <div className="space-y-3 pt-1">
              <p className="text-[11.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Bediening</p>

              {CONTROLS_FOR_TYPE[config.type][0]?.auto ? (
                <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-xl border border-black/8">
                  <div className="text-[#3D6B4F]">{CONTROL_ICONS['afstandsbediening']}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">Afstandsbediening</p>
                    <p className="text-[11px] text-[#9CA3AF]">RGB+W werkt altijd met afstandsbediening</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTROLS_FOR_TYPE[config.type].map((ctrl) => (
                    <button
                      key={ctrl.id}
                      onClick={() => onChange({ control: ctrl.id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        config.control === ctrl.id
                          ? 'bg-[#3D6B4F]/8 border-[#3D6B4F] text-[#3D6B4F]'
                          : 'bg-white border-black/10 text-[#6B7280] hover:border-[#3D6B4F]/50 hover:text-[#3D6B4F]'
                      }`}
                    >
                      {CONTROL_ICONS[ctrl.id] ?? <div className="w-7 h-7" />}
                      <span className="text-[11.5px] font-semibold text-center leading-tight text-[#1A1A1A]">{ctrl.name}</span>
                    </button>
                  ))}
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
        <div className="w-12 h-12 rounded-full bg-[#F5F3EF] flex items-center justify-center text-[#9CA3AF]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.3 6.4-5.5 7.5V18h-3v-1.5C7.3 15.4 5 12.5 5 9a7 7 0 0 1 7-7z"/></svg>
        </div>
        <p className="text-[14px] text-[#6B7280]">Geen verlichtingsopties beschikbaar voor deze vorm.</p>
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
          {indirectPositions.length > 0 && <div className="border-t border-[#F0EDE8]" />}
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
