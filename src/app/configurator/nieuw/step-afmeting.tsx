'use client'

import { useState, useEffect } from 'react'
import {
  ShapeSlug,
  GlasKleur,
  ROND_DIAMETERS,
  ORGANIC_SIZES,
  RECHTHOEK_CONSTRAINTS,
  GLAS_KLEUREN,
} from '@/lib/configurator-config'

interface StepAfmetingProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur: GlasKleur
  onChange: (updates: Partial<{
    width: number
    height: number
    diameter: number | null
    organicSizeKey: string | null
    glasKleur: GlasKleur
  }>) => void
}

function GlaskleurPicker({ glasKleur, onChange }: { glasKleur: GlasKleur; onChange: (k: GlasKleur) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Glaskleur</p>
      <div className="flex gap-3">
        {GLAS_KLEUREN.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(g.id)}
            className={`flex flex-col items-center gap-1.5 group transition-all`}
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
}

function DimInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const { min, max } = RECHTHOEK_CONSTRAINTS
  const [raw, setRaw] = useState(String(value))

  // Sync wanneer waarde extern verandert (preset-knop, +/-)
  useEffect(() => { setRaw(String(value)) }, [value])

  function commit(str: string) {
    const v = Math.min(max, Math.max(min, parseInt(str) || min))
    onChange(v)
    setRaw(String(v))
  }

  const parsed = parseInt(raw)
  const isValid = !isNaN(parsed) && parsed >= min && parsed <= max

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
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
          onClick={() => onChange(Math.min(max, value + 1))}
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
}

export default function StepAfmeting({ shape, width, height, diameter, organicSizeKey, glasKleur, onChange }: StepAfmetingProps) {
  if (shape === 'rechthoek') {
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
                {p.w} × {p.h}
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
          <DimInput label="Breedte" value={width} onChange={(v) => onChange({ width: v })} />
          <DimInput label="Hoogte" value={height} onChange={(v) => onChange({ height: v })} />
        </div>

        <p className="text-[12px] text-lx-text-secondary">
          Minimale afmeting: {RECHTHOEK_CONSTRAINTS.min} cm — Maximale afmeting: {RECHTHOEK_CONSTRAINTS.max} cm
        </p>
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
