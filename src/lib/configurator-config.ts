export type ShapeSlug = 'rechthoek' | 'rond' | 'organic' | 'op-aanvraag'
export type LightType = '3000k' | '4000k' | 'rgbw' | 'cct'
export type GlasKleur = 'helder' | 'smoke-grijs' | 'smoke-zwart'

export const SHAPES = [
  { slug: 'rechthoek' as ShapeSlug, name: 'Rechte hoeken',   description: 'Klassiek rechthoekig, volledig maatwerk', fromPrice: 149 },
  { slug: 'rond'      as ShapeSlug, name: 'Rond',            description: 'Perfecte cirkel, uit vaste diameters',   fromPrice: 138 },
  { slug: 'organic'   as ShapeSlug, name: 'Organic',         description: 'Vrije organische vorm, vaste afmetingen', fromPrice: 281 },
  { slug: 'op-aanvraag' as ShapeSlug, name: 'Op aanvraag',   description: 'Eigen ontwerp of bijzondere maat',        fromPrice: null },
]

export const ROND_DIAMETERS = [30, 40, 50, 60, 80, 100]

export const ORGANIC_SIZES = [
  { label: '60 × 40 cm', width: 60,  height: 40, key: '60x40' },
  { label: '80 × 60 cm', width: 80,  height: 60, key: '80x60' },
  { label: '100 × 70 cm', width: 100, height: 70, key: '100x70' },
  { label: '120 × 80 cm', width: 120, height: 80, key: '120x80' },
]

export const RECHTHOEK_CONSTRAINTS = { min: 40, max: 300 }

export const DIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek:    ['geen', 'boven', 'boven-beneden', 'links-rechts', 'rondom'],
  rond:         ['geen', 'rondom'],
  organic:      [],
  'op-aanvraag': ['geen', 'indirect', 'direct'],
}

export const INDIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek:    ['geen', 'boven', 'boven-beneden', 'onder', 'links-rechts', 'rondom'],
  rond:         ['geen', 'rondom'],
  organic:      ['geen', 'rondom'],
  'op-aanvraag': [],
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
  '3-staps-dimmer':     57,
  'wip-schakelaar':     57,
  'motion-sensor':      76,
  'afstandsbediening':  114,
}

export const CONTROLS_FOR_TYPE: Record<LightType, { id: string; name: string; auto?: boolean }[]> = {
  '3000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: '3-staps-dimmer',     name: '3-staps dimmer' },
    { id: 'wip-schakelaar',     name: 'Wip schakelaar' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
  ],
  '4000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch',          name: 'Tip-Touch' },
    { id: '3-staps-dimmer',     name: '3-staps dimmer' },
    { id: 'wip-schakelaar',     name: 'Wip schakelaar' },
    { id: 'motion-sensor',      name: 'Motion sensor' },
  ],
  rgbw: [{ id: 'afstandsbediening', name: 'Afstandsbediening', auto: true }],
  cct:  [
    { id: 'tip-touch',         name: 'Tip-Touch' },
    { id: 'afstandsbediening', name: 'Afstandsbediening' },
  ],
}

// ─── Glaskleur ────────────────────────────────────────────────────────────────

export const GLAS_KLEUREN: { id: GlasKleur; name: string; color: string }[] = [
  { id: 'helder',      name: 'Helder',      color: '#D4E8EF' },
  { id: 'smoke-grijs', name: 'Smoke Grijs', color: '#707070' },
  { id: 'smoke-zwart', name: 'Smoke Zwart', color: '#1E1E1E' },
]

// ─── Rechthoek glasprijs per m² ───────────────────────────────────────────────
// Prijs is afhankelijk van glaskleur én directe lichtpositie (zandstraalbewerking).
// Indirecte verlichting heeft géén invloed op de glasprijs.

const GLAS_PRIJS_M2: Record<GlasKleur, Record<string, number>> = {
  'helder': {
    'geen':          175,
    'boven':         215,
    'boven-beneden': 255,
    'links-rechts':  255,
    'rondom':        330,
  },
  'smoke-grijs': {
    'geen':          236,
    'boven':         288,
    'boven-beneden': 341,
    'links-rechts':  341,
    'rondom':        446,
  },
  'smoke-zwart': {
    'geen':          236,
    'boven':         288,
    'boven-beneden': 341,
    'links-rechts':  341,
    'rondom':        446,
  },
}

const VASTE_TOESLAG = 105       // vaste productiekosten per spiegel
const LED_PRIJS_PER_METER = 99  // €/strekm voor alle lichttypen

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

const HEATING_MATRIX = [
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

// ─── Glaskosten (voor procentuele opties) ────────────────────────────────────

export function calcGlasKosten(
  widthCm: number,
  heightCm: number,
  glasKleur: GlasKleur,
  directPosition: string,
): number {
  const areaM2 = (widthCm / 100) * (heightCm / 100)
  const prijs = GLAS_PRIJS_M2[glasKleur]?.[directPosition] ?? GLAS_PRIJS_M2[glasKleur]['geen']
  return areaM2 * prijs
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
    shapes: ['rechthoek', 'rond', 'organic'],
    incompatibleWith: [],
  },
  {
    id: 'makeup-spiegel',
    name: 'Make-up spiegel',
    description: 'Ingebouwde vergrotingsspiegel (5×)',
    price: 155,
    shapes: ['rechthoek', 'rond'],
    incompatibleWith: ['schuine-zijden'],
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
    shapes: ['rechthoek', 'rond', 'organic'],
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
    shapes: ['rechthoek', 'rond', 'organic'],
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
    description: 'Aluminium frame in kleur naar keuze',
    price: 80,
    shapes: ['rechthoek', 'rond'],
    incompatibleWith: ['afgeronde-hoeken'],
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
    description: 'Gefacetteerde zijkanten voor diepte-effect',
    price: 0,
    priceDisplay: '+30% glas',
    shapes: ['rechthoek'],
    incompatibleWith: ['afgeronde-hoeken', 'makeup-spiegel'],
  },
]

// ─── Prijsberekening ─────────────────────────────────────────────────────────

export function calcBasePrice(
  shape: ShapeSlug,
  width: number,
  height: number,
  diameter?: number,
  organicSizeKey?: string,
  glasKleur: GlasKleur = 'helder',
  directPosition: string = 'geen',
): number {
  if (shape === 'rechthoek' || shape === 'op-aanvraag') {
    return Math.round(calcGlasKosten(width, height, glasKleur, directPosition) + VASTE_TOESLAG)
  }
  if (shape === 'rond' && diameter) {
    const prices: Record<number, number> = { 30: 138, 40: 175, 50: 220, 60: 265, 80: 340, 100: 420 }
    return prices[diameter] ?? 138
  }
  if (shape === 'organic') {
    const prices: Record<string, number> = { '60x40': 281, '80x60': 345, '100x70': 420, '120x80': 510 }
    return prices[organicSizeKey ?? '60x40'] ?? 281
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
  directControl?: string | null
  indirectPosition: string
  indirectType: LightType | null
  indirectControl?: string | null
  selectedOptions: string[]
}): number {
  const glasKleur: GlasKleur = state.glasKleur ?? 'helder'

  // ── Rechthoek: echte prijsberekening ──────────────────────────────────────
  if (state.shape === 'rechthoek') {
    const glasKosten = calcGlasKosten(state.width, state.height, glasKleur, state.directPosition)
    let price = glasKosten + VASTE_TOESLAG

    // Direct LED (alleen als positie + type gekozen)
    if (state.directPosition !== 'geen' && state.directType) {
      price += calcDirectLEDMeters(state.directPosition, state.width, state.height) * LED_PRIJS_PER_METER
      if (state.directControl) price += CONTROL_PRICES[state.directControl] ?? 0
    }

    // Indirect LED (geen glasprijs-toeslag, wel LED-meters)
    if (state.indirectPosition !== 'geen' && state.indirectType) {
      price += calcIndirectLEDMeters(state.indirectPosition, state.width, state.height) * LED_PRIJS_PER_METER
      if (state.indirectControl) price += CONTROL_PRICES[state.indirectControl] ?? 0
    }

    // Extra opties
    for (const optId of state.selectedOptions) {
      if (optId === 'verwarming') {
        price += calcHeatingPrice(state.width, state.height)
      } else if (optId === 'schuine-zijden') {
        price += Math.round(glasKosten * 0.30)
      } else if (optId === 'afgeronde-hoeken') {
        price += Math.round(glasKosten * 0.60)
      } else {
        const opt = EXTRA_OPTIONS.find(o => o.id === optId)
        if (opt) price += opt.price
      }
    }

    return Math.round(price)
  }

  // ── Rond & Organic: vaste-prijs systeem ──────────────────────────────────
  let price = calcBasePrice(
    state.shape, state.width, state.height,
    state.diameter ?? undefined, state.organicSizeKey ?? undefined,
    glasKleur, state.directPosition,
  )

  if (state.directPosition !== 'geen' && state.directType) {
    if (state.directControl) price += CONTROL_PRICES[state.directControl] ?? 0
  }
  if (state.indirectPosition !== 'geen' && state.indirectType) {
    if (state.indirectControl) price += CONTROL_PRICES[state.indirectControl] ?? 0
  }

  for (const optId of state.selectedOptions) {
    if (optId === 'verwarming') {
      // rond/organic: gebruik breedte als diameter-equivalent
      const w = state.diameter ?? state.width
      price += calcHeatingPrice(w, w)
    } else {
      const opt = EXTRA_OPTIONS.find(o => o.id === optId)
      if (opt) price += opt.price
    }
  }

  return Math.round(price)
}
