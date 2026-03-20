export type ShapeSlug = 'rechthoek' | 'rond' | 'organic' | 'op-aanvraag'
export type LightType = '3000k' | '4000k' | 'rgbw' | 'cct'

export const SHAPES = [
  {
    slug: 'rechthoek' as ShapeSlug,
    name: 'Rechte hoeken',
    description: 'Klassiek rechthoekig, volledig maatwerk',
    fromPrice: 149,
  },
  {
    slug: 'rond' as ShapeSlug,
    name: 'Rond',
    description: 'Perfecte cirkel, uit vaste diameters',
    fromPrice: 138,
  },
  {
    slug: 'organic' as ShapeSlug,
    name: 'Organic',
    description: 'Vrije organische vorm, vaste afmetingen',
    fromPrice: 281,
  },
  {
    slug: 'op-aanvraag' as ShapeSlug,
    name: 'Op aanvraag',
    description: 'Eigen ontwerp of bijzondere maat',
    fromPrice: null,
  },
]

export const ROND_DIAMETERS = [30, 40, 50, 60, 80, 100]

export const ORGANIC_SIZES = [
  { label: '60 × 40 cm', width: 60, height: 40, key: '60x40' },
  { label: '80 × 60 cm', width: 80, height: 60, key: '80x60' },
  { label: '100 × 70 cm', width: 100, height: 70, key: '100x70' },
  { label: '120 × 80 cm', width: 120, height: 80, key: '120x80' },
]

export const RECHTHOEK_CONSTRAINTS = { min: 40, max: 300 }

export const DIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek: ['geen', 'boven', 'boven-beneden', 'links-rechts', 'rondom'],
  rond: ['geen', 'rondom'],
  organic: [],
  'op-aanvraag': ['geen', 'indirect', 'direct'],
}

export const INDIRECT_LIGHT_POSITIONS: Record<ShapeSlug, string[]> = {
  rechthoek: ['geen', 'boven-beneden', 'onder', 'links-rechts', 'rondom'],
  rond: ['geen', 'rondom'],
  organic: ['geen', 'rondom'],
  'op-aanvraag': [],
}

export const POSITION_LABELS: Record<string, string> = {
  geen: 'Geen',
  boven: 'Boven',
  'boven-beneden': 'Boven + Beneden',
  'links-rechts': 'Links + Rechts',
  rondom: 'Rondom',
  onder: 'Onder',
  indirect: 'Indirect',
  direct: 'Direct',
}

export const LIGHT_TYPE_LABELS: Record<LightType, string> = {
  '3000k': '3000K',
  '4000k': '4000K',
  rgbw: 'RGB+W',
  cct: 'CCT',
}

export const LIGHT_TYPE_DESCRIPTIONS: Record<LightType, string> = {
  '3000k': 'Warm wit — sfeervol en ontspannend',
  '4000k': 'Neutraal wit — helder en functioneel',
  rgbw: 'Kleurveranderend — sfeer naar wens',
  cct: 'Instelbaar — van warm naar koel',
}

export const CONTROL_PRICES: Record<string, number> = {
  'externe-schakeling': 0,
  'tip-touch': 57,
  '3-staps-dimmer': 57,
  'wip-schakelaar': 57,
  'motion-sensor': 76,
  'afstandsbediening': 114,
}

export const CONTROLS_FOR_TYPE: Record<LightType, { id: string; name: string; auto?: boolean }[]> = {
  '3000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch', name: 'Tip-Touch' },
    { id: '3-staps-dimmer', name: '3-staps dimmer' },
    { id: 'wip-schakelaar', name: 'Wip schakelaar' },
    { id: 'motion-sensor', name: 'Motion sensor' },
  ],
  '4000k': [
    { id: 'externe-schakeling', name: 'Externe schakeling' },
    { id: 'tip-touch', name: 'Tip-Touch' },
    { id: '3-staps-dimmer', name: '3-staps dimmer' },
    { id: 'wip-schakelaar', name: 'Wip schakelaar' },
    { id: 'motion-sensor', name: 'Motion sensor' },
  ],
  rgbw: [{ id: 'afstandsbediening', name: 'Afstandsbediening', auto: true }],
  cct: [
    { id: 'tip-touch', name: 'Tip-Touch' },
    { id: 'afstandsbediening', name: 'Afstandsbediening' },
  ],
}

export type ExtraOptionSubChoice = {
  id: string
  name: string
  color?: string   // hex color for swatches
  image?: string   // image path for swatches
}

export type ExtraOption = {
  id: string
  name: string
  description: string
  price: number
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
    price: 95,
    shapes: ['rechthoek', 'rond', 'organic'],
    incompatibleWith: [],
  },
  {
    id: 'makeup-spiegel',
    name: 'Make-up spiegel',
    description: 'Ingebouwde vergrotingsspiegel (5×)',
    price: 145,
    shapes: ['rechthoek', 'rond'],
    incompatibleWith: ['schuine-zijden'],
    subChoices: {
      label: 'Locatie',
      options: [
        { id: 'links', name: 'Links' },
        { id: 'midden', name: 'Midden' },
        { id: 'rechts', name: 'Rechts' },
      ],
    },
  },
  {
    id: 'bluetooth-speaker',
    name: 'Bluetooth speaker',
    description: 'Verborgen speaker in het frame',
    price: 65,
    shapes: ['rechthoek', 'rond', 'organic'],
    incompatibleWith: [],
  },
  {
    id: 'afgeronde-hoeken',
    name: 'Afgeronde hoeken',
    description: 'Zachte ronde hoeken (R15mm)',
    price: 35,
    shapes: ['rechthoek'],
    incompatibleWith: ['schuine-zijden', 'frame-in-kleur'],
  },
  {
    id: 'digitale-klok',
    name: 'Digitale klok',
    description: 'LED tijdweergave geïntegreerd in de spiegel',
    price: 55,
    shapes: ['rechthoek', 'rond', 'organic'],
    incompatibleWith: [],
    subChoices: {
      label: 'Positie',
      options: [
        { id: 'links', name: 'Links' },
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
        { id: 'aluminium', name: 'Aluminium', image: '/icons/spiegel_kleur_alu.png' },
        { id: 'zwart', name: 'Zwart', image: '/icons/spiegel_kleur_zwart.png' },
        { id: 'gun-metal', name: 'Metallic Gun Metal', image: '/icons/spiegel_kleur_gunmetal.png' },
        { id: 'brushed-brass', name: 'Metallic Brushed Brass', image: '/icons/spiegel_kleur_brushed_brass.png' },
        { id: 'brushed-copper', name: 'Metallic Brushed Copper', image: '/icons/spiegel_kleur_brushed_copper.png' },
      ],
    },
  },
  {
    id: 'schuine-zijden',
    name: 'Schuine zijden',
    description: 'Gefacetteerde zijkanten voor diepte-effect',
    price: 120,
    shapes: ['rechthoek'],
    incompatibleWith: ['afgeronde-hoeken', 'makeup-spiegel'],
  },
]

const LIGHT_TYPE_PRICE: Record<LightType, number> = {
  '3000k': 120,
  '4000k': 130,
  rgbw: 195,
  cct: 165,
}

export function calcBasePrice(
  shape: ShapeSlug,
  width: number,
  height: number,
  diameter?: number,
  organicSizeKey?: string,
): number {
  if (shape === 'rechthoek') {
    const area = width * height
    return Math.max(149, Math.round(area * 0.035))
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
  directPosition: string
  directType: LightType | null
  directControl?: string | null
  indirectPosition: string
  indirectType: LightType | null
  indirectControl?: string | null
  selectedOptions: string[]
}): number {
  let price = calcBasePrice(
    state.shape,
    state.width,
    state.height,
    state.diameter ?? undefined,
    state.organicSizeKey ?? undefined,
  )

  if (state.directPosition !== 'geen' && state.directType) {
    price += LIGHT_TYPE_PRICE[state.directType]
    if (state.directControl) price += CONTROL_PRICES[state.directControl] ?? 0
  }
  if (state.indirectPosition !== 'geen' && state.indirectType) {
    price += LIGHT_TYPE_PRICE[state.indirectType]
    if (state.indirectControl) price += CONTROL_PRICES[state.indirectControl] ?? 0
  }

  for (const optId of state.selectedOptions) {
    const opt = EXTRA_OPTIONS.find((o) => o.id === optId)
    if (opt) price += opt.price
  }

  return price
}

export const GLAS_KLEUREN = [
  { id: 'helder', name: 'Helder', color: '#E8F0F5' },
  { id: 'bronze', name: 'Bronze', color: '#8B6F5E' },
  { id: 'grey', name: 'Grey', color: '#6B7280' },
]
