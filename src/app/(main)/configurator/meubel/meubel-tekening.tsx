'use client'

import { memo } from 'react'
import { HOUTKLEUREN, houtkleurAfbeelding, type MeubelModel } from '@/lib/meubel-config'

// Schematisch vooraanzicht op schaal, in dezelfde stijl als de spiegeltekening:
// zachte vulling, dunne lijnen en maatlijnen. Volgt lengte, lades en houtkleur.

const W = 360
const PAD_X = 34
const PAD_TOP = 34
const PAD_BOTTOM = 40
const MAX_H = 150
// Lijnkleur volgt de ondergrond, zodat de ladeverdeling op elke houtkleur leesbaar blijft
const LIJN_OP_LICHT = '#26282B'
const LIJN_OP_DONKER = '#F4F1EA'
const VLAK_ZONDER_HOUT = '#F6F4EF'
const MAAT = 'var(--lx-text-secondary)'

function cm(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })
}

export const MeubelTekening = memo(function MeubelTekening({ model, lengte, lades, houtkleur, toonHout = true }: {
  model: MeubelModel
  lengte: number
  lades: number
  houtkleur: string
  /** Uit = kale lijntekening zonder houtkleur */
  toonHout?: boolean
}) {
  const donker = toonHout && HOUTKLEUREN.find((k) => k.id === houtkleur)?.donker === true
  const LIJN = donker ? LIJN_OP_DONKER : LIJN_OP_LICHT
  const ruimteB = W - PAD_X * 2 - 22
  const schaal = Math.min(ruimteB / lengte, MAX_H / model.hoogte)
  const w = lengte * schaal
  const h = model.hoogte * schaal
  // De hoogte van de tekening volgt het meubel, zodat er geen lege ruimte overblijft
  const H = PAD_TOP + h + PAD_BOTTOM
  const x = (W - 22 - w) / 2
  const y = PAD_TOP
  const kolomB = w / lades
  const rijH = h / model.rijen
  const patroon = `hout-${houtkleur}`
  // Maat per lade alleen tonen als de tekst in de lade past
  const toonLadeMaat = kolomB > 34

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Vooraanzicht ${model.naam}, ${lengte} cm lang, ${model.hoogte} cm hoog, ${lades * model.rijen} lades`}
    >
      <defs>
        {/* Vier gespiegelde tegels, zodat de naden van het houtstaal niet opvallen */}
        <pattern id={patroon} patternUnits="userSpaceOnUse" width="180" height="180">
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(180 0) scale(-1 1)" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(0 180) scale(1 -1)" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(180 180) scale(-1 -1)" />
        </pattern>
      </defs>

      {/* Korpus */}
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill={toonHout ? `url(#${patroon})` : VLAK_ZONDER_HOUT} />
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill="none" stroke={LIJN_OP_LICHT} strokeWidth="1.5" />

      {/* Ladefronten */}
      {Array.from({ length: lades - 1 }, (_, i) => (
        <line key={`k${i}`} x1={x + kolomB * (i + 1)} y1={y} x2={x + kolomB * (i + 1)} y2={y + h} stroke={LIJN} strokeWidth="1.3" />
      ))}
      {Array.from({ length: model.rijen - 1 }, (_, i) => (
        <line key={`r${i}`} x1={x} y1={y + rijH * (i + 1)} x2={x + w} y2={y + rijH * (i + 1)} stroke={LIJN} strokeWidth="1.3" />
      ))}

      {/* Maatlijn lengte (boven) */}
      <g stroke={MAAT} strokeWidth="0.8" fill="none">
        <line x1={x} y1={y - 16} x2={x + w} y2={y - 16} />
        <line x1={x} y1={y - 21} x2={x} y2={y - 6} />
        <line x1={x + w} y1={y - 21} x2={x + w} y2={y - 6} />
      </g>
      <text x={x + w / 2} y={y - 21} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--lx-text-primary)">
        {lengte} cm
      </text>

      {/* Maatlijn hoogte (rechts) */}
      <g stroke={MAAT} strokeWidth="0.8" fill="none">
        <line x1={x + w + 14} y1={y} x2={x + w + 14} y2={y + h} />
        <line x1={x + w + 5} y1={y} x2={x + w + 19} y2={y} />
        <line x1={x + w + 5} y1={y + h} x2={x + w + 19} y2={y + h} />
      </g>
      <text x={x + w + 20} y={y + h / 2 + 4} fontSize="11" fontWeight="600" fill="var(--lx-text-primary)">
        {model.hoogte}
      </text>

      {/* Maatlijn per lade (onder) */}
      <g stroke={MAAT} strokeWidth="0.8" fill="none">
        <line x1={x} y1={y + h + 14} x2={x + w} y2={y + h + 14} />
        {Array.from({ length: lades + 1 }, (_, i) => (
          <line key={i} x1={x + kolomB * i} y1={y + h + 6} x2={x + kolomB * i} y2={y + h + 19} />
        ))}
      </g>
      {toonLadeMaat && Array.from({ length: lades }, (_, i) => (
        <text key={i} x={x + kolomB * (i + 0.5)} y={y + h + 31} textAnchor="middle" fontSize="10" fontWeight="500" fill={MAAT}>
          {cm(lengte / lades)}
        </text>
      ))}
    </svg>
  )
})
