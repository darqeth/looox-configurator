'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import {
  ShapeSlug,
  GlasKleur,
  ROND_DIAMETERS,
  ORGANIC_SIZES,
  RECHTHOEK_CONSTRAINTS,
  GLAS_KLEUREN,
  LUNA_CATALOGUS,
  computeSolRestmaten,
  computeLunaRestmaten,
} from '@/lib/configurator-config'

interface StepAfmetingProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur: GlasKleur
  solMeubelHoogte: number
  solOnderkant: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstand?: number
  lunaMuurZijde?: 'links' | 'rechts'
  onChange: (updates: Partial<{
    width: number
    height: number
    diameter: number | null
    organicSizeKey: string | null
    glasKleur: GlasKleur
    solMeubelHoogte: number
    solOnderkant: number
    lunaMeubelHoogte?: number
    lunaOnderkant?: number
    lunaAfstand?: number
    lunaMuurZijde?: 'links' | 'rechts'
  }>) => void
}

// Berekende reststukken bij Sol/Luna — hulp bij het bestellen van het meubel.
// Read-only resultaten, visueel onderscheiden van de invoervelden.
const RestmatenKaart = memo(function RestmatenKaart({ rest }: {
  rest: { bovendeelHoogte: number; meubelVlakBreedte: number; valid: boolean }
}) {
  return (
    <div className="rounded-xl border border-lx-cta/25 bg-lx-icon-bg/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-lx-text-secondary mb-3">
        Reststukken <span className="font-medium normal-case tracking-normal text-lx-placeholder">· automatisch berekend</span>
      </p>
      {rest.valid ? (
        <div className="grid grid-cols-2 gap-4">
          <RestmaatItem
            value={rest.bovendeelHoogte}
            label="Hoogte bovendeel"
            hint="Het ronde deel dat boven je meubel uitkomt"
            icon="height"
          />
          <RestmaatItem
            value={rest.meubelVlakBreedte}
            label="Breedte op meubel"
            hint="Zo breed moet je meubel minimaal zijn"
            icon="width"
          />
        </div>
      ) : (
        <p className="text-[11.5px] text-amber-600 leading-snug">
          Het meubel is hoger dan de spiegel — er blijft geen bovendeel over. Verlaag de meubelhoogte of kies een grotere diameter.
        </p>
      )}
    </div>
  )
})

function RestmaatItem({ value, label, hint, icon }: { value: number; label: string; hint: string; icon: 'height' | 'width' }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-lx-cta mb-1">
        {icon === 'height' ? (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v12M8 2L5 5M8 2l3 3M8 14l-3-3M8 14l3-3" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8h12M2 8l3-3M2 8l3 3M14 8l-3-3M14 8l-3 3" />
          </svg>
        )}
        <span className="text-[10.5px] font-semibold uppercase tracking-wide">{icon === 'height' ? 'Hoogte' : 'Breedte'}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[24px] font-bold text-lx-text-primary tabular-nums leading-none">{value}</span>
        <span className="text-[12px] text-lx-text-secondary">cm</span>
      </div>
      <p className="text-[11.5px] font-semibold text-lx-text-primary mt-1.5">{label}</p>
      <p className="text-[10.5px] text-lx-text-secondary leading-snug">{hint}</p>
    </div>
  )
}

const GlaskleurPicker = memo(function GlaskleurPicker({ glasKleur, onChange }: { glasKleur: GlasKleur; onChange: (k: GlasKleur) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Glaskleur</p>
      <div className="flex gap-5">
        {GLAS_KLEUREN.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(g.id)}
            className={`flex flex-col items-center gap-1.5 group transition-all w-20`}
          >
            <span
              className={`block w-10 h-10 rounded-xl border-2 transition-all ${
                glasKleur === g.id
                  ? 'border-lx-cta scale-110 shadow-md'
                  : 'border-black/12 hover:border-lx-cta/50 hover:scale-105'
              }`}
              style={{ backgroundColor: g.color }}
            />
            <span className={`text-[11px] font-semibold transition-colors ${
              glasKleur === g.id ? 'text-lx-cta' : 'text-lx-text-secondary'
            }`}>
              {g.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
})

const DimInput = memo(function DimInput({
  label,
  value,
  onChange,
  maxOverride,
  minOverride,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  maxOverride?: number
  minOverride?: number
}) {
  const { min: baseMin, max: baseMax } = RECHTHOEK_CONSTRAINTS
  const min = minOverride ?? baseMin
  const max = maxOverride !== undefined ? Math.min(baseMax, maxOverride) : baseMax
  const [raw, setRaw] = useState(String(value))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync wanneer waarde extern verandert (preset-knop, +/-)
  useEffect(() => { setRaw(String(value)) }, [value])

  function commit(str: string) {
    const parsed = parseInt(str)
    const v = Math.min(max, Math.max(min, isNaN(parsed) ? min : parsed))
    onChange(v)
    setRaw(String(v))
  }

  const debouncedStep = useCallback((next: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(next), 150)
  }, [onChange])

  const parsed = parseInt(raw)
  const isValid = !isNaN(parsed) && parsed >= min && parsed <= max

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => debouncedStep(Math.max(min, value - 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            value={raw}
            min={min}
            max={max}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(raw) }}
            className={`w-full h-9 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none transition-colors bg-white ${
              isValid ? 'border-black/12 focus:border-lx-cta' : 'border-red-400 bg-red-50'
            }`}
          />
        </div>
        <button
          onClick={() => debouncedStep(Math.min(max, value + 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >
          +
        </button>
        <span className="text-[13px] text-lx-text-secondary font-medium w-6">cm</span>
      </div>
      {!isValid && (
        <p className="text-[11px] text-red-500">Min. {min} cm — Max. {max} cm</p>
      )}
    </div>
  )
})

export default function StepAfmeting({ shape, width, height, diameter, organicSizeKey, glasKleur, solMeubelHoogte, solOnderkant, lunaMeubelHoogte, lunaOnderkant, lunaAfstand, lunaMuurZijde, onChange }: StepAfmetingProps) {
  if (shape === 'rechthoek' || shape === 'rounded-rect' || shape === 'ovaal' || shape === 'arc') {
    const presets = [
      { w: 60, h: 80 }, { w: 80, h: 60 }, { w: 100, h: 70 },
      { w: 60, h: 120 }, { w: 80, h: 120 }, { w: 100, h: 80 },
    ]
    const isPreset = presets.some(p => p.w === width && p.h === height)

    return (
      <div className="space-y-6">
        <div>
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">Snelle keuze</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={`${p.w}x${p.h}`}
                onClick={() => onChange({ width: p.w, height: p.h })}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                  width === p.w && height === p.h
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                B {p.w} × H {p.h}
              </button>
            ))}
            <button
              onClick={() => onChange({ width: 80, height: 60 })}
              className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                !isPreset
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta'
              }`}
            >
              Maatwerk
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DimInput
            label="Breedte"
            value={width}
            onChange={(v) => onChange({ width: v })}
            maxOverride={shape === 'arc' ? height * 2 : undefined}
          />
          <DimInput
            label="Hoogte"
            value={height}
            onChange={(v) => {
              const updates: Parameters<typeof onChange>[0] = { height: v }
              if (shape === 'arc' && width > v * 2) updates.width = v * 2
              onChange(updates)
            }}
          />
        </div>

        {shape === 'arc' && (
          <p className="text-[12px] text-lx-text-secondary">
            Boog: breedte max. 2× hoogte ({height * 2} cm) — Min. {RECHTHOEK_CONSTRAINTS.min} cm, Max. {RECHTHOEK_CONSTRAINTS.max} cm
          </p>
        )}
        {shape !== 'arc' && (
          <p className="text-[12px] text-lx-text-secondary">
            Minimale afmeting: {RECHTHOEK_CONSTRAINTS.min} cm — Maximale afmeting: {RECHTHOEK_CONSTRAINTS.max} cm
          </p>
        )}
        <div className="border-t border-lx-divider pt-5">
          <GlaskleurPicker glasKleur={glasKleur} onChange={(k) => onChange({ glasKleur: k })} />
        </div>
      </div>
    )
  }

  if (shape === 'rond') {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Diameter</p>
          <div className="flex flex-wrap gap-2">
            {ROND_DIAMETERS.map((d) => (
              <button
                key={d}
                onClick={() => onChange({ diameter: d })}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  diameter === d
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                ⌀ {d} cm
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-lx-divider pt-5">
          <GlaskleurPicker glasKleur={glasKleur} onChange={(k) => onChange({ glasKleur: k })} />
        </div>
      </div>
    )
  }

  if (shape === 'organic') {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Afmeting</p>
          <div className="flex flex-wrap gap-2">
            {ORGANIC_SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => onChange({ organicSizeKey: s.key })}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  organicSizeKey === s.key
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-lx-divider pt-5">
          <GlaskleurPicker glasKleur={glasKleur} onChange={(k) => onChange({ glasKleur: k })} />
        </div>
      </div>
    )
  }

  if (shape === 'sol') {
    const SOL_DIAMETERS = [60, 70, 80, 90, 100, 120, 140, 160, 180, 200]
    const extraDeelTeBestellen = solOnderkant >= 15
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Diameter</p>
          <div className="flex flex-wrap gap-2">
            {SOL_DIAMETERS.map((d) => (
              <button
                key={d}
                onClick={() => onChange({ diameter: d })}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  diameter === d
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                ⌀ {d} cm
              </button>
            ))}
          </div>
        </div>
        <DimInput
          label="Meubel hoogte"
          value={solMeubelHoogte}
          onChange={(v) => onChange({ solMeubelHoogte: v })}
          minOverride={15}
          maxOverride={80}
        />
        <div>
          <DimInput
            label="Uitsteek onder meubel"
            value={solOnderkant}
            onChange={(v) => onChange({ solOnderkant: v })}
            minOverride={0}
            maxOverride={30}
          />
          {!extraDeelTeBestellen && solOnderkant > 0 && (
            <p className="text-[11px] text-amber-600 mt-1.5">
              Uitsteek is minder dan 15 cm — het extra onderste deel kan niet meebesteld worden.
            </p>
          )}
        </div>
        <RestmatenKaart rest={computeSolRestmaten(diameter ?? 80, solMeubelHoogte, solOnderkant)} />
        <div className="border-t border-lx-divider pt-5">
          <GlaskleurPicker glasKleur={glasKleur} onChange={(k) => onChange({ glasKleur: k })} />
        </div>
      </div>
    )
  }

  if (shape === 'luna') {
    const LUNA_DIAMETERS = [60, 70, 80, 90, 100, 120, 140, 160, 180, 200]
    const extraDeelTeBestellen = (lunaOnderkant ?? 0) >= 15
    const zijde = lunaMuurZijde ?? 'links'
    const afstand = lunaAfstand ?? 20
    const zichtbareBreedte = (diameter ?? 0) - afstand
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Diameter</p>
          <div className="flex flex-wrap gap-2">
            {LUNA_DIAMETERS.map((d) => (
              <button
                key={d}
                onClick={() => onChange({ diameter: d })}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  diameter === d
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                ⌀ {d} cm
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <DimInput
            label="Meubel hoogte"
            value={lunaMeubelHoogte ?? 35}
            onChange={(v) => onChange({ lunaMeubelHoogte: v })}
            minOverride={15}
            maxOverride={80}
          />
          <p className="text-[11.5px] text-lx-text-muted">
            Bepaalt prijs extra deel:{' '}
            {(lunaMeubelHoogte ?? 35) <= 30
              ? `≤ 30 cm → +€${LUNA_CATALOGUS.extraDeel30}`
              : `> 30 cm → +€${LUNA_CATALOGUS.extraDeel35}`}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Muurzijde</p>
          <div className="flex gap-2">
            {(['links', 'rechts'] as const).map((z) => (
              <button
                key={z}
                onClick={() => onChange({ lunaMuurZijde: z })}
                className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-all capitalize ${
                  zijde === z
                    ? 'bg-lx-cta text-white border-lx-cta'
                    : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
                }`}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <DimInput
          label="Afstand tot muur"
          value={afstand}
          onChange={(v) => onChange({ lunaAfstand: v })}
          minOverride={0}
          maxOverride={Math.floor((diameter ?? 160) / 2) - 5}
        />
        <p className="text-[11px] text-lx-text-secondary">
          Zichtbare breedte: {zichtbareBreedte} cm
        </p>
        <div>
          <DimInput
            label="Uitsteek onder meubel"
            value={lunaOnderkant ?? 15}
            onChange={(v) => onChange({ lunaOnderkant: v })}
            minOverride={0}
            maxOverride={30}
          />
          {!extraDeelTeBestellen && (lunaOnderkant ?? 0) > 0 && (
            <p className="text-[11px] text-amber-600 mt-1.5">
              Uitsteek is minder dan 15 cm — het extra onderste deel kan niet meebesteld worden.
            </p>
          )}
        </div>
        <RestmatenKaart rest={computeLunaRestmaten(diameter ?? 90, lunaMeubelHoogte ?? 35, lunaOnderkant ?? 15, afstand)} />
        <div className="border-t border-lx-divider pt-5">
          <GlaskleurPicker glasKleur={glasKleur} onChange={(k) => onChange({ glasKleur: k })} />
        </div>
      </div>
    )
  }

  // Op aanvraag
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <DimInput label="Breedte" value={width} onChange={(v) => onChange({ width: v })} />
        <DimInput label="Hoogte" value={height} onChange={(v) => onChange({ height: v })} />
      </div>
      <p className="text-[12px] text-lx-text-secondary">
        Vul de gewenste afmeting in. Wij nemen contact op als de maat buiten het standaard assortiment valt.
      </p>
    </div>
  )
}
