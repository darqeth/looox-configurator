export type ShapeSlug = 'rechthoek' | 'rond' | 'organic' | 'op-aanvraag' | 'rounded-rect' | 'ovaal' | 'arc' | 'projectspiegel' | 'sol' | 'luna' | 'elips'
export type LightType = '3000k' | '4000k' | 'rgbw' | 'cct'
export type GlasKleur = 'helder' | 'smoke-zwart' | 'smoke-brons'

export const SHAPES = [
  { slug: 'rechthoek' as ShapeSlug, name: 'Rechte hoeken',   description: 'Klassiek rechthoekig, volledig maatwerk', fromPrice: 149 },
  { slug: 'rond'      as ShapeSlug, name: 'Rond',            description: 'Perfecte cirkel, uit vaste diameters',   fromPrice: 138 },
  { slug: 'organic'      as ShapeSlug, name: 'Organic',          description: 'Vrije organische vorm, vaste afmetingen',          fromPrice: 281 },
  { slug: 'rounded-rect' as ShapeSlug, name: 'Afgeronde hoeken', description: 'Rechthoek met zacht afgeronde hoeken, volledig maatwerk', fromPrice: 149 },
  { slug: 'ovaal'        as ShapeSlug, name: 'Ovaal',            description: 'Piltvorm — beide korte zijden volledig afgerond',      fromPrice: 149 },
  { slug: 'elips'        as ShapeSlug, name: 'Ellips',            description: 'Echte ellipsvorm, verhouding 1:2, liggend of staand',  fromPrice: null },
  { slug: 'arc'          as ShapeSlug, name: 'Arc',              description: 'Één korte zijde recht, de andere volledig afgerond',   fromPrice: 149 },
  { slug: 'sol'          as ShapeSlug, name: 'Sol',               description: 'Cirkelvormig, passend om badkamermeubel',             fromPrice: 999 },
  { slug: 'luna'         as ShapeSlug, name: 'Luna',              description: 'Cirkelvormig, passend tegen muur en badkamermeubel',   fromPrice: 829 },
  { slug: 'op-aanvraag'  as ShapeSlug, name: 'Op aanvraag',      description: 'Eigen ontwerp of bijzondere maat',                     fromPrice: null },
]

export const ROND_DIAMETERS = [30, 40, 50, 60, 70, 80, 100, 120]

export const ORGANIC_SIZES = [
  { label: '60 × 40 cm', width: 60,  height: 40, key: '60x40' },
  { label: '80 × 60 cm', width: 80,  height: 60, key: '80x60' },
  { label: '100 × 70 cm', width: 100, height: 70, key: '100x70' },
  { label: '120 × 80 cm', width: 120, height: 80, key: '120x80' },
]

export const RECHTHOEK_CONSTRAINTS = { min: 40, max: 300 }

export const DIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek:      ['geen', 'boven', 'boven-beneden', 'links-rechts', 'rondom'],
  rond:           ['geen', 'rondom'],
  organic:        [],
  'rounded-rect': ['geen', 'boven', 'boven-beneden', 'links-rechts', 'rondom'],
  ovaal:          ['geen', 'rondom'],
  arc:            ['geen', 'rondom'],
  sol:            [],
  luna:           [],
  elips:          [], // Elips: geen directe verlichting
  // Op-aanvraag: zelfde direct/indirect keuzes als rechthoek (beide onafhankelijk)
  'op-aanvraag':  ['geen', 'boven', 'boven-beneden', 'links-rechts', 'rondom'],
  projectspiegel: [],
}

export const INDIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek:      ['geen', 'boven-beneden', 'onder', 'links-rechts', 'rondom'],
  rond:           ['geen', 'rondom'],
  organic:        ['geen', 'rondom'],
  'rounded-rect': ['geen', 'boven-beneden', 'onder', 'links-rechts', 'rondom'],
  ovaal:          ['geen', 'rondom'],
  arc:            ['geen', 'rondom'],
  sol:            ['geen', 'rondom'],
  luna:           ['geen', 'rondom'],
  elips:          ['geen', 'rondom'],
  'op-aanvraag':  ['geen', 'boven-beneden', 'onder', 'links-rechts', 'rondom'],
  projectspiegel: [],
}

export const POSITION_LABELS: Record<string, string> = {
  geen:            'Geen',
  boven:           'Boven',
  'boven-beneden': 'Boven + Beneden',
  'links-rechts':  'Links + Rechts',
  rondom:          'Rondom',
  onder:           'Onder',
  indirect:        'Indirect',
  direct:          'Direct',
}

export const LIGHT_TYPE_LABELS: Record<LightType, string> = {
  '3000k': '3000K',
  '4000k': '4000K',
  rgbw:    'RGB+W',
  cct:     'CCT',
}

export const LIGHT_TYPE_DESCRIPTIONS: Record<LightType, string> = {
  '3000k': 'Warm wit — sfeervol en ontspannend',
  '4000k': 'Neutraal wit — helder en functioneel',
  rgbw:    'Kleurveranderend — sfeer naar wens',
  cct:     'Instelbaar — van warm naar koel',
}

export const CONTROL_PRICES: Record<string, number> = {
  'externe-schakeling': 0,
  'tip-touch':          57,
  'wip-schakelaar':     57,
  'motion-sensor':      76,
  'afstandsbediening':  114,
}

export const CONTROLS_FOR_TYPE: Record<LightType, { id: string; name: string; auto?: boolean }[]> = {
  '3000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: 'wip-schakelaar',     name: 'Wip schakelaar' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
    { id: 'afstandsbediening',  name: 'Afstandsbediening' },
  ],
  '4000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: 'wip-schakelaar',     name: 'Wip schakelaar' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
    { id: 'afstandsbediening',  name: 'Afstandsbediening' },
  ],
  rgbw: [{ id: 'afstandsbediening', name: 'Afstandsbediening', auto: true }],
  cct:  [
    { id: 'tip-touch',         name: 'Tip-Touch' },
    { id: 'afstandsbediening', name: 'Afstandsbediening' },
  ],
}

// ─── Elips ────────────────────────────────────────────────────────────────────
// Echte ellips, verhouding 1:2. Glasprijs is nog een PLACEHOLDER (€20/m²) tot de
// echte prijs bekend is — daarom niet naar main. Elips heeft een eigen, striktere
// optiematrix: alleen indirecte verlichting rondom, geen RGB, en een eigen
// bedieningslijst (CCT krijgt "Centraal" erbij, wat de basis-CCT niet heeft).

export const ELIPS_GLAS_PRIJS_M2 = 20 // PLACEHOLDER
export const ELIPS_CONSTRAINTS = { minShort: 40, maxLong: 200, ratio: 2 }

// Elips-lichttypes: geen RGB.
export const ELIPS_LIGHT_TYPES: LightType[] = ['3000k', '4000k', 'cct']

// Ellips-bediening per lichttype: 3000/4000K → Centraal, Touch, Motion sensor.
// CCT → alleen Afstandsbediening. Geen wip-schakelaar; RGB niet beschikbaar.
export const ELIPS_CONTROLS_FOR_TYPE: Record<LightType, { id: string; name: string; auto?: boolean }[]> = {
  '3000k': [
    { id: 'externe-schakeling', name: 'Centraal' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
  ],
  '4000k': [
    { id: 'externe-schakeling', name: 'Centraal' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
  ],
  cct: [
    { id: 'afstandsbediening',  name: 'Afstandsbediening' },
  ],
  rgbw: [], // n.v.t. voor Ellips
}

// Beschikbare bediening voor een vorm + lichttype (shape-bewust).
export function controlsForShapeType(shape: ShapeSlug, type: LightType): { id: string; name: string; auto?: boolean }[] {
  if (shape === 'elips') return ELIPS_CONTROLS_FOR_TYPE[type]
  return CONTROLS_FOR_TYPE[type]
}

// Beschikbare lichttypes voor een vorm.
export function lightTypesForShape(shape: ShapeSlug): LightType[] {
  if (shape === 'sol' || shape === 'luna') return ['3000k', '4000k']
  if (shape === 'elips') return ELIPS_LIGHT_TYPES
  return ['3000k', '4000k', 'rgbw', 'cct']
}

// ─── Glaskleur ────────────────────────────────────────────────────────────────

export const GLAS_KLEUREN: { id: GlasKleur; name: string; color: string }[] = [
  { id: 'helder',      name: 'Helder',      color: '#D4E8EF' },
  { id: 'smoke-zwart', name: 'Smoke Zwart', color: '#707070' },
  { id: 'smoke-brons', name: 'Smoke Brons', color: '#8B6830' },
]

// ─── Rechthoek glasprijs per m² ───────────────────────────────────────────────
// Vaste prijs per glaskleur, ongeacht verlichtingskeuze.
// Zandstraalbewerking (bij directe verlichting) wordt apart berekend per strekkende meter.

export const GLAS_PRIJS_M2: Record<GlasKleur, number> = {
  'helder':      175,
  'smoke-zwart': 236,
  'smoke-brons': 236,
}

export const VASTE_TOESLAG             = 105  // vaste productiekosten per spiegel
export const LED_PRIJS_PER_METER       = 99   // €/strekm voor alle lichttypen
export const ZANDSTRAAL_PRIJS_PER_METER = 50  // €/strekm zandstraalbaan bij directe verlichting

// ─── LED-meter berekeningen ───────────────────────────────────────────────────
// Direct: 10cm marge aan elke kant (20cm totaal per richting)
// Indirect: geen marge, volledige dimensie

export function calcDirectLEDMeters(position: string, widthCm: number, heightCm: number): number {
  const w = Math.max(0, (widthCm - 20) / 100)
  const h = Math.max(0, (heightCm - 20) / 100)
  switch (position) {
    case 'boven':         return w
    case 'boven-beneden': return 2 * w
    case 'links-rechts':  return 2 * h
    case 'rondom':        return 2 * w + 2 * h
    default: return 0
  }
}

export function calcIndirectLEDMeters(position: string, widthCm: number, heightCm: number): number {
  const w = widthCm / 100
  const h = heightCm / 100
  switch (position) {
    case 'boven':         return w
    case 'onder':         return w
    case 'boven-beneden': return 2 * w
    case 'links-rechts':  return 2 * h
    case 'rondom':        return 2 * w + 2 * h
    default: return 0
  }
}

// ─── Verwarmingsmatrix ────────────────────────────────────────────────────────
// Breedte en hoogte in cm

export const HEATING_MATRIX = [
  { maxW: 100, rows: [{ maxH: 80, price: 76  }, { maxH: 120, price: 152 }, { maxH: 160, price: 229 }] },
  { maxW: 200, rows: [{ maxH: 80, price: 114 }, { maxH: 120, price: 304 }, { maxH: 160, price: 455 }] },
  { maxW: 250, rows: [{ maxH: 80, price: 152 }, { maxH: 120, price: 456 }, { maxH: 160, price: 685 }] },
  { maxW: 300, rows: [{ maxH: 80, price: 190 }, { maxH: 120, price: 609 }, { maxH: 160, price: 915 }] },
]

export function calcHeatingPrice(widthCm: number, heightCm: number): number {
  const row  = HEATING_MATRIX.find(r => widthCm <= r.maxW)  ?? HEATING_MATRIX[HEATING_MATRIX.length - 1]
  const cell = row.rows.find(c => heightCm <= c.maxH)        ?? row.rows[row.rows.length - 1]
  return cell.price
}

// ─── Ronde spiegel basisprijs (glas, excl. vaste kosten) ─────────────────────
// Bron: prijzen_spiegels_rond.xlsx — kolom "standaard"

export const ROND_BASIS_GLAS: Record<number, number> = {
  30: 33, 40: 47, 50: 56, 60: 67, 70: 81, 80: 92, 100: 123, 120: 178,
}

// ─── Sol restmaten ────────────────────────────────────────────────────────────
// De Sol is een ronde spiegel die om het badkamermeubel valt. Twee afgeleide
// maten helpen de dealer bij het bestellen van het meubel:
//  - bovendeelHoogte: hoe hoog het ronde deel bóven het meubel uitkomt
//  - meubelVlakBreedte: de koorde op de meubel-bovenkant = de vlakke onderkant
//    van het bovendeel die op het meubel rust (= minimale meubelbreedte)
// Alle maten in cm. valid=false als het meubel hoger is dan de spiegel.
export function computeSolRestmaten(diameter: number, meubelHoogte: number, onderkant: number): {
  bovendeelHoogte: number
  meubelVlakBreedte: number
  valid: boolean
} {
  const r = diameter / 2
  const meubelTop = onderkant + meubelHoogte // afstand vanaf de onderkant van de cirkel
  const bovendeelHoogte = diameter - meubelTop
  const distVanCentrum = meubelTop - r
  const halveKoorde = Math.sqrt(Math.max(0, r * r - distVanCentrum * distVanCentrum))
  return {
    bovendeelHoogte: Math.round(bovendeelHoogte),
    meubelVlakBreedte: Math.round(halveKoorde * 2),
    valid: bovendeelHoogte > 0,
  }
}

// Luna = Sol met daarnaast een verticale muur-afsnede aan één zijde:
// 'afstand' cm van de cirkel verdwijnt achter de muur. Het meubelvlak wordt
// daardoor aan die kant begrensd door de muur i.p.v. de cirkelrand.
// De zijde (links/rechts) maakt voor de maten niet uit.
export function computeLunaRestmaten(diameter: number, meubelHoogte: number, onderkant: number, afstand: number): {
  bovendeelHoogte: number
  meubelVlakBreedte: number
  valid: boolean
} {
  const r = diameter / 2
  const meubelTop = onderkant + meubelHoogte
  const bovendeelHoogte = diameter - meubelTop
  const distVanCentrum = meubelTop - r
  const halveKoorde = Math.sqrt(Math.max(0, r * r - distVanCentrum * distVanCentrum))
  // Koorde-uiteinden op ±halveKoorde; muurcut op (afstand - r) vanaf het centrum
  const breedte = Math.min(2 * halveKoorde, halveKoorde + r - afstand)
  return {
    bovendeelHoogte: Math.round(bovendeelHoogte),
    meubelVlakBreedte: Math.round(Math.max(0, breedte)),
    valid: bovendeelHoogte > 0,
  }
}

// ─── Sol/Luna: maat van het grootste glasdeel (restmaat / bovendeel) ──────────
// De spiegel wordt uit een glasplaat gesneden die in één richting max 150 cm is;
// het deel kan gedraaid worden, dus de KORTSTE zijde moet passen. Alleen het
// grootste deel (het bovendeel) telt — losse delen worden apart geproduceerd.
// Deze helpers geven de omhullende maat van dát bovendeel (cm), gebruikt door de
// 150-check én de maatweergave. De vorm-opbouw zelf verandert hier niet.

export const SOL_LUNA_MAX_ZIJDE = 150

export type MainPieceMaten = { breedte: number; hoogte: number; meubelBreedte: number }

export function computeSolMainPiece(diameter: number, meubelHoogte: number, onderkant: number): MainPieceMaten {
  const r = diameter / 2
  const meubelTop = onderkant + meubelHoogte
  const hoogte = Math.max(0, diameter - meubelTop)
  const halveKoorde = Math.sqrt(Math.max(0, r * r - (meubelTop - r) * (meubelTop - r)))
  // Breedste koorde van het bovendeel: het midden (breedste punt) valt in het
  // bovendeel zolang de meubellijn op/onder het midden ligt → dan = diameter.
  const breedte = meubelTop <= r ? diameter : halveKoorde * 2
  return {
    breedte: Math.round(breedte),
    hoogte: Math.round(hoogte),
    meubelBreedte: Math.round(halveKoorde * 2),
  }
}

export function computeLunaMainPiece(diameter: number, meubelHoogte: number, onderkant: number, afstand: number): MainPieceMaten {
  const r = diameter / 2
  const meubelTop = onderkant + meubelHoogte
  const hoogte = Math.max(0, diameter - meubelTop)
  const halveKoorde = Math.sqrt(Math.max(0, r * r - (meubelTop - r) * (meubelTop - r)))
  // Halve breedte van het Sol-bovendeel, dan de wandafsnede aan één zijde eraf.
  const halfSol = meubelTop <= r ? r : halveKoorde
  const breedte = halfSol + Math.min(halfSol, r - afstand)
  const meubelBreedte = Math.min(2 * halveKoorde, halveKoorde + r - afstand)
  return {
    breedte: Math.round(Math.max(0, breedte)),
    hoogte: Math.round(hoogte),
    meubelBreedte: Math.round(Math.max(0, meubelBreedte)),
  }
}

// Beide zijden > 150 → niet te produceren (kortste zijde past niet op de plaat).
export function solLunaExceedsMax(m: MainPieceMaten): boolean {
  return m.breedte > SOL_LUNA_MAX_ZIJDE && m.hoogte > SOL_LUNA_MAX_ZIJDE
}

// ─── Sol/Luna catalogusprijzen ────────────────────────────────────────────────
// Bron: LoooX prijslijst 2026

export const SOL_CATALOGUS = {
  basis:        999,   // SPSOL1R80 — zonder extra deel
  metExtraDeel: 1199,  // SPSOL2R80 — incl. extra deel
}

export const LUNA_CATALOGUS = {
  basis:       829,  // SPLUNA1R90R/L — zonder extra deel
  extraDeel30: 210,  // Meubelhoogte ≤ 30cm: totaal €1039
  extraDeel35: 190,  // Meubelhoogte > 30cm: totaal €1019
}

// smoke-zwart en smoke-brons hebben dezelfde m²-prijs (€236), dus één constante is correct
export const RONDE_GLAS_SMOKE_M2 = GLAS_PRIJS_M2['smoke-zwart'] - GLAS_PRIJS_M2['helder']

// Frameprijzen rechthoek per strekkende meter (omtrek = 2×(b+h))
// Aluminium €20/m · Mat zwart €40/m · Geborstelde kleuren €60/m
export const RECHTHOEK_FRAME_PRIJS_PER_METER: Record<string, number> = {
  'aluminium':      20,
  'zwart':          40,
  'gun-metal':      60,
  'brushed-brass':  60,
  'brushed-copper': 60,
}

export function calcRechthoekFramePrice(colorId: string, widthCm: number, heightCm: number): number {
  const omtrekM = 2 * (widthCm + heightCm) / 100
  return Math.round(omtrekM * (RECHTHOEK_FRAME_PRIJS_PER_METER[colorId] ?? 20))
}

// Vaste frameprijzen per diameter (excl. standaard glas, excl. vaste kosten)
// Bron: prijzen_spiegels_rond.xlsx
export const ROND_FRAME_PRIJZEN: Record<string, Partial<Record<number, number>>> = {
  'aluminium':       { 30: 55,  40: 61,  50: 65,  60: 70,  70: 76,  80: 81,  100: 93,  120: 98  },
  'zwart':           { 30: 216, 40: 223, 50: 232, 60: 245, 70: 269, 80: 294, 100: 328, 120: 379 },
  'gun-metal':       { 60: 499, 80: 659, 100: 959 },
  'brushed-brass':   { 60: 499, 80: 659, 100: 959 },
  'brushed-copper':  { 60: 499, 80: 659, 100: 959 },
}

// LED-meters voor ronde spiegel
// Direct: LED zit 3cm terug van de rand → effectieve diameter = diameter - 6
// Indirect: volledige omtrek
export function calcRondDirectLEDMeters(position: string, diameterCm: number): number {
  if (position === 'rondom') return (Math.PI * (diameterCm - 6)) / 100
  return 0
}

export function calcRondIndirectLEDMeters(position: string, diameterCm: number): number {
  if (position === 'rondom') return (Math.PI * diameterCm) / 100
  return 0
}

// Verwarmingsprijs voor ronde spiegel (op basis van diameter)
export function calcRondHeatingPrice(diameterCm: number): number {
  if (diameterCm <= 60)  return 76
  if (diameterCm <= 90)  return 95
  if (diameterCm <= 120) return 115
  return 285
}

// ─── Glaskosten (voor procentuele opties) ────────────────────────────────────

export function calcGlasKosten(
  widthCm: number,
  heightCm: number,
  glasKleur: GlasKleur,
): number {
  const areaM2 = (widthCm / 100) * (heightCm / 100)
  return areaM2 * (GLAS_PRIJS_M2[glasKleur] ?? 175)
}

// Glasprijs afhankelijk van de vorm. Elips gebruikt een eigen €/m² (PLACEHOLDER
// €20) op de omhullende rechthoek; overige maatwerkvormen de reguliere prijs.
export function glasKostenForShape(shape: ShapeSlug, widthCm: number, heightCm: number, glasKleur: GlasKleur): number {
  if (shape === 'elips') return ((widthCm / 100) * (heightCm / 100)) * ELIPS_GLAS_PRIJS_M2
  return calcGlasKosten(widthCm, heightCm, glasKleur)
}

// ─── Extra opties ─────────────────────────────────────────────────────────────

export type ExtraOptionSubChoice = {
  id: string
  name: string
  color?: string
  image?: string
}

export type ExtraOption = {
  id: string
  name: string
  description: string
  price: number          // 0 voor dynamisch-geprijsde opties
  priceDisplay?: string  // label op de kaart als afwijkend van "+€{price}"
  shapes: ShapeSlug[]
  incompatibleWith: string[]
  shapeIncompatibleWith?: Partial<Record<ShapeSlug, string[]>>
  subChoices?: {
    label: string
    options: ExtraOptionSubChoice[]
  }
}

export const EXTRA_OPTIONS: ExtraOption[] = [
  {
    id: 'verwarming',
    name: 'Verwarming',
    description: 'Anti-condensverwarming achter de spiegel',
    price: 0,
    priceDisplay: 'v.a. €76',
    shapes: ['rechthoek', 'rond', 'organic', 'rounded-rect', 'ovaal', 'arc', 'sol', 'luna', 'op-aanvraag', 'elips'],
    incompatibleWith: [],
    shapeIncompatibleWith: { sol: ['digitale-klok', 'bluetooth-speaker'], luna: ['digitale-klok', 'bluetooth-speaker'] },
  },
  {
    id: 'makeup-spiegel',
    name: 'Make-up spiegel',
    description: 'Ingebouwde vergrotingsspiegel',
    price: 155,
    shapes: ['rechthoek', 'rond', 'rounded-rect', 'ovaal', 'arc', 'op-aanvraag'],
    incompatibleWith: [],
    subChoices: {
      label: 'Locatie',
      options: [
        { id: 'links',  name: 'Links' },
        { id: 'midden', name: 'Midden' },
        { id: 'rechts', name: 'Rechts' },
      ],
    },
  },
  {
    id: 'bluetooth-speaker',
    name: 'Bluetooth speaker',
    description: 'Verborgen speaker in het frame',
    price: 459,
    shapes: ['rechthoek', 'rond', 'organic', 'rounded-rect', 'ovaal', 'arc', 'sol', 'luna', 'op-aanvraag', 'elips'],
    incompatibleWith: [],
  },
  {
    id: 'afgeronde-hoeken',
    name: 'Afgeronde hoeken',
    description: 'Zachte ronde hoeken (R15mm)',
    price: 0,
    priceDisplay: '+60% glas',
    shapes: ['rechthoek'],
    incompatibleWith: ['schuine-zijden', 'frame-in-kleur'],
  },
  {
    id: 'digitale-klok',
    name: 'Digitale klok',
    description: 'LED tijdweergave geïntegreerd in de spiegel',
    price: 155,
    shapes: ['rechthoek', 'rond', 'organic', 'rounded-rect', 'ovaal', 'arc', 'sol', 'luna', 'op-aanvraag'],
    incompatibleWith: [],
    subChoices: {
      label: 'Positie',
      options: [
        { id: 'links',  name: 'Links' },
        { id: 'midden', name: 'Midden' },
        { id: 'rechts', name: 'Rechts' },
      ],
    },
  },
  {
    id: 'frame-in-kleur',
    name: 'Frame in kleur',
    description: 'Aluminium frame, keuze uit 5 kleuren',
    price: 0,
    shapes: ['rechthoek', 'rond', 'op-aanvraag'],
    incompatibleWith: ['afgeronde-hoeken', 'schuine-zijden'],
    subChoices: {
      label: 'Kleur',
      options: [
        { id: 'aluminium',      name: 'Aluminium',              image: '/icons/spiegel_kleur_alu.png' },
        { id: 'zwart',          name: 'Zwart',                  image: '/icons/spiegel_kleur_zwart.png' },
        { id: 'gun-metal',      name: 'Metallic Gun Metal',     image: '/icons/spiegel_kleur_gunmetal.png' },
        { id: 'brushed-brass',  name: 'Metallic Brushed Brass', image: '/icons/spiegel_kleur_brushed_brass.png' },
        { id: 'brushed-copper', name: 'Metallic Brushed Copper',image: '/icons/spiegel_kleur_brushed_copper.png' },
      ],
    },
  },
  {
    id: 'schuine-zijden',
    name: 'Schuine zijden',
    description: 'Eén of meerdere zijden van de spiegel onder een hoek gezaagd (bijv. 45°)',
    price: 0,
    priceDisplay: '+30% glas',
    shapes: ['rechthoek'],
    incompatibleWith: ['afgeronde-hoeken', 'frame-in-kleur'],
  },
  {
    id: 'sol-extra-deel',
    name: 'Sol extra deel',
    description: 'Optioneel onderste boogdeel dat onder het meubel uitsteekt',
    price: 0,
    shapes: ['sol'],
    incompatibleWith: [],
  },
  {
    id: 'luna-extra-deel',
    name: 'Luna extra deel',
    description: 'Optioneel onderste boogdeel dat onder het meubel uitsteekt',
    price: 0,
    shapes: ['luna'],
    incompatibleWith: [],
  },
]

// ─── Organic basisprijs per maat ─────────────────────────────────────────────

export const ORGANIC_BASE_PRICES: Record<string, number> = {
  '60x40': 281, '80x60': 345, '100x70': 420, '120x80': 510,
}

export const ORGANIC_INDIRECT_LED_PRICES: Record<string, number> = {
  '60x40': 275, '80x60': 330, '100x70': 359, '120x80': 369,
}

// ─── Prijsberekening ─────────────────────────────────────────────────────────

export function calcBasePrice(
  shape: ShapeSlug,
  width: number,
  height: number,
  diameter?: number,
  organicSizeKey?: string,
  glasKleur: GlasKleur = 'helder',
  _directPosition: string = 'geen',
): number {
  if (shape === 'projectspiegel') return 0
  if (shape === 'rechthoek' || shape === 'op-aanvraag' || shape === 'rounded-rect' || shape === 'ovaal' || shape === 'arc' || shape === 'elips') {
    return Math.round(glasKostenForShape(shape, width, height, glasKleur) + VASTE_TOESLAG)
  }
  if (shape === 'rond' && diameter) {
    return (ROND_BASIS_GLAS[diameter] ?? 92) + VASTE_TOESLAG
  }
  if (shape === 'organic') {
    return ORGANIC_BASE_PRICES[organicSizeKey ?? '60x40'] ?? 281
  }
  return 0
}

export function calcTotalPrice(state: {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur?: GlasKleur | null
  directPosition: string
  directType: LightType | null
  indirectPosition: string
  indirectType: LightType | null
  lightControl?: string | null    // gedeelde bediening; 1× geprijsd
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
}): number {
  const glasKleur: GlasKleur = state.glasKleur ?? 'helder'

  // Bediening wordt 1× geprijsd zodra er minstens één actief licht is (direct of indirect).
  const hasAnyLight =
    (state.directPosition !== 'geen' && state.directType != null) ||
    (state.indirectPosition !== 'geen' && state.indirectType != null)
  const controlPrice = hasAnyLight && state.lightControl ? (CONTROL_PRICES[state.lightControl] ?? 0) : 0

  // ── Projectspiegel: prijs apart berekend ─────────────────────────────────
  if (state.shape === 'projectspiegel') return 0

  // ── Sol: catalogusprijs + glaskleur meerprijs per m² ─────────────────────
  if (state.shape === 'sol') {
    const diameter = state.diameter ?? 80
    const radiusCm = diameter / 2
    const areaM2 = Math.PI * Math.pow(radiusCm / 100, 2)
    const glasMeerprijs = state.glasKleur === 'helder' ? 0 : Math.round(areaM2 * RONDE_GLAS_SMOKE_M2)
    const heeftExtraDeel = state.selectedOptions.includes('sol-extra-deel')
    const catalogBase = heeftExtraDeel ? SOL_CATALOGUS.metExtraDeel : SOL_CATALOGUS.basis
    return catalogBase + glasMeerprijs
  }

  // ── Luna: catalogusprijs + glaskleur meerprijs per m² ────────────────────
  if (state.shape === 'luna') {
    const diameter = state.diameter ?? 90
    const meubelHoogte = state.lunaMeubelHoogte ?? 35
    const radiusCm = diameter / 2
    const areaM2 = Math.PI * Math.pow(radiusCm / 100, 2)
    const glasMeerprijs = state.glasKleur === 'helder' ? 0 : Math.round(areaM2 * RONDE_GLAS_SMOKE_M2)
    const heeftExtraDeel = state.selectedOptions.includes('luna-extra-deel')
    let catalogBase = LUNA_CATALOGUS.basis
    if (heeftExtraDeel) {
      const useExpensiveTier = diameter > 160 || meubelHoogte <= 30
      catalogBase += useExpensiveTier ? LUNA_CATALOGUS.extraDeel30 : LUNA_CATALOGUS.extraDeel35
    }
    return catalogBase + glasMeerprijs
  }

  // ── Rechthoek / Afgeronde hoeken / Ovaal / Arc: zelfde glasprijs + LED ─────
  if (state.shape === 'rechthoek' || state.shape === 'rounded-rect' || state.shape === 'ovaal' || state.shape === 'arc' || state.shape === 'elips') {
    const glasKosten = glasKostenForShape(state.shape, state.width, state.height, glasKleur)
    let price = glasKosten + VASTE_TOESLAG

    // Direct LED + zandstraalbaan (alleen als positie + type gekozen)
    if (state.directPosition !== 'geen' && state.directType) {
      const directM = calcDirectLEDMeters(state.directPosition, state.width, state.height)
      price += directM * LED_PRIJS_PER_METER
      price += directM * ZANDSTRAAL_PRIJS_PER_METER
    }

    // Indirect LED (geen glasprijs-toeslag, wel LED-meters)
    if (state.indirectPosition !== 'geen' && state.indirectType) {
      price += calcIndirectLEDMeters(state.indirectPosition, state.width, state.height) * LED_PRIJS_PER_METER
    }

    price += controlPrice

    // Extra opties
    for (const optId of state.selectedOptions) {
      if (optId === 'verwarming') {
        price += calcHeatingPrice(state.width, state.height)
      } else if (optId === 'schuine-zijden') {
        price += Math.round(glasKosten * 0.30)
      } else if (optId === 'afgeronde-hoeken') {
        price += Math.round(glasKosten * 0.60)
      } else if (optId === 'frame-in-kleur') {
        const colorId = state.optionSubChoices?.['frame-in-kleur']
        if (colorId) price += calcRechthoekFramePrice(colorId, state.width, state.height)
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt) price += opt.price
      }
    }

    return Math.round(price)
  }

  // ── Rond: diameter-gebaseerde prijsberekening ─────────────────────────────
  if (state.shape === 'rond') {
    const diameter = state.diameter ?? 60
    let price = (ROND_BASIS_GLAS[diameter] ?? 92) + VASTE_TOESLAG
    if (glasKleur !== 'helder') {
      price += Math.round(Math.PI * Math.pow(diameter / 200, 2) * RONDE_GLAS_SMOKE_M2)
    }

    // Direct LED (voor rond altijd rondom, 6cm kleiner dan spiegeldiameter)
    if (state.directPosition !== 'geen' && state.directType) {
      price += calcRondDirectLEDMeters(state.directPosition, diameter) * LED_PRIJS_PER_METER
    }

    // Indirect LED (volledige omtrek)
    if (state.indirectPosition !== 'geen' && state.indirectType) {
      price += calcRondIndirectLEDMeters(state.indirectPosition, diameter) * LED_PRIJS_PER_METER
    }

    price += controlPrice

    // Extra opties
    for (const optId of state.selectedOptions) {
      if (optId === 'verwarming') {
        price += calcRondHeatingPrice(diameter)
      } else if (optId === 'frame-in-kleur') {
        const colorId = state.optionSubChoices?.['frame-in-kleur']
        if (colorId) {
          const framePrice = ROND_FRAME_PRIJZEN[colorId]?.[diameter]
          if (framePrice !== undefined) price += framePrice
        }
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt) price += opt.price
      }
    }

    return Math.round(price)
  }

  // ── Organic: vaste-prijs systeem ──────────────────────────────────────────
  let price = calcBasePrice(
    state.shape, state.width, state.height,
    state.diameter ?? undefined, state.organicSizeKey ?? undefined,
    glasKleur, state.directPosition,
  )
  if (glasKleur !== 'helder') {
    price += Math.round((state.width * state.height / 10000) * RONDE_GLAS_SMOKE_M2)
  }

  if (state.indirectPosition !== 'geen' && state.indirectType) {
    price += ORGANIC_INDIRECT_LED_PRICES[state.organicSizeKey ?? '60x40'] ?? 275
  }
  price += controlPrice

  for (const optId of state.selectedOptions) {
    if (optId === 'verwarming') {
      price += calcHeatingPrice(state.width, state.height)
    } else {
      const opt = EXTRA_OPTIONS.find(o => o.id === optId)
      if (opt) price += opt.price
    }
  }

  return Math.round(price)
}
