// Shared formatting helpers for PDF documents

export type ConfigOptions = {
  shape: string
  diameter?: number | null
  organicSizeKey?: string | null
  glasKleur?: string
  directLight?: { position?: string; type?: string | null; control?: string | null }
  indirectLight?: { position?: string; type?: string | null; control?: string | null }
  lightType?: string | null       // gedeeld lichttype voor direct + indirect
  lightControl?: string | null    // gedeelde bediening, 1× geprijsd
  extras?: string[]
  optionSubChoices?: Record<string, string>
  reference?: string
  description?: string
  quantity?: number
  attachmentUrl?: string | null
  discountType?: 'pct' | 'fixed' | null
  discountValue?: number | null
  discountAmount?: number | null
  solMeubelHoogte?: number | null
  solOnderkant?: number | null
  lunaMeubelHoogte?: number | null
  lunaOnderkant?: number | null
  lunaAfstand?: number | null
  lunaMuurZijde?: string | null
}

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
  'rounded-rect': 'Rechthoek afgerond',
  ovaal: 'Ovaal',
  elips: 'Ellips',
  arc: 'Boog (Arc)',
  sol: 'Sol',
  luna: 'Luna',
}

const GLAS_LABELS: Record<string, string> = {
  helder: 'Helder',
  'smoke-grijs': 'Smoke Grijs',
  'smoke-zwart': 'Smoke Zwart',
  'smoke-brons': 'Smoke Brons',
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
  // Op-aanvraag: de verlichtingskeuze is de soort (direct/indirect), opgeslagen in directLight.position
  direct: 'Direct',
  indirect: 'Indirect',
}

const TYPE_LABELS: Record<string, string> = {
  '3000k': '3000K warm wit',
  '4000k': '4000K neutraal wit',
  'rgbw':  'RGBW kleur',
  'cct':   'CCT instelbaar',
}

const CONTROL_LABELS: Record<string, string> = {
  'externe-schakeling': 'Externe schakeling',
  'tip-touch':          'Tip-Touch sensor',
  'wip-schakelaar':     'Wip schakelaar',
  'motion-sensor':      'Bewegingssensor',
  'afstandsbediening':  'Afstandsbediening',
}

const EXTRA_LABELS: Record<string, string> = {
  'verwarming':        'Spiegelverwarming',
  'makeup-spiegel':    'Make-up spiegel',
  'bluetooth-speaker': 'Bluetooth speaker',
  'afgeronde-hoeken':  'Afgeronde hoeken',
  'schuine-zijden':    'Schuine zijden',
  'sol-extra-deel':    'Sol extra deel',
  'luna-extra-deel':   'Luna extra deel',
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
  if (shape === 'rond') return opts.diameter ? `O ${opts.diameter} cm` : '—'
  if (shape === 'organic') return opts.organicSizeKey ? (ORGANIC_LABELS[opts.organicSizeKey] ?? opts.organicSizeKey) : '—'
  if (shape === 'op-aanvraag') return width && height ? `B ${width} × H ${height} cm` : 'Op aanvraag'
  if (shape === 'sol') return opts.diameter
    ? `⌀ ${opts.diameter} cm · meubel ${opts.solMeubelHoogte ?? '?'} cm · uitsteek ${opts.solOnderkant ?? '?'} cm` : '—'
  if (shape === 'luna') return opts.diameter
    ? `⌀ ${opts.diameter} cm · meubel ${opts.lunaMeubelHoogte ?? '?'} cm · ${opts.lunaMuurZijde ?? 'links'} ${opts.lunaAfstand ?? '?'} cm · uitsteek ${opts.lunaOnderkant ?? '?'} cm` : '—'
  if (width && height) return `B ${width} × H ${height} cm`
  return '—'
}

export function formatGlas(glasKleur?: string): string {
  return GLAS_LABELS[glasKleur ?? 'helder'] ?? (glasKleur ?? 'Helder')
}

export function formatLight(light?: ConfigOptions['directLight'], opts?: ConfigOptions): string {
  if (!light || !light.position || light.position === 'geen') return 'Geen'
  const pos = POSITION_LABELS[light.position] ?? light.position
  // Type/bediening zijn gedeeld; val terug op oude per-licht velden voor bestaande records.
  const sharedType = opts?.lightType ?? light.type ?? opts?.directLight?.type ?? opts?.indirectLight?.type ?? null
  const sharedControl = opts?.lightControl ?? light.control ?? opts?.directLight?.control ?? opts?.indirectLight?.control ?? null
  const type = sharedType ? (TYPE_LABELS[sharedType] ?? sharedType) : ''
  const ctrl = sharedControl ? (CONTROL_LABELS[sharedControl] ?? sharedControl) : ''
  return [pos, type, ctrl].filter(Boolean).join(' / ')
}

const POSITION_CHOICE_LABELS: Record<string, string> = {
  links: 'Links',
  midden: 'Midden',
  rechts: 'Rechts',
}

export function formatExtras(extras?: string[], optionSubChoices?: Record<string, string>): string {
  if (!extras || extras.length === 0) return 'Geen'
  const parts = extras.map(id => {
    if (id === 'frame-in-kleur') {
      const color = optionSubChoices?.['frame-in-kleur']
      return color ? `Frame in kleur (${FRAME_LABELS[color] ?? color})` : 'Frame in kleur'
    }
    if (id === 'digitale-klok') {
      const pos = optionSubChoices?.['digitale-klok']
      return pos ? `Digitale klok (${POSITION_CHOICE_LABELS[pos] ?? pos})` : 'Digitale klok'
    }
    if (id === 'makeup-spiegel') {
      const pos = optionSubChoices?.['makeup-spiegel']
      return pos ? `Make-up spiegel (${POSITION_CHOICE_LABELS[pos] ?? pos})` : 'Make-up spiegel'
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
  return `€ ${new Intl.NumberFormat('nl-NL').format(amount)}`
}
