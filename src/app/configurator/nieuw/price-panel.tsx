'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ShapeSlug,
  LightType,
  SHAPES,
  ORGANIC_SIZES,
  LIGHT_TYPE_LABELS,
  EXTRA_OPTIONS,
  calcTotalPrice,
  calcBasePrice,
} from '@/lib/configurator-config'
import { LightConfig } from './step-verlichting'

// Mirror preview SVG
function MirrorPreview({ shape, width, height, diameter, organicSizeKey, directPosition, indirectPosition }: {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  directPosition: string
  indirectPosition: string
}) {
  const CANVAS = 200
  const PAD = 20
  const available = CANVAS - PAD * 2

  let previewEl: React.ReactNode = null

  if (shape === 'rechthoek') {
    const ratio = Math.min(available / width, available / height)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    const x = (CANVAS - w) / 2
    const y = (CANVAS - h) / 2
    const hasDirect = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    previewEl = (
      <>
        <rect x={x} y={y} width={w} height={h} rx="3" fill="#C8C4BE" opacity="0.35" />
        <rect x={x} y={y} width={w} height={h} rx="3" fill="none" stroke="#B0ABA4" strokeWidth="1.5" />
        {/* Glow direct */}
        {hasDirect && (
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="5" fill="none"
            stroke="#FDE68A" strokeWidth="3" opacity="0.6" />
        )}
        {/* Glow indirect */}
        {hasIndirect && (
          <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="8" fill="none"
            stroke="#FDE68A" strokeWidth="2" opacity="0.35" strokeDasharray="4 2" />
        )}
        {/* Shimmer */}
        <line x1={x + w * 0.25} y1={y + h * 0.1} x2={x + w * 0.55} y2={y + h * 0.6}
          stroke="white" strokeWidth="8" opacity="0.12" strokeLinecap="round" />
        <line x1={x + w * 0.5} y1={y + h * 0.05} x2={x + w * 0.65} y2={y + h * 0.45}
          stroke="white" strokeWidth="4" opacity="0.1" strokeLinecap="round" />
      </>
    )
  } else if (shape === 'rond') {
    const d = diameter ?? 60
    const r = Math.min(available / 2, d)
    const hasDirect = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    previewEl = (
      <>
        <circle cx={CANVAS / 2} cy={CANVAS / 2} r={r} fill="#C8C4BE" opacity="0.35" />
        <circle cx={CANVAS / 2} cy={CANVAS / 2} r={r} fill="none" stroke="#B0ABA4" strokeWidth="1.5" />
        {hasDirect && <circle cx={CANVAS / 2} cy={CANVAS / 2} r={r + 4} fill="none" stroke="#FDE68A" strokeWidth="3" opacity="0.6" />}
        {hasIndirect && <circle cx={CANVAS / 2} cy={CANVAS / 2} r={r + 8} fill="none" stroke="#FDE68A" strokeWidth="2" opacity="0.35" strokeDasharray="4 2" />}
        <line x1={CANVAS / 2 - r * 0.2} y1={CANVAS / 2 - r * 0.5} x2={CANVAS / 2 + r * 0.3} y2={CANVAS / 2 + r * 0.4}
          stroke="white" strokeWidth="8" opacity="0.12" strokeLinecap="round" />
      </>
    )
  } else if (shape === 'organic') {
    previewEl = (
      <>
        <path d="M100 26 C140 26 170 52 168 88 C166 124 140 170 98 168 C56 166 28 138 30 100 C32 62 60 26 100 26Z"
          fill="#C8C4BE" opacity="0.35" />
        <path d="M100 26 C140 26 170 52 168 88 C166 124 140 170 98 168 C56 166 28 138 30 100 C32 62 60 26 100 26Z"
          fill="none" stroke="#B0ABA4" strokeWidth="1.5" />
        {indirectPosition !== 'geen' && (
          <path d="M100 18 C144 18 178 46 176 88 C174 130 144 178 98 176 C52 174 20 144 22 100 C24 56 56 18 100 18Z"
            fill="none" stroke="#FDE68A" strokeWidth="2" opacity="0.4" strokeDasharray="4 2" />
        )}
        <line x1="75" y1="55" x2="115" y2="125" stroke="white" strokeWidth="8" opacity="0.12" strokeLinecap="round" />
      </>
    )
  } else {
    previewEl = (
      <>
        <rect x="30" y="50" width="140" height="100" rx="4" fill="none" stroke="#B0ABA4" strokeWidth="1.5" strokeDasharray="6 3" />
        <text x="100" y="105" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontWeight="500">Op aanvraag</text>
      </>
    )
  }

  return (
    <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      {previewEl}
    </svg>
  )
}

// Animated price display
function AnimatedPrice({ price }: { price: number }) {
  const [display, setDisplay] = useState(price)
  const [delta, setDelta] = useState<number | null>(null)
  const prevRef = useRef(price)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const diff = price - prevRef.current
    if (diff !== 0) {
      setDelta(diff)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDelta(null), 900)
    }
    prevRef.current = price
    setDisplay(price)
  }, [price])

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[28px] font-bold text-[#1A1A1A]">
        €{display.toLocaleString('nl-NL')}
      </span>
      {delta !== null && (
        <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
          delta > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
          {delta > 0 ? '+' : ''}{delta.toLocaleString('nl-NL')}
        </span>
      )}
    </div>
  )
}

interface PricePanelProps {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
}

const LIGHT_PRICES: Record<LightType, number> = { '3000k': 120, '4000k': 130, rgbw: 195, cct: 165 }

export default function PricePanel({
  shape, width, height, diameter, organicSizeKey,
  directLight, indirectLight, selectedOptions,
}: PricePanelProps) {
  const total = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey,
    directPosition: directLight.position,
    directType: directLight.type,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    selectedOptions,
  })

  const basePrice = calcBasePrice(shape, width, height, diameter ?? undefined, organicSizeKey ?? undefined)
  const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? ''

  const lineItems: { label: string; price: number }[] = []

  // Afmeting label
  let dimLabel = ''
  if (shape === 'rechthoek') dimLabel = `${width} × ${height} cm`
  else if (shape === 'rond') dimLabel = diameter ? `⌀ ${diameter} cm` : ''
  else if (shape === 'organic') dimLabel = ORGANIC_SIZES.find(s => s.key === organicSizeKey)?.label ?? ''

  if (basePrice > 0) {
    lineItems.push({ label: `${shapeName}${dimLabel ? ' · ' + dimLabel : ''}`, price: basePrice })
  }

  if (directLight.position !== 'geen' && directLight.type) {
    lineItems.push({ label: `Directe verlichting (${LIGHT_TYPE_LABELS[directLight.type]})`, price: LIGHT_PRICES[directLight.type] })
  }
  if (indirectLight.position !== 'geen' && indirectLight.type) {
    lineItems.push({ label: `Indirecte verlichting (${LIGHT_TYPE_LABELS[indirectLight.type]})`, price: LIGHT_PRICES[indirectLight.type] })
  }
  for (const optId of selectedOptions) {
    const opt = EXTRA_OPTIONS.find(o => o.id === optId)
    if (opt) lineItems.push({ label: opt.name, price: opt.price })
  }

  return (
    <div className="sticky top-6 space-y-4">
      {/* Preview kaart */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 flex flex-col items-center">
        <MirrorPreview
          shape={shape}
          width={width}
          height={height}
          diameter={diameter}
          organicSizeKey={organicSizeKey}
          directPosition={directLight.position}
          indirectPosition={indirectLight.position}
        />
      </div>

      {/* Prijs kaart */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Netto inkoopprijs</p>
          <AnimatedPrice price={total} />
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Excl. btw</p>
        </div>

        {lineItems.length > 0 && (
          <div className="space-y-1.5 border-t border-[#F0EDE8] pt-3">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between gap-2 text-[12px]">
                <span className="text-[#6B7280] truncate">{item.label}</span>
                <span className="text-[#1A1A1A] font-semibold flex-shrink-0">€{item.price.toLocaleString('nl-NL')}</span>
              </div>
            ))}
            <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-[#F0EDE8] mt-1.5">
              <span className="text-[#1A1A1A]">Totaal</span>
              <span className="text-[#3D6B4F]">€{total.toLocaleString('nl-NL')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
