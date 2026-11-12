import {
  HOUTKLEUREN, MEUBEL_FACTOR_DEFAULT, UITSPARING_MAX, getMeubelHoogte, getMeubelModel, ladeLabel, parseMeubelFactor,
  type LadeBreedtes, type MeubelInput, type MeubelModel,
} from '@/lib/meubel-config'

// Een meubel staat in dezelfde tabel als de spiegels (configurations), herkenbaar
// aan selected_options.shape = 'meubel' met de keuzes onder selected_options.meubel.
// Maten staan daar in mm; de kolommen width en height houden cm aan, net als bij spiegels.

export const MEUBEL_SHAPE = 'meubel'

export interface OpgeslagenMeubel {
  model: MeubelModel
  lengte: number
  lades: number
  ladeBreedtes: LadeBreedtes
  houtkleur: string
  houtkleurNaam: string
  factor: number
  /** Groter dan standaard: geen prijs, altijd op aanvraag */
  opAanvraag: boolean
  /** Met LoooX-logo (gratis optie) */
  logo: boolean
  /** Aantal uitsparingen of boorgaten; maattekening staat in attachmentUrl */
  uitsparingen: number
  attachmentUrl: string | null
  quantity: number
  reference: string
  description: string
}

export function isMeubelConfig(selectedOptions: unknown): boolean {
  return (selectedOptions as { shape?: unknown } | null)?.shape === MEUBEL_SHAPE
}

/** Leest een opgeslagen meubel uit selected_options; null als het geen (geldig) meubel is. */
export function leesMeubel(selectedOptions: unknown): OpgeslagenMeubel | null {
  if (!isMeubelConfig(selectedOptions)) return null
  const opts = selectedOptions as Record<string, unknown>
  const m = (opts.meubel ?? {}) as Record<string, unknown>
  const basisModel = getMeubelModel(String(m.modelId ?? ''))
  if (!basisModel) return null
  // Bij modellen met meerdere hoogtes geldt de gekozen hoogte overal waar het model wordt getoond
  const model = { ...basisModel, hoogte: getMeubelHoogte(basisModel, m.hoogte == null ? null : Number(m.hoogte)) }
  const kleur = HOUTKLEUREN.find((k) => k.id === m.houtkleur)
  const breedtes = Array.isArray(m.ladeBreedtes) ? m.ladeBreedtes.map(Number) : null
  return {
    model,
    lengte: Number(m.lengte) || 0,
    lades: Number(m.lades) || 1,
    ladeBreedtes: breedtes,
    houtkleur: kleur?.id ?? '',
    houtkleurNaam: kleur?.naam ?? '',
    factor: m.factor === undefined ? MEUBEL_FACTOR_DEFAULT : parseMeubelFactor(m.factor),
    opAanvraag: m.opAanvraag === true,
    logo: m.logo === true,
    uitsparingen: Math.min(UITSPARING_MAX, Math.max(0, Math.floor(Number(m.uitsparingen) || 0))),
    attachmentUrl: typeof opts.attachmentUrl === 'string' && opts.attachmentUrl ? opts.attachmentUrl : null,
    quantity: Math.max(1, Math.floor(Number(opts.quantity) || 1)),
    reference: typeof opts.reference === 'string' ? opts.reference : '',
    description: typeof opts.description === 'string' ? opts.description : '',
  }
}

/** Korte omschrijving voor lijsten: "Facet Double · 2000 mm · 3 × 2 lades · White". */
export function meubelSamenvatting(m: OpgeslagenMeubel): string {
  return [m.model.naam, `${m.lengte} mm`, ladeLabel(m.model, m.lades), m.houtkleurNaam].filter(Boolean).join(' · ')
}

/** Invoer voor de prijsmotor uit een opgeslagen meubel: één plek, zodat geen optie wordt vergeten. */
export function meubelPrijsInput(m: OpgeslagenMeubel): MeubelInput {
  return { modelId: m.model.id, lengte: m.lengte, lades: m.lades, houtkleur: m.houtkleur, uitsparingen: m.uitsparingen }
}
