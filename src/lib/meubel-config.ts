// Tailor-Made meubels (configurator 2.0).
// Bron: inkoopprijslijst Tailor-Made, geldig vanaf 1 juli 2026 (netto, excl. btw).
// Alle bedragen in centen. In beeld en op de offerte staat altijd bruto
// (netto × factor van het bedrijf); netto is alleen voor de bestelstap.

export const MEUBEL_FACTOR_DEFAULT = 2
export const MEUBEL_FACTOR_MAX = 10
export const LADE_MIN_CM = 30
export const LADE_MAX_CM = 120
export const UITSPARING_NETTO_CENTS = 1040
export const UITSPARING_MAX = 10

// Staffel: lengtebereik in hele cm met de prijs per aantal lades naast elkaar.
// Bij dubbele modellen (2 rijen) is de sleutel het aantal kolommen: 2 = "2×2".
interface Staffel {
  min: number
  max: number
  prijzen: Record<number, number>
}

export interface MeubelModel {
  id: string
  naam: string
  omschrijving: string
  afbeelding: string
  diepte: number
  hoogte: number
  /** Aantal laderijen boven elkaar */
  rijen: number
  staffels: Staffel[]
}

export const MEUBEL_MODELLEN: MeubelModel[] = [
  {
    id: 'facet',
    naam: 'Facet',
    omschrijving: 'Greeploos ladenmeubel met facetrand.',
    afbeelding: '/images/meubels/facet.webp',
    diepte: 46,
    hoogte: 30,
    rijen: 1,
    staffels: [
      { min: 50,  max: 120, prijzen: { 1: 98176, 2: 115336 } },
      { min: 121, max: 129, prijzen: { 2: 122616 } },
      { min: 130, max: 190, prijzen: { 2: 155896, 3: 179816 } },
      { min: 191, max: 210, prijzen: { 2: 169416, 3: 196456, 4: 222456 } },
      { min: 211, max: 260, prijzen: { 2: 192296, 3: 214136, 4: 249496 } },
    ],
  },
  {
    id: 'facet-double',
    naam: 'Facet Double',
    omschrijving: 'Facet met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/facet-double.webp',
    diepte: 46,
    hoogte: 60,
    rijen: 2,
    staffels: [
      { min: 50,  max: 120, prijzen: { 1: 142376, 2: 175136 } },
      { min: 121, max: 129, prijzen: { 2: 187096 } },
      { min: 130, max: 190, prijzen: { 2: 226616, 3: 264056 } },
      { min: 191, max: 210, prijzen: { 2: 230256, 3: 285896 } },
      { min: 211, max: 260, prijzen: { 2: 248976, 3: 304616 } },
      { min: 261, max: 290, prijzen: { 3: 323336 } },
    ],
  },
]

export interface Houtkleur {
  id: string
  naam: string
  meerprijs: number
}

export const HOUTKLEUREN: Houtkleur[] = [
  { id: 'white',      naam: 'White',      meerprijs: 4160 },
  { id: 'pure',       naam: 'Pure',       meerprijs: 4160 },
  { id: 'old-grey',   naam: 'Old Grey',   meerprijs: 0 },
  { id: 'dark-grey',  naam: 'Dark Grey',  meerprijs: 4160 },
  { id: 'brown-grey', naam: 'Brown Grey', meerprijs: 4160 },
  { id: 'dark-brown', naam: 'Dark Brown', meerprijs: 4160 },
  { id: 'black',      naam: 'Black',      meerprijs: 0 },
]

export const HOUTKLEUR_DEFAULT = 'old-grey'

export function houtkleurAfbeelding(id: string): string {
  return `/images/meubels/hout/${id}.webp`
}

export function getMeubelModel(id: string): MeubelModel | null {
  return MEUBEL_MODELLEN.find((m) => m.id === id) ?? null
}

export function getLengteBereik(model: MeubelModel): { min: number; max: number } {
  return {
    min: Math.min(...model.staffels.map((s) => s.min)),
    max: Math.max(...model.staffels.map((s) => s.max)),
  }
}

function findStaffel(model: MeubelModel, lengte: number): Staffel | null {
  if (!Number.isInteger(lengte)) return null
  return model.staffels.find((s) => lengte >= s.min && lengte <= s.max) ?? null
}

/**
 * Aantal lades (kolommen) dat bij deze lengte te bestellen is.
 * De prijslijst is leidend (Mark, 12 nov): elke combinatie die erin staat mag,
 * ook als een gelijke verdeling buiten 30 tot 120 cm per lade valt.
 */
export function getLadeOpties(model: MeubelModel, lengte: number): number[] {
  const staffel = findStaffel(model, lengte)
  if (!staffel) return []
  return Object.keys(staffel.prijzen).map(Number).sort((a, b) => a - b)
}

export function ladeLabel(model: MeubelModel, kolommen: number): string {
  if (model.rijen > 1) return `${kolommen} × ${model.rijen} lades`
  return kolommen === 1 ? '1 lade' : `${kolommen} lades`
}

export interface MeubelInput {
  modelId: string
  lengte: number
  lades: number
  houtkleur: string
  uitsparingen?: number
}

/** Netto per stuk in centen, of null bij een ongeldige combinatie. Niet tonen buiten de bestelstap. */
export function calcMeubelNettoCents(input: MeubelInput): number | null {
  const model = getMeubelModel(input.modelId)
  if (!model) return null
  if (!getLadeOpties(model, input.lengte).includes(input.lades)) return null
  const staffel = findStaffel(model, input.lengte)
  const kleur = HOUTKLEUREN.find((k) => k.id === input.houtkleur)
  if (!staffel || !kleur) return null
  const uitsparingen = input.uitsparingen ?? 0
  if (!Number.isInteger(uitsparingen) || uitsparingen < 0 || uitsparingen > UITSPARING_MAX) return null
  return staffel.prijzen[input.lades] + kleur.meerprijs + uitsparingen * UITSPARING_NETTO_CENTS
}

export function parseMeubelFactor(v: unknown): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > MEUBEL_FACTOR_MAX) return MEUBEL_FACTOR_DEFAULT
  return Math.round(n * 100) / 100
}

/** Bruto per stuk in centen: de prijs die in beeld en op de offerte staat. */
export function calcMeubelBrutoCents(input: MeubelInput, factor: number): number | null {
  const netto = calcMeubelNettoCents(input)
  if (netto === null) return null
  return Math.round(netto * parseMeubelFactor(factor))
}

export function formatCents(cents: number): string {
  return `€ ${(cents / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface MeubelPrijsRegel {
  label: string
  cents: number
}

/**
 * Bruto prijsopbouw voor het prijspaneel. De regels tellen altijd exact op tot
 * het totaal: afronding door de factor komt in de basisregel terecht.
 */
export function getMeubelPrijsOpbouw(input: MeubelInput, factor: number): { regels: MeubelPrijsRegel[]; totaal: number } | null {
  const totaal = calcMeubelBrutoCents(input, factor)
  const model = getMeubelModel(input.modelId)
  const kleur = HOUTKLEUREN.find((k) => k.id === input.houtkleur)
  if (totaal === null || !model || !kleur) return null
  const f = parseMeubelFactor(factor)
  const extra: MeubelPrijsRegel[] = []
  if (kleur.meerprijs > 0) extra.push({ label: `Houtkleur · ${kleur.naam}`, cents: Math.round(kleur.meerprijs * f) })
  const uitsparingen = input.uitsparingen ?? 0
  if (uitsparingen > 0) extra.push({ label: `Uitsparing · ${uitsparingen}×`, cents: Math.round(uitsparingen * UITSPARING_NETTO_CENTS * f) })
  const basis = totaal - extra.reduce((som, r) => som + r.cents, 0)
  return {
    regels: [{ label: `${model.naam} ${input.lengte} cm · ${ladeLabel(model, input.lades)}`, cents: basis }, ...extra],
    totaal,
  }
}
