'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  ShapeSlug,
  GlasKleur,
  SHAPES,
  ORGANIC_SIZES,
  GLAS_KLEUREN,
  EXTRA_OPTIONS,
  calcTotalPrice,
  calcBasePrice,
  calcGlasKosten,
  calcDirectLEDMeters,
  calcIndirectLEDMeters,
  calcHeatingPrice,
  calcRondDirectLEDMeters,
  calcRondIndirectLEDMeters,
  calcRondHeatingPrice,
  CONTROL_PRICES,
  CONTROLS_FOR_TYPE,
  ROND_BASIS_GLAS,
  ROND_FRAME_PRIJZEN,
  ZANDSTRAAL_PRIJS_PER_METER,
  calcRechthoekFramePrice,
} from '@/lib/configurator-config'
import { LightConfig } from './step-verlichting'

// Glaskleur → SVG appearance
const GLASS_APPEARANCE: Record<string, { fill: string; fillOpacity: number; stroke: string; glansOpacity: number }> = {
  'helder':      { fill: '#C8D4DC', fillOpacity: 0.40, stroke: '#A8B4BC', glansOpacity: 0.09 },
  'smoke-grijs': { fill: '#5A6068', fillOpacity: 0.70, stroke: '#464C54', glansOpacity: 0.12 },
  'smoke-zwart': { fill: '#5A6068', fillOpacity: 0.70, stroke: '#464C54', glansOpacity: 0.12 },
  'smoke-brons': { fill: '#7A5C2A', fillOpacity: 0.78, stroke: '#604820', glansOpacity: 0.13 },
}

export type ConfigPreview = {
  shape: ShapeSlug
  width: number | null
  height: number | null
  diameter?: number | null
  organicSizeKey?: string | null
  glasKleur?: GlasKleur | null
  directLight?: { position: string; type: string | null }
  indirectLight?: { position: string; type: string | null }
  extras?: string[]
}

// Mirror preview SVG — memo: alleen rerenderen als props daadwerkelijk veranderen
export const MirrorPreview = memo(function MirrorPreview({ shape, width, height, diameter, directPosition, indirectPosition, glasKleur, solMeubelHoogte, solOnderkant, lunaMeubelHoogte, lunaOnderkant, lunaAfstandLinks, lunaAfstandRechts, size = 220 }: {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey?: string | null
  directPosition: string
  indirectPosition: string
  glasKleur: GlasKleur
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstandLinks?: number
  lunaAfstandRechts?: number
  size?: number
}) {
  const glass = GLASS_APPEARANCE[glasKleur] ?? GLASS_APPEARANCE['helder']
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
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
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
        <rect x={x} y={y} width={w} height={h} rx="2" fill={glass.fill} opacity={glass.fillOpacity} />
        <rect x={x} y={y} width={w} height={h} rx="2" fill="none" stroke={glass.stroke} strokeWidth="1.5" />

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
          stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round" />
        <line x1={x + w * 0.5} y1={y + h * 0.05} x2={x + w * 0.65} y2={y + h * 0.42}
          stroke="white" strokeWidth="4" opacity={glass.glansOpacity * 0.75} strokeLinecap="round" />
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
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
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
        <circle cx={cx} cy={cy} r={r} fill={glass.fill} opacity={glass.fillOpacity} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.5" />

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
          stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'organic') {
    const organicPath = "M97.8,156.3c-2.7.7-5.4,1.3-8.2,1.1s-1.6-.1-2.2-.3c-3.6-.9-7-1.8-10.2-3.9-22.6-14.7-38.4-35.2-49.6-59.6-9.1-20-8.5-45.1,11.5-56.1s23.8-6.8,36.6-6c27.2,1.8,53.5,9.3,77.2,22.5s22.1,16.3,24.3,28.6c.8,4.4-.7,9.4-.7,9.4-2.6,8.3-7.1,15.4-12.4,22.3-10.1,13-22.9,21.9-37.3,30.2-5.4,3.1-20.8,9.5-29,11.7Z"
    const scale = available / 200
    const tf = `translate(${PAD} ${PAD}) scale(${scale})`
    const hasDirect   = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-o" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="band-glow-o" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <clipPath id="organic-clip">
            <path d={organicPath} transform={tf} />
          </clipPath>
          <mask id="outside-mask-o">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <path d={organicPath} transform={tf} fill="black" />
          </mask>
        </defs>

        {/* Indirecte verlichting: warme gloed rondom organic shape op muur */}
        {hasIndirect && (
          <path d={organicPath} transform={tf} fill="#FEF3C7" stroke="#FEF3C7" strokeWidth="16" opacity="0.5"
            filter="url(#wall-glow-o)" mask="url(#outside-mask-o)" />
        )}

        {/* Spiegelglas */}
        <path d={organicPath} transform={tf} fill={glass.fill} opacity={glass.fillOpacity} />
        <path d={organicPath} transform={tf} fill="none" stroke={glass.stroke} strokeWidth="1.5" />

        {/* Directe verlichting: gezandstraald rondom binnenin */}
        {hasDirect && (
          <>
            <path d={organicPath} transform={tf} fill="none" stroke="white" strokeWidth="10" opacity="0.45" clipPath="url(#organic-clip)" />
            <path d={organicPath} transform={tf} fill="none" stroke="white" strokeWidth="10" opacity="0.18" filter="url(#band-glow-o)" clipPath="url(#organic-clip)" />
          </>
        )}

        {/* Spiegelglans */}
        <line x1="90" y1="72" x2="118" y2="122" stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'rounded-rect') {
    const ratio = Math.min(available / width, available / height)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    const x = (CANVAS - w) / 2
    const y = (CANVAS - h) / 2
    const rx = Math.round(Math.min(w, h) * 0.18)

    const bandH = Math.max(3, Math.round(2 * (h / height)))
    const bandW = Math.max(3, Math.round(2 * (w / width)))
    const offX = Math.round(10 * (w / width))
    const offY = Math.round(5 * (h / height))
    const offXV = Math.round(5 * (w / width))
    const offR = Math.round(5 * Math.min(w / width, h / height))

    const dirTop    = ['boven', 'boven-beneden', 'rondom'].includes(directPosition)
    const dirBottom = ['boven-beneden', 'onder', 'rondom'].includes(directPosition)
    const dirLeft   = ['links-rechts', 'rondom'].includes(directPosition)
    const dirRight  = ['links-rechts', 'rondom'].includes(directPosition)
    const indTop    = ['boven', 'boven-beneden', 'rondom'].includes(indirectPosition)
    const indBottom = ['boven-beneden', 'onder', 'rondom'].includes(indirectPosition)
    const indLeft   = ['links-rechts', 'rondom'].includes(indirectPosition)
    const indRight  = ['links-rechts', 'rondom'].includes(indirectPosition)
    const innerY = y + offY + (dirTop ? bandH : 0)
    const innerH = h - 2 * offY - (dirTop ? bandH : 0) - (dirBottom ? bandH : 0)

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-rr" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="band-glow-rr" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <clipPath id="rr-clip">
            <rect x={x} y={y} width={w} height={h} rx={rx} />
          </clipPath>
          <mask id="outside-mask-rr">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={rx} fill="black" />
          </mask>
        </defs>
        <g mask="url(#outside-mask-rr)">
          {indirectPosition === 'rondom' ? (
            <rect x={x} y={y} width={w} height={h} rx={rx} fill="none"
              stroke="#FEF3C7" strokeWidth="16" opacity="0.85" filter="url(#wall-glow-rr)" />
          ) : (
            <>
              {indTop    && <rect x={x+4} y={y-14} width={w-8} height={14} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow-rr)" />}
              {indBottom && <rect x={x+4} y={y+h}  width={w-8} height={14} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow-rr)" />}
              {indLeft   && <rect x={x-14} y={y+4} width={14} height={h-8} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow-rr)" />}
              {indRight  && <rect x={x+w}  y={y+4} width={14} height={h-8} rx="2" fill="#FEF3C7" opacity="0.9" filter="url(#wall-glow-rr)" />}
            </>
          )}
        </g>
        <rect x={x} y={y} width={w} height={h} rx={rx} fill={glass.fill} opacity={glass.fillOpacity} />
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glass.stroke} strokeWidth="1.5" />
        {directPosition === 'rondom' ? (
          <>
            <rect x={x+offR+bandH/2} y={y+offR+bandH/2} width={w-2*offR-bandH} height={h-2*offR-bandH} rx={Math.max(2,rx-offR)}
              fill="none" stroke="white" strokeWidth={bandH} opacity="0.55" clipPath="url(#rr-clip)" />
            <rect x={x+offR+bandH/2} y={y+offR+bandH/2} width={w-2*offR-bandH} height={h-2*offR-bandH} rx={Math.max(2,rx-offR)}
              fill="none" stroke="white" strokeWidth={bandH} opacity="0.2" filter="url(#band-glow-rr)" clipPath="url(#rr-clip)" />
          </>
        ) : (
          <>
            {dirTop    && <><rect x={x+offX} y={y+offY} width={w-2*offX} height={bandH} rx="1" fill="white" opacity="0.55" clipPath="url(#rr-clip)" /><rect x={x+offX} y={y+offY} width={w-2*offX} height={bandH} rx="1" fill="white" opacity="0.2" filter="url(#band-glow-rr)" clipPath="url(#rr-clip)" /></>}
            {dirBottom && <><rect x={x+offX} y={y+h-bandH-offY} width={w-2*offX} height={bandH} rx="1" fill="white" opacity="0.55" clipPath="url(#rr-clip)" /><rect x={x+offX} y={y+h-bandH-offY} width={w-2*offX} height={bandH} rx="1" fill="white" opacity="0.2" filter="url(#band-glow-rr)" clipPath="url(#rr-clip)" /></>}
            {dirLeft   && <><rect x={x+offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.55" clipPath="url(#rr-clip)" /><rect x={x+offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.2" filter="url(#band-glow-rr)" clipPath="url(#rr-clip)" /></>}
            {dirRight  && <><rect x={x+w-bandW-offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.55" clipPath="url(#rr-clip)" /><rect x={x+w-bandW-offXV} y={innerY} width={bandW} height={innerH} fill="white" opacity="0.2" filter="url(#band-glow-rr)" clipPath="url(#rr-clip)" /></>}
          </>
        )}
        <line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58}
          stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'ovaal') {
    const ratio = Math.min(available / width, available / height)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    const x = (CANVAS - w) / 2
    const y = (CANVAS - h) / 2
    const rx = Math.min(w, h) / 2
    const offR = Math.round(5 * Math.min(w / width, h / height))
    const bandW2 = Math.max(3, Math.round(2 * Math.min(w / width, h / height)))
    const hasDirect   = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-ov" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="band-glow-ov" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <clipPath id="oval-clip">
            <rect x={x} y={y} width={w} height={h} rx={rx} />
          </clipPath>
          <mask id="outside-mask-ov">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={rx} fill="black" />
          </mask>
        </defs>
        {hasIndirect && (
          <rect x={x} y={y} width={w} height={h} rx={rx} fill="none"
            stroke="#FEF3C7" strokeWidth="14" opacity="0.85" filter="url(#wall-glow-ov)"
            mask="url(#outside-mask-ov)" />
        )}
        <rect x={x} y={y} width={w} height={h} rx={rx} fill={glass.fill} opacity={glass.fillOpacity} />
        <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glass.stroke} strokeWidth="1.5" />
        {hasDirect && (
          <>
            <rect x={x+offR+bandW2/2} y={y+offR+bandW2/2} width={w-2*offR-bandW2} height={h-2*offR-bandW2} rx={Math.max(2,rx-offR)}
              fill="none" stroke="white" strokeWidth={bandW2} opacity="0.55" clipPath="url(#oval-clip)" />
            <rect x={x+offR+bandW2/2} y={y+offR+bandW2/2} width={w-2*offR-bandW2} height={h-2*offR-bandW2} rx={Math.max(2,rx-offR)}
              fill="none" stroke="white" strokeWidth={bandW2} opacity="0.2" filter="url(#band-glow-ov)" clipPath="url(#oval-clip)" />
          </>
        )}
        <line x1={x+w*0.25} y1={y+h*0.15} x2={x+w*0.55} y2={y+h*0.65}
          stroke="white" strokeWidth="8" opacity={glass.glansOpacity} strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'arc') {
    const ratio = Math.min(available / width, available / height)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    const x = (CANVAS - w) / 2
    const y = (CANVAS - h) / 2
    const arcR = w / 2
    // Arc path: flat bottom, semicircle top
    const mirrorPath = `M ${x},${y + arcR} A ${arcR},${arcR} 0 0 1 ${x + w},${y + arcR} L ${x + w},${y + h} L ${x},${y + h} Z`
    const offR = Math.round(5 * Math.min(w / width, h / height))
    const bandS = Math.max(3, Math.round(2 * Math.min(w / width, h / height)))
    const innerW = w - 2 * offR
    const innerArcR = Math.max(0, arcR - offR)
    const ix = x + offR
    const iy = y + arcR
    const innerPath = `M ${ix},${iy} A ${innerArcR},${innerArcR} 0 0 1 ${ix + innerW},${iy} L ${ix + innerW},${y + h - offR} L ${ix},${y + h - offR} Z`
    const glowPath = `M ${x - 10},${y + arcR} A ${arcR + 10},${arcR + 10} 0 0 1 ${x + w + 10},${y + arcR} L ${x + w + 10},${y + h + 10} L ${x - 10},${y + h + 10} Z`
    const hasDirect   = directPosition !== 'geen'
    const hasIndirect = indirectPosition !== 'geen'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-arc" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="band-glow-arc" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <clipPath id="arc-clip">
            <path d={mirrorPath} />
          </clipPath>
          <mask id="outside-mask-arc">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <path d={mirrorPath} fill="black" />
          </mask>
        </defs>
        {hasIndirect && (
          <path d={glowPath} fill="#FEF3C7" opacity="0.55" filter="url(#wall-glow-arc)"
            mask="url(#outside-mask-arc)" />
        )}
        <path d={mirrorPath} fill={glass.fill} opacity={glass.fillOpacity} />
        <path d={mirrorPath} fill="none" stroke={glass.stroke} strokeWidth="1.5" />
        {hasDirect && (
          <>
            <path d={innerPath} fill="none" stroke="white" strokeWidth={bandS * 1.5} opacity="0.5" clipPath="url(#arc-clip)" />
            <path d={innerPath} fill="none" stroke="white" strokeWidth={bandS * 1.5} opacity="0.18" filter="url(#band-glow-arc)" clipPath="url(#arc-clip)" />
          </>
        )}
        <line x1={x + w * 0.25} y1={y + arcR * 0.3} x2={x + w * 0.5} y2={y + h * 0.55}
          stroke="white" strokeWidth="8" opacity={glass.glansOpacity} strokeLinecap="round" />
      </svg>
    )
  }

  if (shape === 'sol') {
    const d = diameter ?? 80
    const meubelH = solMeubelHoogte ?? 40
    const onderkantH = solOnderkant ?? 5
    const r = Math.min(available / 2, d * 0.95)
    const scale = r / (d / 2)

    // Sol geometry in SVG space
    // Circle center = cx, cy
    // Circle bottom in SVG = cy + r
    const svgBottomCut = cy + r - onderkantH * scale          // meubel bottom line
    const svgTopCut = cy + r - (onderkantH + meubelH) * scale // meubel top line

    const hasIndirect = indirectPosition !== 'geen'

    // Main mirror = arc above svgTopCut
    // Build a clipped circle: upper portion only
    // We use clipPath to show just above svgTopCut
    const clipId = 'sol-main-clip'
    const extraClipId = 'sol-extra-clip'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-sol" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <clipPath id={clipId}>
            <rect x={cx - r - 2} y={cy - r - 2} width={(r + 2) * 2} height={svgTopCut - (cy - r - 2)} />
          </clipPath>
          <clipPath id={extraClipId}>
            <rect x={cx - r - 2} y={svgBottomCut} width={(r + 2) * 2} height={cy + r + 2 - svgBottomCut} />
          </clipPath>
          <mask id="outside-mask-sol">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <circle cx={cx} cy={cy} r={r} fill="black" />
          </mask>
        </defs>

        {/* Indirecte verlichting: glow rondom de volledige cirkel */}
        {hasIndirect && (
          <circle cx={cx} cy={cy} r={r + 5} fill="none"
            stroke="#FEF3C7" strokeWidth="10" opacity="0.7" filter="url(#wall-glow-sol)"
            mask="url(#outside-mask-sol)" />
        )}

        {/* Hoofdspiegel: bovenstuk boven meubel-bovenkant */}
        <circle cx={cx} cy={cy} r={r} fill={glass.fill} opacity={glass.fillOpacity} clipPath={`url(#${clipId})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.5" clipPath={`url(#${clipId})`} />

        {/* Meubel zone: grijze balk */}
        {svgTopCut < svgBottomCut && (() => {
          const balkW = Math.sqrt(Math.max(0, r * r - Math.pow(svgTopCut - cy, 2))) * 2
          const balkX = cx - balkW / 2
          const balkH = svgBottomCut - svgTopCut
          const textY = svgTopCut + balkH / 2 + 4
          return (
            <>
              <rect x={balkX} y={svgTopCut} width={balkW} height={balkH}
                fill="#E8E4DF" fillOpacity="0.7" stroke="#B0ABA4" strokeWidth="1" strokeDasharray="3 2" />
              {balkH > 14 && (
                <text x={cx} y={textY} textAnchor="middle" fill="#8B7F74"
                  fontSize="10" fontWeight="600" letterSpacing="0.5">
                  meubel
                </text>
              )}
            </>
          )
        })()}

        {/* Extra deel: onderste boog (altijd zichtbaar, dashed als niet geselecteerd — kleur dimmer) */}
        {svgBottomCut < cy + r && (
          <>
            <circle cx={cx} cy={cy} r={r} fill={glass.fill} opacity={glass.fillOpacity * 0.5}
              clipPath={`url(#${extraClipId})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.5"
              strokeDasharray="4 3" clipPath={`url(#${extraClipId})`} />
          </>
        )}

        {/* Glans */}
        <line x1={cx - r * 0.2} y1={cy - r * 0.5} x2={cx + r * 0.28} y2={cy + r * 0.38}
          stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round"
          clipPath={`url(#${clipId})`} />
      </svg>
    )
  }

  if (shape === 'luna') {
    const d = diameter ?? 80
    const meubelH = lunaMeubelHoogte ?? 35
    const onderkantH = lunaOnderkant ?? 15
    const afstandL = lunaAfstandLinks ?? 20
    const afstandR = lunaAfstandRechts ?? 20
    const r = Math.min(available / 2, d * 0.95)
    const scale = r / (d / 2)

    const svgBottomCut = cy + r - onderkantH * scale
    const svgTopCut = cy + r - (onderkantH + meubelH) * scale
    const svgLeftCut = cx - r + afstandL * scale
    const svgRightCut = cx + r - afstandR * scale

    const hasIndirect = indirectPosition !== 'geen'
    const clipId = 'luna-main-clip'
    const extraClipId = 'luna-extra-clip'

    return (
      <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <defs>
          <filter id="wall-glow-luna" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <clipPath id={clipId}>
            <rect x={svgLeftCut - 1} y={cy - r - 2} width={svgRightCut - svgLeftCut + 2} height={svgTopCut - (cy - r - 2)} />
          </clipPath>
          <clipPath id={extraClipId}>
            <rect x={svgLeftCut - 1} y={svgBottomCut} width={svgRightCut - svgLeftCut + 2} height={cy + r + 2 - svgBottomCut} />
          </clipPath>
          <mask id="outside-mask-luna">
            <rect x="0" y="0" width={CANVAS} height={CANVAS} fill="white" />
            <circle cx={cx} cy={cy} r={r} fill="black" />
            {svgLeftCut > cx - r && <rect x="0" y="0" width={svgLeftCut} height={CANVAS} fill="black" />}
            {svgRightCut < cx + r && <rect x={svgRightCut} y="0" width={CANVAS - svgRightCut} height={CANVAS} fill="black" />}
          </mask>
        </defs>

        {hasIndirect && (
          <circle cx={cx} cy={cy} r={r + 5} fill="none"
            stroke="#FEF3C7" strokeWidth="10" opacity="0.7"
            filter="url(#wall-glow-luna)" mask="url(#outside-mask-luna)" />
        )}

        <circle cx={cx} cy={cy} r={r} fill={glass.fill} opacity={glass.fillOpacity}
          clipPath={`url(#${clipId})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.5"
          clipPath={`url(#${clipId})`} />

        {svgLeftCut > cx - r && (
          <line x1={svgLeftCut} y1={cy - r} x2={svgLeftCut} y2={cy + r}
            stroke="#B0ABA4" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
        )}
        {svgRightCut < cx + r && (
          <line x1={svgRightCut} y1={cy - r} x2={svgRightCut} y2={cy + r}
            stroke="#B0ABA4" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
        )}

        {svgTopCut < svgBottomCut && (() => {
          const balkH = svgBottomCut - svgTopCut
          const textY = svgTopCut + balkH / 2 + 4
          return (
            <>
              <rect x={svgLeftCut} y={svgTopCut} width={svgRightCut - svgLeftCut} height={balkH}
                fill="#E8E4DF" fillOpacity="0.7" stroke="#B0ABA4" strokeWidth="1" strokeDasharray="3 2" />
              {balkH > 14 && (
                <text x={(svgLeftCut + svgRightCut) / 2} y={textY} textAnchor="middle"
                  fill="#8B7F74" fontSize="10" fontWeight="600" letterSpacing="0.5">
                  meubel
                </text>
              )}
            </>
          )
        })()}

        {svgBottomCut < cy + r && (
          <>
            <circle cx={cx} cy={cy} r={r} fill={glass.fill} opacity={glass.fillOpacity * 0.5}
              clipPath={`url(#${extraClipId})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.5"
              strokeDasharray="4 3" clipPath={`url(#${extraClipId})`} />
          </>
        )}

        <line x1={cx - r * 0.2} y1={cy - r * 0.5} x2={cx + r * 0.28} y2={cy + r * 0.38}
          stroke="white" strokeWidth="9" opacity={glass.glansOpacity} strokeLinecap="round"
          clipPath={`url(#${clipId})`} />
      </svg>
    )
  }

  // Op aanvraag
  return (
    <svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      <rect x="35" y="55" width="150" height="110" rx="4" fill="none" stroke="#B0ABA4" strokeWidth="1.5" strokeDasharray="6 3" />
      <text x={cx} y="116" textAnchor="middle" fill="var(--lx-text-secondary)" fontSize="13" fontWeight="500">Op aanvraag</text>
    </svg>
  )
})

// Animated price display
const AnimatedPrice = memo(function AnimatedPrice({ price }: { price: number }) {
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
})

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
  optionSubChoices: Record<string, string>
  isInternational?: boolean
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstandLinks?: number
  lunaAfstandRechts?: number
}

export default function PricePanel({
  shape, width, height, diameter, organicSizeKey, glasKleur,
  directLight, indirectLight, selectedOptions, optionSubChoices,
  isInternational = false, solMeubelHoogte, solOnderkant,
  lunaMeubelHoogte, lunaOnderkant, lunaAfstandLinks, lunaAfstandRechts,
}: PricePanelProps) {
  const mult = isInternational ? 1.05 : 1
  const netto = useMemo(() => calcTotalPrice({
    shape, width, height, diameter, organicSizeKey, glasKleur,
    lunaMeubelHoogte,
    directPosition: directLight.position,
    directType: directLight.type,
    directControl: directLight.control,
    indirectPosition: indirectLight.position,
    indirectType: indirectLight.type,
    indirectControl: indirectLight.control,
    selectedOptions,
    optionSubChoices,
  }), [shape, width, height, diameter, organicSizeKey, glasKleur, lunaMeubelHoogte, directLight, indirectLight, selectedOptions, optionSubChoices])

  function getControlName(controlId: string): string {
    for (const controls of Object.values(CONTROLS_FOR_TYPE) as { id: string; name: string }[][]) {
      const found = controls.find(c => c.id === controlId)
      if (found) return found.name
    }
    return controlId
  }

  const lineItems: { label: string; price: number }[] = []

  if (shape === 'rechthoek' || shape === 'rounded-rect' || shape === 'ovaal' || shape === 'arc') {
    // Glaskosten
    const glasKosten = calcGlasKosten(width, height, glasKleur)
    const glasNaam = GLAS_KLEUREN.find(g => g.id === glasKleur)?.name ?? 'Helder'
    const shapePrefix = shape === 'rounded-rect' ? 'Afgerond' : shape === 'ovaal' ? 'Ovaal' : shape === 'arc' ? 'Boog' : 'Glas'
    lineItems.push({ label: `${shapePrefix} ${width}×${height} cm · ${glasNaam}`, price: Math.round(glasKosten) + 105 })

    if (directLight.position !== 'geen' && directLight.type) {
      const m = calcDirectLEDMeters(directLight.position, width, height)
      lineItems.push({ label: `Zandstraalbaan · ${m.toFixed(2)}m`, price: Math.round(m * ZANDSTRAAL_PRIJS_PER_METER) })
      lineItems.push({ label: `Direct LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (directLight.control) {
        const cp = CONTROL_PRICES[directLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(directLight.control)}`, price: cp })
      }
    }

    if (indirectLight.position !== 'geen' && indirectLight.type) {
      const m = calcIndirectLEDMeters(indirectLight.position, width, height)
      lineItems.push({ label: `Indirect LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (indirectLight.control) {
        const cp = CONTROL_PRICES[indirectLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(indirectLight.control)}`, price: cp })
      }
    }

    for (const optId of selectedOptions) {
      if (optId === 'verwarming') {
        lineItems.push({ label: 'Verwarming', price: calcHeatingPrice(width, height) })
      } else if (optId === 'schuine-zijden') {
        lineItems.push({ label: 'Schuine zijden (+30%)', price: Math.round(glasKosten * 0.30) })
      } else if (optId === 'afgeronde-hoeken') {
        lineItems.push({ label: 'Afgeronde hoeken (+60%)', price: Math.round(glasKosten * 0.60) })
      } else if (optId === 'frame-in-kleur') {
        const colorId = optionSubChoices['frame-in-kleur']
        if (colorId) {
          const colorName = EXTRA_OPTIONS.find(o => o.id === 'frame-in-kleur')?.subChoices?.options.find(c => c.id === colorId)?.name ?? colorId
          lineItems.push({ label: `Frame · ${colorName}`, price: calcRechthoekFramePrice(colorId, width, height) })
        }
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt && opt.price > 0) lineItems.push({ label: opt.name, price: opt.price })
      }
    }
  } else if (shape === 'rond') {
    const d = diameter ?? 60
    const glasNaam = GLAS_KLEUREN.find(g => g.id === glasKleur)?.name ?? 'Helder'
    lineItems.push({ label: `Rond ⌀ ${d} cm · ${glasNaam}`, price: (ROND_BASIS_GLAS[d] ?? 92) + 105 })

    if (directLight.position !== 'geen' && directLight.type) {
      const m = calcRondDirectLEDMeters(directLight.position, d)
      lineItems.push({ label: `Direct LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (directLight.control) {
        const cp = CONTROL_PRICES[directLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(directLight.control)}`, price: cp })
      }
    }

    if (indirectLight.position !== 'geen' && indirectLight.type) {
      const m = calcRondIndirectLEDMeters(indirectLight.position, d)
      lineItems.push({ label: `Indirect LED · ${m.toFixed(2)}m`, price: Math.round(m * 99) })
      if (indirectLight.control) {
        const cp = CONTROL_PRICES[indirectLight.control] ?? 0
        if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(indirectLight.control)}`, price: cp })
      }
    }

    for (const optId of selectedOptions) {
      if (optId === 'verwarming') {
        lineItems.push({ label: 'Verwarming', price: calcRondHeatingPrice(d) })
      } else if (optId === 'frame-in-kleur') {
        const colorId = optionSubChoices['frame-in-kleur']
        if (colorId) {
          const framePrice = ROND_FRAME_PRIJZEN[colorId]?.[d]
          if (framePrice !== undefined) {
            const colorName = EXTRA_OPTIONS.find(o => o.id === 'frame-in-kleur')?.subChoices?.options.find(c => c.id === colorId)?.name ?? colorId
            lineItems.push({ label: `Frame · ${colorName}`, price: framePrice })
          }
        }
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt && opt.price > 0) lineItems.push({ label: opt.name, price: opt.price })
      }
    }
  } else {
    // Organic / Op aanvraag
    const shapeName = SHAPES.find(s => s.slug === shape)?.name ?? ''
    const dimLabel = shape === 'organic' ? (ORGANIC_SIZES.find(s => s.key === organicSizeKey)?.label ?? '') : ''
    const basePrice = calcBasePrice(shape, width, height, diameter ?? undefined, organicSizeKey ?? undefined)
    if (basePrice > 0) lineItems.push({ label: `${shapeName}${dimLabel ? ' · ' + dimLabel : ''}`, price: basePrice })

    if (directLight.position !== 'geen' && directLight.type && directLight.control) {
      const cp = CONTROL_PRICES[directLight.control] ?? 0
      if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(directLight.control)}`, price: cp })
    }
    if (indirectLight.position !== 'geen' && indirectLight.type && indirectLight.control) {
      const cp = CONTROL_PRICES[indirectLight.control] ?? 0
      if (cp > 0) lineItems.push({ label: `Bediening · ${getControlName(indirectLight.control)}`, price: cp })
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
          glasKleur={glasKleur}
          solMeubelHoogte={solMeubelHoogte}
          solOnderkant={solOnderkant}
          lunaMeubelHoogte={lunaMeubelHoogte}
          lunaOnderkant={lunaOnderkant}
          lunaAfstandLinks={lunaAfstandLinks}
          lunaAfstandRechts={lunaAfstandRechts}
        />
      </div>

      {/* Prijs kaart */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 space-y-4">
        {shape === 'op-aanvraag' ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Prijs</p>
            <p className="text-[22px] font-bold text-lx-cta">Op offerte</p>
            <p className="text-[11px] text-lx-text-secondary mt-1 leading-snug">Prijs wordt bepaald op basis van uw tekening en gewenste specificaties.</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">
                Bruto ex. BTW
              </p>
              <AnimatedPrice price={Math.round(netto * mult)} />
              <p className="text-[11px] text-lx-text-secondary mt-0.5">Excl. btw</p>
            </div>

            {lineItems.length > 0 && (
              <div className="space-y-1.5 border-t border-lx-divider pt-3">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2 text-[12px]">
                    <span className="text-lx-text-secondary truncate">{item.label}</span>
                    <span className="text-lx-text-primary font-semibold flex-shrink-0">€{Math.round(item.price * mult).toLocaleString('nl-NL')}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-lx-divider mt-1.5">
                  <span className="text-lx-text-primary">Bruto totaal</span>
                  <span className="text-lx-cta">€{Math.round(netto * mult).toLocaleString('nl-NL')}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
