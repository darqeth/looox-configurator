'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Glasdikte, GLASDIKTES, AFMETING_MIN, AFMETING_MAX } from '@/lib/projectspiegel-config'

interface StepAfmetingProps {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  onChange: (updates: Partial<{ lengte: number; hoogte: number; glasdikte: Glasdikte }>) => void
}


const DimInput = memo(function DimInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setRaw(String(value)) }, [value])

  function commit(str: string) {
    const v = Math.min(AFMETING_MAX, Math.max(AFMETING_MIN, parseInt(str) || AFMETING_MIN))
    onChange(v)
    setRaw(String(v))
  }

  const step = useCallback((next: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(next), 150)
  }, [onChange])

  const parsed = parseInt(raw)
  const isValid = !isNaN(parsed) && parsed >= AFMETING_MIN && parsed <= AFMETING_MAX

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => step(Math.max(AFMETING_MIN, value - 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >−</button>
        <div className="relative flex-1">
          <input
            type="number"
            value={raw}
            min={AFMETING_MIN}
            max={AFMETING_MAX}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(raw) }}
            className={`w-full h-9 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none transition-colors bg-white ${
              isValid ? 'border-black/12 focus:border-lx-cta' : 'border-red-400 bg-red-50'
            }`}
          />
        </div>
        <button
          onClick={() => step(Math.min(AFMETING_MAX, value + 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >+</button>
        <span className="text-[13px] text-lx-text-secondary font-medium w-6">cm</span>
      </div>
      {!isValid && <p className="text-[11px] text-red-500">Min. {AFMETING_MIN} cm — Max. {AFMETING_MAX} cm</p>}
    </div>
  )
})

export default function StepAfmeting({ lengte, hoogte, glasdikte, onChange }: StepAfmetingProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <DimInput label="Lengte" value={lengte} onChange={(v) => onChange({ lengte: v })} />
        <DimInput label="Hoogte" value={hoogte} onChange={(v) => onChange({ hoogte: v })} />
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Glasdikte</p>
        <div className="flex gap-2">
          {GLASDIKTES.map((d) => (
            <button
              key={d}
              onClick={() => onChange({ glasdikte: d })}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                glasdikte === d
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
              }`}
            >
              {d} mm
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-lx-text-secondary">
        Minimale afmeting: {AFMETING_MIN} cm — Maximale afmeting: {AFMETING_MAX} cm
      </p>
    </div>
  )
}
