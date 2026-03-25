// Shared formatting helpers for PDF documents

export type ConfigOptions = {
  shape: string
  diameter?: number | null
  organicSizeKey?: string | null
  glasKleur?: string
  directLight?: { position?: string; type?: string | null; control?: string | null }
  indirectLight?: { position?: string; type?: string | null; control?: string | null }
  extras?: string[]
  optionSubChoices?: Record<string, string>
  reference?: string
  description?: string
  quantity?: number
}

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
}

const GLAS_LABELS: Record<string, string> = {
  helder: 'Helder',
  brons: 'Brons',
  grijs: 'Grijs',
  zwart: 'Zwart',
}

const POSITION_LABELS: Record<string, string> = {
  geen: 'Geen',
  boven: 'Boven',
  onder: 'Onder',
  links: 'Links',
  rechts: 'Rechts',
  rondom: 'Rondom',
  'boven-onder': 'Boven & onder',
  'boven-beneden': 'Boven & onder',
  'links-rechts': 'Links & rechts',
}

const TYPE_LABELS: Record<string, string> = {
  cct: 'CCT (warm/koud)',
  warm: 'Warm wit',
  koud: 'Koud wit',
  rgb: 'RGB',
  led: 'LED',
}

const CONTROL_LABELS: Record<string, string> = {
  aanraak: 'Aanraaksensor',
  dimmer: 'Dimmer',
  schakelaar: 'Schakelaar',
  app: 'App-bediening',
  ir: 'IR-afstandsbediening',
}

const EXTRA_LABELS: Record<string, string> = {
  verwarming: 'Spiegelverwarming',
  bluetooth: 'Bluetooth speaker',
  'make-up': 'Make-up verlichting',
  'schuine-zijden': 'Schuine zijden',
  'ip44': 'IP44 waterdichte uitvoering',
  stopcontact: 'Stopcontact in lijst',
}

const FRAME_LABELS: Record<string, string> = {
  aluminium: 'Aluminium',
  zwart: 'Zwart',
  'gun-metal': 'Gun Metal',
  'brushed-brass': 'Brushed Brass',
  'brushed-copper': 'Brushed Copper',
}

const ORGANIC_LABELS: Record<string, string> = {
  'S': 'Small (±50×70 cm)',
  'M': 'Medium (±60×90 cm)',
  'L': 'Large (±80×120 cm)',
  'XL': 'Extra Large (±100×150 cm)',
}

export function formatShape(shape: string): string {
  return SHAPE_LABELS[shape] ?? shape
}

export function formatDimensions(
  shape: string,
  width: number | null,
  height: number | null,
  opts: ConfigOptions
): string {
  if (shape === 'rond') return opts.diameter ? `⌀ ${opts.diameter} cm` : '—'
  if (shape === 'organic') return opts.organicSizeKey ? (ORGANIC_LABELS[opts.organicSizeKey] ?? opts.organicSizeKey) : '—'
  if (shape === 'op-aanvraag') return 'Op aanvraag'
  if (width && height) return `${width} × ${height} cm`
  return '—'
}

export function formatGlas(glasKleur?: string): string {
  return GLAS_LABELS[glasKleur ?? 'helder'] ?? (glasKleur ?? 'Helder')
}

export function formatLight(light?: ConfigOptions['directLight']): string {
  if (!light || !light.position || light.position === 'geen') return 'Geen'
  const pos = POSITION_LABELS[light.position] ?? light.position
  const type = light.type ? (TYPE_LABELS[light.type] ?? light.type) : ''
  const ctrl = light.control ? (CONTROL_LABELS[light.control] ?? light.control) : ''
  return [pos, type, ctrl].filter(Boolean).join(' · ')
}

export function formatExtras(extras?: string[], optionSubChoices?: Record<string, string>): string {
  if (!extras || extras.length === 0) return 'Geen'
  const parts = extras.map(id => {
    if (id === 'frame-in-kleur') {
      const color = optionSubChoices?.['frame-in-kleur']
      return color ? `Frame in kleur (${FRAME_LABELS[color] ?? color})` : 'Frame in kleur'
    }
    return EXTRA_LABELS[id] ?? id
  })
  return parts.join(', ')
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatPrice(amount: number): string {
  return `€\u202F${amount.toLocaleString('nl-NL')}`
}
