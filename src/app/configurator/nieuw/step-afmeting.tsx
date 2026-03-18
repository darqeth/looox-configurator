'use client'

import {
  ShapeSlug,
  ROND_DIAMETERS,
  ORGANIC_SIZES,
  RECHTHOEK_CONSTRAINTS,
} from '@/lib/configurator-config'

interface StepAfmetingProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  onChange: (updates: Partial<{
    width: number
    height: number
    diameter: number | null
    organicSizeKey: string | null
  }>) => void
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
  const isValid = value >= min && value <= max

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-xl bg-[#F5F3EF] border border-black/8 text-[#1A1A1A] text-lg font-light hover:bg-[#EDE9E3] transition-colors flex items-center justify-center flex-shrink-0"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const v = parseInt(e.target.value) || min
              onChange(Math.min(max, Math.max(min, v)))
            }}
            className={`w-full h-9 rounded-xl border text-center text-[14px] font-semibold text-[#1A1A1A] outline-none transition-colors bg-white ${
              isValid ? 'border-black/12 focus:border-[#3D6B4F]' : 'border-red-400 bg-red-50'
            }`}
          />
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-xl bg-[#F5F3EF] border border-black/8 text-[#1A1A1A] text-lg font-light hover:bg-[#EDE9E3] transition-colors flex items-center justify-center flex-shrink-0"
        >
          +
        </button>
        <span className="text-[13px] text-[#6B7280] font-medium w-6">cm</span>
      </div>
      {!isValid && (
        <p className="text-[11px] text-red-500">Min. {min} cm — Max. {max} cm</p>
      )}
    </div>
  )
}

export default function StepAfmeting({ shape, width, height, diameter, organicSizeKey, onChange }: StepAfmetingProps) {
  if (shape === 'rechthoek') {
    const presets = [
      { w: 60, h: 80 }, { w: 80, h: 60 }, { w: 100, h: 70 },
      { w: 60, h: 120 }, { w: 80, h: 120 }, { w: 100, h: 80 },
    ]
    const isPreset = presets.some(p => p.w === width && p.h === height)

    return (
      <div className="space-y-6">
        <div>
          <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Snelle keuze</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={`${p.w}x${p.h}`}
                onClick={() => onChange({ width: p.w, height: p.h })}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                  width === p.w && height === p.h
                    ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]'
                    : 'bg-white text-[#1A1A1A] border-black/12 hover:border-[#3D6B4F] hover:text-[#3D6B4F]'
                }`}
              >
                {p.w} × {p.h}
              </button>
            ))}
            <button
              onClick={() => onChange({ width: 80, height: 60 })}
              className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                !isPreset
                  ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]'
                  : 'bg-white text-[#1A1A1A] border-black/12 hover:border-[#3D6B4F]'
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

        <p className="text-[12px] text-[#9CA3AF]">
          Minimale afmeting: {RECHTHOEK_CONSTRAINTS.min} cm — Maximale afmeting: {RECHTHOEK_CONSTRAINTS.max} cm
        </p>
      </div>
    )
  }

  if (shape === 'rond') {
    return (
      <div className="space-y-4">
        <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Diameter</p>
        <div className="flex flex-wrap gap-2">
          {ROND_DIAMETERS.map((d) => (
            <button
              key={d}
              onClick={() => onChange({ diameter: d })}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                diameter === d
                  ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]'
                  : 'bg-white text-[#1A1A1A] border-black/12 hover:border-[#3D6B4F] hover:text-[#3D6B4F]'
              }`}
            >
              ⌀ {d} cm
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (shape === 'organic') {
    return (
      <div className="space-y-4">
        <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Afmeting</p>
        <div className="flex flex-wrap gap-2">
          {ORGANIC_SIZES.map((s) => (
            <button
              key={s.key}
              onClick={() => onChange({ organicSizeKey: s.key })}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                organicSizeKey === s.key
                  ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]'
                  : 'bg-white text-[#1A1A1A] border-black/12 hover:border-[#3D6B4F] hover:text-[#3D6B4F]'
              }`}
            >
              {s.label}
            </button>
          ))}
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
      <p className="text-[12px] text-[#9CA3AF]">
        Vul de gewenste afmeting in. Wij nemen contact op als de maat buiten het standaard assortiment valt.
      </p>
    </div>
  )
}
