'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ShapeSlug,
  GlasKleur,
  SHAPES,
  ORGANIC_SIZES,
  GLAS_KLEUREN,
  LIGHT_TYPE_LABELS,
  EXTRA_OPTIONS,
  calcTotalPrice,
  calcBasePrice,
  calcGlasKosten,
  calcDirectLEDMeters,
  calcIndirectLEDMeters,
  calcHeatingPrice,
  CONTROL_PRICES,
} from '@/lib/configurator-config'
import { LightConfig } from './step-verlichting'

// Mirror preview SVG
function MirrorPreview({ shape, width, height, diameter, directPosition, indirectPosition }: {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey?: string | null
  directPosition: string
  indirectPosition: string
}) {
  const CANVAS = 220
  const PAD = 28
  const available = CANVAS - PAD * 2
  const cx = CANVAS / 2
  const cy = CANVAS / 2

  // Direct light: warm glow OUTSIDE the mirror (LED achter spiegel schijnt tegen muur)
  // Indirect light: frosted/sandblasted band INSIDE the mirror glass

  if (shape === 'rechthoek') {
    const ratio = Math.min(available / width, available / height)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    const x = (CANVAS - w) / 2
    const y = (CANVAS - h) / 2

    // Baan is 2cm dik, proportioneel op werkelijke afmeting
    const bandH = Math.max(3, Math.round(2 * (h / height)))
    const bandW = Math.max(3, Math.round(2 * (w / width)))

    // Marge horizontale banden (boven/onder): 10cm van zijkanten, 5cm van boven/onder
    const offX = Math.round(10 * (w / width))
    const offY = Math.round(5 * (h / height))
    // Marge verticale banden (links/rechts): 5cm van de zijkanten, 5cm van boven/onder
    const offXV = Math.round(5 * (w / width))

    // Direct: which sides have sandblasted bands INSIDE the glass
    const dirTop    = ['boven', 'boven-beneden', 'rondom'].includes(directPosition)
    const dirBottom = ['boven-beneden', 'onder', 'rondom'].includes(directPosition)
    const dirLeft   = ['links-rechts', 'rondom'].includes(directPosition)
    const dirRight  = ['links-rechts', 'rondom'].includes(directPosition)

    // Indirect: which sides have warm glow OUTSIDE (LED achter glas op muur)
    const indTop    = ['boven', 'boven-beneden', 'rondom'].includes(indirectPosition)
    const indBottom = ['boven-beneden', 'onder', 'rondom'].includes(indirectPosition)
    const indLeft   = ['links-rechts', 'rondom'].includes(indirectPosition)
    const indRight  = ['links-rechts', 'rondom'].includes(indirectPosition)

    // Voor rondom direct: 5cm marge aan alle kanten
    const offR = Math.round(5 * Math.min(w / width, h / height))
    // Verticale banden (los): starten/eindigen na horizontale banden (geen hoek-overlap)
    const innerY = y + offY + (dirTop ? bandH : 0)
    const innerH = h - 2 * offY - (dirTop ? bandH : 0) - (dirBottom ? bandH : 0)

    return (
      <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="band-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <clipPath id="mirror-clip">
            <rect x={x} y={y} width={w} height={h} rx="2" />
          </clipPath>
          {/* Mask: gloed alleen BUITEN de spiegel zichtbaar */}
          <mask id="outside-mask">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="2" fill="black" />
          </mask>
        </defs>

        {/* ── Indirecte verlichting: warme gloed BUITEN op de muur ── */}
        <g mask="url(#outside-mask)">
          {indirectPosition === 'rondom' ? (
            // Rondom: continue gloed als outline, geen hoekgaten
            <rect x={x} y={y} width={w} height={h} rx="2" fill="none"
              stroke="#FEF3C7" strokeWidth="16" opacity="0.85" filter="url(#wall-glow)" />
          ) : (
            <>
              {indTop    && <rect x={x + 4} y={y - 14} width={w - 8} height={14} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow)" />}
              {indBottom && <rect x={x + 4} y={y + h}  width={w - 8} height={14} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow)" />}
              {indLeft   && <rect x={x - 14} y={y + 4} width={14} height={h - 8} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow)" />}
              {indRight  && <rect x={x + w}  y={y + 4} width={14} height={h - 8} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow)" />}
            </>
          )}
        </g>

        {/* ── Spiegel: glasplaat ── */}
        <rect x={x} y={y} width={w} height={h} rx="2" fill="#C8C4BE" opacity="0.38" />
        <rect x={x} y={y} width={w} height={h} rx="2" fill="none" stroke="#A8A39C" strokeWidth="1.5" />

        {/* ── Directe verlichting: gezandstraalde banen IN het glas ── */}
        {directPosition === 'rondom' ? (
          // Rondom: continue frame-baan als stroke, 5cm marge aan alle kanten
          <>
            <rect x={x + offR + bandH / 2} y={y + offR + bandH / 2}
              width={w - 2 * offR - bandH} height={h - 2 * offR - bandH}
              fill="none" stroke="white" strokeWidth={bandH} opacity="0.55" clipPath="url(#mirror-clip)" />
            <rect x={x + offR + bandH / 2} y={y + offR + bandH / 2}
              width={w - 2 * offR - bandH} height={h - 2 * offR - bandH}
              fill="none" stroke="white" strokeWidth={bandH} opacity="0.2" filter="url(#band-glow)" clipPath="url(#mirror-clip)" />
          </>
        ) : (
          <>
            {/* Bovenste balk */}
            {dirTop && (
              <>
                <rect x={x + offX} y={y + offY} width={w - 2 * offX} height={bandH} rx="1" fill="white" opacity="0.55" />
                <rect x={x + offX} y={y + offY} width={w - 2 * offX} height={bandH} rx="1" fill="white" opacity="0.2" filter="url(#band-glow)" />
              </>
            )}
            {/* Onderste balk */}
            {dirBottom && (
              <>
                <rect x={x + offX} y={y + h - bandH - offY} width={w - 2 * offX} height={bandH} rx="1" fill="white" opacity="0.55" />
                <rect x={x + offX} y={y + h - bandH - offY} width={w - 2 * offX} height={bandH} rx="1" fill="white" opacity="0.2" filter="url(#band-glow)" />
              </>
            )}
            {/* Linker balk */}
            {dirLeft && (
              <>
                <rect x={x + offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.55" />
                <rect x={x + offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.2" filter="url(#band-glow)" />
              </>
            )}
            {/* Rechter balk */}
            {dirRight && (
              <>
                <rect x={x + w - bandW - offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.55" />
                <rect x={x + w - bandW - offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.2" filter="url(#band-glow)" />
              </>
            )}
          </>
        )}

        {/* Spiegelglans */}
        <line x1={x + w * 0.25} y1={y + h * 0.1} x2={x + w * 0.52} y2={y + h * 0.58}
          stroke="white" strokeWidth="9" opacity="0.09" strokeLinecap="round" />
        <line x1={x + w * 0.5} y1={y + h * 0.05} x2={x + w * 0.65} y2={y + h * 0.42}
          stroke="white" strokeWidth="4" opacity="0.07" strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'rond') {
    const r = Math.min(available / 2, (diameter ?? 60) * 0.95)
    const bandW = Math.max(3, Math.round(2 * (r / ((diameter ?? 60) / 2))))
    // 5cm marge van de rand; stroke center zit op off5 + halve breedte naar binnen
    const off5 = Math.round(5 * (r / ((diameter ?? 60) / 2)))
    const bandR = r - off5 - bandW / 2

    const hasDirect   = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    return (
      <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-c" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="band-glow-c" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <clipPath id="circle-clip">
            <circle cx={cx} cy={cy} r={r - 1} />
          </clipPath>
          <mask id="outside-mask-c">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <circle cx={cx} cy={cy} r={r} fill="black" />
          </mask>
        </defs>

        {/* Indirecte verlichting: warme gloed rondom cirkel op muur */}
        {hasIndirect && (
          <circle cx={cx} cy={cy} r={r + 5} fill="none"
            stroke="#FEF3C7" strokeWidth="10" opacity="0.75" filter="url(#wall-glow-c)"
            mask="url(#outside-mask-c)" />
        )}

        {/* Spiegelglas */}
        <circle cx={cx} cy={cy} r={r} fill="#C8C4BE" opacity="0.38" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#A8A39C" strokeWidth="1.5" />

        {/* Directe verlichting: gezandstraalde baan rondom binnenin (5cm van rand) */}
        {hasDirect && (
          <>
            <circle cx={cx} cy={cy} r={bandR} fill="none"
              stroke="white" strokeWidth={bandW} opacity="0.5" clipPath="url(#circle-clip)" />
            <circle cx={cx} cy={cy} r={bandR} fill="none"
              stroke="white" strokeWidth={bandW} opacity="0.18" filter="url(#band-glow-c)" clipPath="url(#circle-clip)" />
          </>
        )}

        {/* Spiegelglans */}
        <line x1={cx - r * 0.2} y1={cy - r * 0.5} x2={cx + r * 0.28} y2={cy + r * 0.38}
          stroke="white" strokeWidth="9" opacity="0.09" strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'organic') {
    const mirrorPath = "M110 24 C148 24 176 50 174 88 C172 126 146 172 100 170 C54 168 26 140 28 100 C30 60 72 24 110 24Z"
    const indirectPath = "M110 32 C145 32 168 56 166 88 C164 120 140 162 100 162 C60 162 34 136 36 100 C38 64 75 32 110 32Z"
    const directPath = "M110 14 C152 14 184 44 182 88 C180 132 150 182 100 180 C50 178 18 146 20 100 C22 54 68 14 110 14Z"
    const hasDirect   = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    return (
      <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-o" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="band-glow-o" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <clipPath id="organic-clip">
            <path d={mirrorPath} />
          </clipPath>
          <mask id="outside-mask-o">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <path d={mirrorPath} fill="black" />
          </mask>
        </defs>

        {/* Indirecte verlichting: warme gloed rondom organic shape op muur */}
        {hasIndirect && (
          <path d={directPath} fill="#FEF3C7" opacity="0.5" filter="url(#wall-glow-o)"
            mask="url(#outside-mask-o)" />
        )}

        {/* Spiegelglas */}
        <path d={mirrorPath} fill="#C8C4BE" opacity="0.38" />
        <path d={mirrorPath} fill="none" stroke="#A8A39C" strokeWidth="1.5" />

        {/* Directe verlichting: gezandstraald rondom binnenin */}
        {hasDirect && (
          <>
            <path d={indirectPath} fill="none" stroke="white" strokeWidth="10" opacity="0.45" clipPath="url(#organic-clip)" />
            <path d={indirectPath} fill="none" stroke="white" strokeWidth="10" opacity="0.18" filter="url(#band-glow-o)" clipPath="url(#organic-clip)" />
          </>
        )}

        {/* Spiegelglans */}
        <line x1="76" y1="55" x2="114" y2="124" stroke="white" strokeWidth="9" opacity="0.09" strokeLinecap="round" />
      </svg>
    )
  }

  // Op aanvraag
  return (
    <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      <rect x="35" y="55" width="150" height="110" rx="4" fill="none" stroke="#B0ABA4" strokeWidth="1.5" strokeDasharray="6 3" />
      <text x={cx} y="116" textAnchor="middle" fill="var(--lx-text-secondary)" fontSize="13" fontWeight="500">Op aanvraag</text>
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
      <span className="text-[28px] font-bold text-lx-text-primary">
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
  glasKleur: GlasKleur
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
}

export default function PricePanel({
  shape, width, height, diameter, organicSizeKey, glasKleur,
  directLight, indirectLight, selectedOptions,
}: PricePanelProps) {
  const total = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey, glasKleur,
    directPosition: directLight.position,
    directType: directLight.type,
    directControl: directLight.control,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    indirectControl: indirectLight.control,
    selectedOptions,
  })

  const lineItems: { label: string; price: number }[] = []

  if (shape === 'rechthoek') {
    // Glaskosten
    const glasKosten = calcGlasKosten(width, height, glasKleur, directLight.position)
    const glasNaam = GLAS_KLEUREN.find(g => g.id === glasKleur)?.name ?? 'Helder'
    lineItems.push({ label: `Glas ${width}×${height} cm · ${glasNaam}`, price: Math.round(glasKosten) })
    lineItems.push({ label: 'Vaste toeslag', price: 105 })

    if (directLight.position !== 'geen' && directLight.type) {
      const m = calcDirectLEDMeters(directLight.position, width, height)
      lineItems.push({ label: `Direct LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (directLight.control) {
        const cp = CONTROL_PRICES[directLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening direct`, price: cp })
      }
    }

    if (indirectLight.position !== 'geen' && indirectLight.type) {
      const m = calcIndirectLEDMeters(indirectLight.position, width, height)
      lineItems.push({ label: `Indirect LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (indirectLight.control) {
        const cp = CONTROL_PRICES[indirectLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening indirect`, price: cp })
      }
    }

    for (const optId of selectedOptions) {
      if (optId === 'verwarming') {
        lineItems.push({ label: 'Verwarming', price: calcHeatingPrice(width, height) })
      } else if (optId === 'schuine-zijden') {
        lineItems.push({ label: 'Schuine zijden (+30%)', price: Math.round(glasKosten * 0.30) })
      } else if (optId === 'afgeronde-hoeken') {
        lineItems.push({ label: 'Afgeronde hoeken (+60%)', price: Math.round(glasKosten * 0.60) })
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt && opt.price > 0) lineItems.push({ label: opt.name, price: opt.price })
      }
    }
  } else {
    // Rond / Organic / Op aanvraag: vaste-prijs systeem
    const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? ''
    let dimLabel = ''
    if (shape === 'rond') dimLabel = diameter ? `⌀ ${diameter} cm` : ''
    else if (shape === 'organic') dimLabel = ORGANIC_SIZES.find(s => s.key === organicSizeKey)?.label ?? ''

    const basePrice = calcBasePrice(shape, width, height, diameter ?? undefined, organicSizeKey ?? undefined)
    if (basePrice > 0) lineItems.push({ label: `${shapeName}${dimLabel ? ' · ' + dimLabel : ''}`, price: basePrice })

    if (directLight.position !== 'geen' && directLight.type) {
      if (directLight.control) {
        const cp = CONTROL_PRICES[directLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening (${LIGHT_TYPE_LABELS[directLight.type]})`, price: cp })
      }
    }
    if (indirectLight.position !== 'geen' && indirectLight.type) {
      if (indirectLight.control) {
        const cp = CONTROL_PRICES[indirectLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening indirect`, price: cp })
      }
    }
    for (const optId of selectedOptions) {
      const opt = EXTRA_OPTIONS.find(o => o.id === optId)
      if (opt && opt.price > 0) lineItems.push({ label: opt.name, price: opt.price })
    }
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Netto inkoopprijs</p>
          <AnimatedPrice price={total} />
          <p className="text-[11px] text-lx-text-secondary mt-0.5">Excl. btw</p>
        </div>

        {lineItems.length > 0 && (
          <div className="space-y-1.5 border-t border-lx-divider pt-3">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between gap-2 text-[12px]">
                <span className="text-lx-text-secondary truncate">{item.label}</span>
                <span className="text-lx-text-primary font-semibold flex-shrink-0">€{item.price.toLocaleString('nl-NL')}</span>
              </div>
            ))}
            <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-lx-divider mt-1.5">
              <span className="text-lx-text-primary">Totaal</span>
              <span className="text-lx-cta">€{total.toLocaleString('nl-NL')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
