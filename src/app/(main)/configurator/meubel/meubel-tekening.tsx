'use client'

import { memo, useId } from 'react'
import { HOUTKLEUREN, formatMm, houtkleurAfbeelding, type MeubelModel } from '@/lib/meubel-config'
import { tekenIndeling, tekenKast, tekenWaskommen, type RegaalZijde, spiegelGlans } from '@/lib/meubel-tekening'

// Schematisch vooraanzicht op schaal, in dezelfde stijl als de spiegeltekening:
// zachte vulling, dunne lijnen en maatlijnen. Volgt lengte, lades en houtkleur.

const W = 360
const PAD_X = 34
const PAD_TOP = 34
const PAD_BOTTOM = 40
const MAX_H = 150
const MAX_H_KAST = 280
// Lijnkleur volgt de ondergrond, zodat de ladeverdeling op elke houtkleur leesbaar blijft
const LIJN_OP_LICHT = '#26282B'
const LIJN_OP_DONKER = '#F4F1EA'
const VLAK_ZONDER_HOUT = '#F6F4EF'
const MAAT = 'var(--lx-text-secondary)'

export const MeubelTekening = memo(function MeubelTekening({ model, lengte, breedtes, houtkleur, toonHout: houtAan = true, regaal = null, waskom = null, deuren = 0 }: {
  model: MeubelModel
  lengte: number
  /** Breedte per lade in mm, van links naar rechts */
  breedtes: number[]
  houtkleur: string
  /** Uit = kale lijntekening zonder houtkleur */
  toonHout?: boolean
  /** Open regaalkast naast of tussen de lades (Regal-modellen) */
  regaal?: { breedte: number; zijde: RegaalZijde } | null
  /** Ingebouwde waskom in het Solid Surface blad: vorm en aantal */
  waskom?: { vorm: 'ovaal' | 'vierkant'; aantal: number } | null
  /** Aantal deuren bij een kast */
  deuren?: number
}) {
  // Een los Solid Surface blad heeft geen hout
  const toonHout = houtAan && !model.geenHout
  const kast = tekenKast(model, deuren)
  const donker = toonHout && HOUTKLEUREN.find((k) => k.id === houtkleur)?.donker === true
  const LIJN = donker ? LIJN_OP_DONKER : LIJN_OP_LICHT
  const ruimteB = W - PAD_X * 2 - 22
  // Een kast is hoog en smal: die krijgt meer hoogte in de tekening
  const schaal = model.plank ? Math.min(ruimteB / lengte, 200 / model.diepte) : Math.min(ruimteB / lengte, (kast ? MAX_H_KAST : MAX_H) / model.hoogte)
  const w = lengte * schaal
  const h = model.hoogte * schaal
  // Solid Surface: bovenaanzicht van het blad boven het vooraanzicht
  const heeftBlad = model.categorie === 'solid-surface' || !!model.plank
  const bladD = heeftBlad ? model.diepte * schaal : 0
  const yBlad = PAD_TOP
  const x = (W - 22 - w) / 2
  const y = PAD_TOP + (heeftBlad ? bladD + 30 : 0)
  // De hoogte van de tekening volgt het meubel, zodat er geen lege ruimte overblijft
  const zonderVakken = breedtes.length === 0
  const H = y + h + (zonderVakken ? 14 : PAD_BOTTOM)
  // De lengtemaat staat boven het bovenste aanzicht
  const yMaat = heeftBlad ? yBlad : y
  // Lades en regaalkast van links naar rechts, binnen de rand van het frame
  const { vakken, links, rechts, boven, onder, scheidingen } = tekenIndeling({ model, breedtes, regaal, x, y, w, h, schaal })
  const heeftRand = (model.rand ?? 0) > 0
  const rijH = (onder - boven) / model.rijen
  const lades = breedtes.length
  // Uniek per tekening: in de popup staat dezelfde tekening een tweede keer op de pagina
  const patroon = `hout-${houtkleur}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={kast
        ? `Vooraanzicht ${model.naam}, ${lengte} mm breed, ${model.hoogte} mm hoog, ${model.diepte} mm diep`
        : `Vooraanzicht ${model.naam}, ${lengte} mm lang, ${model.hoogte} mm hoog, ${lades * model.rijen} lades`}
    >
      <defs>
        {/* Vier gespiegelde tegels, zodat de naden van het houtstaal niet opvallen */}
        {/* Hoge kasten: de houtnerf loopt van boven naar beneden */}
        <pattern id={patroon} patternUnits="userSpaceOnUse" width="180" height="180" patternTransform={model.kast?.hoogteStaffels ? 'rotate(90)' : undefined}>
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(180 0) scale(-1 1)" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(0 180) scale(1 -1)" />
          <image href={houtkleurAfbeelding(houtkleur)} width="91" height="91" preserveAspectRatio="none" transform="translate(180 180) scale(-1 -1)" />
        </pattern>
      </defs>

      {/* Bovenaanzicht: Solid Surface blad met de waskommen (plaats indicatief) */}
      {heeftBlad && (
        <g>
          <rect x={x} y={yBlad} width={w} height={bladD} rx="1.5" fill={model.plank ? (toonHout ? `url(#${patroon})` : VLAK_ZONDER_HOUT) : '#FBFAF7'} stroke={LIJN_OP_LICHT} strokeWidth="1.5" />
          {waskom && tekenWaskommen(lengte, model.diepte, waskom.aantal).map((k) => (
            waskom.vorm === 'ovaal'
              ? <ellipse key={k.cx} cx={x + k.cx * schaal} cy={yBlad + k.cy * schaal} rx={(k.b / 2) * schaal} ry={(k.d / 2) * schaal} fill="#EDEAE3" stroke={LIJN_OP_LICHT} strokeWidth="1" />
              : <rect key={k.cx} x={x + (k.cx - k.b / 2) * schaal} y={yBlad + (k.cy - k.d / 2) * schaal} width={k.b * schaal} height={k.d * schaal} rx={40 * schaal} fill="#EDEAE3" stroke={LIJN_OP_LICHT} strokeWidth="1" />
          ))}
          <g stroke={MAAT} strokeWidth="0.8" fill="none">
            <line x1={x + w + 14} y1={yBlad} x2={x + w + 14} y2={yBlad + bladD} />
            <line x1={x + w + 5} y1={yBlad} x2={x + w + 19} y2={yBlad} />
            <line x1={x + w + 5} y1={yBlad + bladD} x2={x + w + 19} y2={yBlad + bladD} />
          </g>
          <text x={x + w + 20} y={yBlad + bladD / 2 + 4} fontSize="11" fontWeight="600" fill="var(--lx-text-primary)">{model.diepte}</text>
          <text x={x} y={yBlad + bladD + 12} fontSize="9" fill={MAAT}>Bovenaanzicht{waskom ? ', plaats waskom indicatief' : ''}</text>
        </g>
      )}

      {/* Korpus */}
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill={toonHout ? `url(#${patroon})` : VLAK_ZONDER_HOUT} />
      {kast?.spiegel && (
        <>
          <rect x={x + 3} y={y + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} fill="#DDE5E8" />
          {spiegelGlans(x + 3, y + 3, Math.max(0, w - 6), Math.max(0, h - 6), kast.verticaal).map((g) => (
            <polygon key={g.punten} points={g.punten} fill="#fff" fillOpacity={g.dekking} />
          ))}
        </>
      )}
      {kast?.open && (
        <>
          <rect x={x + 3} y={y + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} fill="#000" fillOpacity={toonHout ? 0.38 : 0.1} />
          <rect x={x + 3} y={y + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} fill="none" stroke={toonHout ? LIJN_OP_DONKER : LIJN_OP_LICHT} strokeWidth="0.8" strokeOpacity="0.7" />
        </>
      )}
      {kast?.horizontaal.map((f) => (
        <line key={`kh${f}`} x1={x + (kast.open ? 3 : 0)} y1={y + h * f} x2={x + w - (kast.open ? 3 : 0)} y2={y + h * f} stroke={kast.open && toonHout ? LIJN_OP_DONKER : LIJN} strokeWidth={kast.open ? 2.2 : 1.3} />
      ))}
      {kast?.verticaal.map((f) => (
        <line key={`kv${f}`} x1={x + w * f} y1={y + 3} x2={x + w * f} y2={y + h - 3} stroke={LIJN_OP_LICHT} strokeWidth="1.3" />
      ))}
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill="none" stroke={LIJN_OP_LICHT} strokeWidth="1.5" />

      {/* Regaalkast: open vak, donkerder dan de fronten, met een binnenrand */}
      {vakken.filter((v) => v.soort === 'regaal').map((v) => (
        <g key={`regaal-${v.x0}`}>
          <rect x={v.x0} y={boven} width={v.x1 - v.x0} height={onder - boven} fill="#000" fillOpacity={toonHout ? 0.38 : 0.1} />
          <rect x={v.x0 + 3} y={boven + 3} width={Math.max(0, v.x1 - v.x0 - 6)} height={Math.max(0, onder - boven - 6)} fill="none" stroke={toonHout ? LIJN_OP_DONKER : LIJN_OP_LICHT} strokeWidth="0.8" strokeOpacity="0.7" />
        </g>
      ))}

      {/* Scheidingen tussen lades, regaalkast en frame */}
      {scheidingen.map((gx) => (
        <line key={`s${gx}`} x1={gx} y1={boven} x2={gx} y2={onder} stroke={LIJN} strokeWidth="1.3" />
      ))}
      {/* Laderijen: alleen over de lades, niet door de regaalkast */}
      {vakken.filter((v) => v.soort === 'lade').flatMap((v) => Array.from({ length: model.rijen - 1 }, (_, i) => (
        <line key={`r${v.x0}-${i}`} x1={v.x0} y1={boven + rijH * (i + 1)} x2={v.x1} y2={boven + rijH * (i + 1)} stroke={LIJN} strokeWidth="1.3" />
      )))}
      {model.randBoven && heeftRand && <line x1={links} y1={boven} x2={rechts} y2={boven} stroke={LIJN} strokeWidth="1.3" />}
      {model.randOnder && heeftRand && <line x1={links} y1={onder} x2={rechts} y2={onder} stroke={LIJN} strokeWidth="1.3" />}

      {/* Maatlijn lengte (boven) */}
      <g stroke={MAAT} strokeWidth="0.8" fill="none">
        <line x1={x} y1={yMaat - 16} x2={x + w} y2={yMaat - 16} />
        <line x1={x} y1={yMaat - 21} x2={x} y2={yMaat - 6} />
        <line x1={x + w} y1={yMaat - 21} x2={x + w} y2={yMaat - 6} />
      </g>
      <text x={x + w / 2} y={yMaat - 21} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--lx-text-primary)">
        {lengte}
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

      {/* Maatlijn per vak (onder) */}
      <g stroke={MAAT} strokeWidth="0.8" fill="none" display={zonderVakken ? 'none' : undefined}>
        <line x1={links} y1={y + h + 14} x2={rechts} y2={y + h + 14} />
        {[links, ...vakken.map((v) => v.x1)].map((gx) => (
          <line key={`m${gx}`} x1={gx} y1={y + h + 6} x2={gx} y2={y + h + 19} />
        ))}
      </g>
      {/* Maat alleen tonen als de tekst in het vak past */}
      {vakken.filter((v) => v.x1 - v.x0 > 26).map((v) => (
        <text key={`t${v.x0}`} x={(v.x0 + v.x1) / 2} y={y + h + 31} textAnchor="middle" fontSize="10" fontWeight="500" fill={MAAT}>
          {formatMm(v.breedte)}
        </text>
      ))}
    </svg>
  )
})
