// Tailor-Made meubels (configurator 2.0).
// Bron: inkoopprijslijst Tailor-Made, geldig vanaf 1 juli 2026 (netto, excl. btw).
// Alle bedragen in centen, alle maten in hele millimeters. In beeld en op de offerte staat altijd bruto
// (netto × factor van het bedrijf); netto is alleen voor de bestelstap.

export const MEUBEL_FACTOR_DEFAULT = 2
export const MEUBEL_FACTOR_MAX = 10
// Een lade is 350 tot 1200 mm breed (Mark, 12 nov). Harde grenzen, ook bij gelijke verdeling.
export const LADE_MIN_MM = 350
export const LADE_MAX_MM = 1200
export const UITSPARING_NETTO_CENTS = 1040
export const UITSPARING_MAX = 10

// Staffel: lengtebereik in cm, letterlijk zoals in de prijslijst, met de prijs per
// aantal lades naast elkaar. De configurator rekent in mm: een lengte valt in de
// eerste staffel waarvan de bovengrens niet wordt overschreden (1201 mm is dus
// de staffel 121 tot 129 cm, 1291 mm de staffel 130 tot 190 cm).
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
  /** Diepte in mm */
  diepte: number
  /** Hoogte in mm */
  hoogte: number
  /** Aantal laderijen boven elkaar */
  rijen: number
  /** Rand van het frame in mm (U-Floor 40, U-Frame en Full-Frame 50); de dealer krijgt een melding bij de ladeverdeling */
  rand?: number
  staffels: Staffel[]
}

export const MEUBEL_MODELLEN: MeubelModel[] = [
  {
    id: 'facet',
    naam: 'Facet',
    omschrijving: 'Greeploos ladenmeubel met facetrand.',
    afbeelding: '/images/meubels/model-facet.webp',
    diepte: 460,
    hoogte: 300,
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
    afbeelding: '/images/meubels/model-facet-double.webp',
    diepte: 460,
    hoogte: 600,
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
  /** Donker hout: de tekening gebruikt dan lichte lijnen */
  donker?: boolean
}

export const HOUTKLEUREN: Houtkleur[] = [
  { id: 'white',      naam: 'White',      meerprijs: 4160 },
  { id: 'pure',       naam: 'Pure',       meerprijs: 4160 },
  { id: 'old-grey',   naam: 'Old Grey',   meerprijs: 0 },
  { id: 'dark-grey',  naam: 'Dark Grey',  meerprijs: 4160 },
  { id: 'brown-grey', naam: 'Brown Grey', meerprijs: 4160, donker: true },
  { id: 'dark-brown', naam: 'Dark Brown', meerprijs: 4160, donker: true },
  { id: 'black',      naam: 'Black',      meerprijs: 0, donker: true },
]

export const HOUTKLEUR_DEFAULT = 'old-grey'

export function houtkleurAfbeelding(id: string): string {
  return `/images/meubels/hout/${id}.webp`
}

export function getMeubelModel(id: string): MeubelModel | null {
  return MEUBEL_MODELLEN.find((m) => m.id === id) ?? null
}

/** Standaardbereik van de lengte in mm. */
export function getLengteBereik(model: MeubelModel): { min: number; max: number } {
  return {
    min: Math.min(...model.staffels.map((s) => s.min)) * 10,
    max: Math.max(...model.staffels.map((s) => s.max)) * 10,
  }
}

function findStaffel(model: MeubelModel, lengte: number): Staffel | null {
  const bereik = getLengteBereik(model)
  if (!Number.isInteger(lengte) || lengte < bereik.min || lengte > bereik.max) return null
  // Staffels staan oplopend: de eerste waarvan de bovengrens niet wordt overschreden
  return model.staffels.find((s) => lengte <= s.max * 10) ?? null
}

/**
 * Aantal lades (kolommen) dat bij deze lengte te bestellen is: de combinaties
 * uit de prijslijst, zolang een lade bij gelijke verdeling 350 tot 1200 mm is.
 */
export function getLadeOpties(model: MeubelModel, lengte: number): number[] {
  const staffel = findStaffel(model, lengte)
  if (!staffel) return []
  return Object.keys(staffel.prijzen)
    .map(Number)
    .filter((n) => lengte / n >= LADE_MIN_MM && lengte / n <= LADE_MAX_MM)
    .sort((a, b) => a - b)
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
  /** Groter dan de standaardmaten: geen tabelprijs, altijd op aanvraag */
  opAanvraag?: boolean
}

/** Netto per stuk in centen, of null bij een ongeldige combinatie. Niet tonen buiten de bestelstap. */
export function calcMeubelNettoCents(input: MeubelInput): number | null {
  const model = getMeubelModel(input.modelId)
  if (!model || input.opAanvraag) return null
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
    regels: [{ label: `${model.naam} ${input.lengte} mm · ${ladeLabel(model, input.lades)}`, cents: basis }, ...extra],
    totaal,
  }
}

// ─── Lade-indeling ──────────────────────────────────────────────────────────
// Standaard zijn de lades gelijk verdeeld (ladeBreedtes = null). Past de dealer
// de breedtes aan, dan zijn het hele millimeters van 350 tot 1200 mm die samen
// de lengte van het meubel vormen. Bij dubbele modellen gelden de breedtes
// voor beide rijen.

export type LadeBreedtes = number[] | null

/** Foutmelding bij een ongeldige indeling, anders null. */
export function valideerLadeBreedtes(breedtes: LadeBreedtes, lengte: number, lades: number): string | null {
  if (breedtes === null) return null
  if (!Array.isArray(breedtes) || breedtes.length !== lades) return 'Het aantal breedtes klopt niet met het aantal lades.'
  if (breedtes.some((b) => !Number.isInteger(b))) return 'Vul hele millimeters in.'
  if (breedtes.some((b) => b < LADE_MIN_MM || b > LADE_MAX_MM)) return `Elke lade moet tussen ${LADE_MIN_MM} en ${LADE_MAX_MM} mm breed zijn.`
  if (breedtes.reduce((som, b) => som + b, 0) !== lengte) return `De lades moeten samen ${lengte} mm zijn.`
  return null
}

/**
 * Gelijke verdeling in hele mm. Komt de lengte niet precies uit, dan zijn de
 * eerste lades 1 mm breder (2000 mm over 3 lades: 667, 667, 666).
 */
export function verdeelGelijk(lengte: number, lades: number): number[] {
  const basis = Math.floor(lengte / lades)
  const rest = lengte - basis * lades
  return Array.from({ length: lades }, (_, i) => basis + (i < rest ? 1 : 0))
}

/** Breedte per lade voor tekening en samenvatting. */
export function getLadeBreedtes(breedtes: LadeBreedtes, lengte: number, lades: number): number[] {
  if (breedtes && valideerLadeBreedtes(breedtes, lengte, lades) === null) return breedtes
  return verdeelGelijk(lengte, lades)
}

/** Startpunt voor zelf aanpassen: de gelijke verdeling. */
export function startLadeBreedtes(lengte: number, lades: number): number[] {
  return verdeelGelijk(lengte, lades)
}

/** Kan deze lengte met dit aantal lades handmatig worden ingedeeld (elke lade 350 tot 1200 mm)? */
export function kanLadesAanpassen(lengte: number, lades: number): boolean {
  return lades > 1 && lengte >= lades * LADE_MIN_MM && lengte <= lades * LADE_MAX_MM
}

export function ladeBreedtesTekst(breedtes: LadeBreedtes, lengte: number, lades: number): string {
  const b = getLadeBreedtes(breedtes, lengte, lades)
  if (breedtes && b === breedtes) return `${b.join(' + ')} mm`
  return b.every((x) => x === b[0]) ? `Gelijk verdeeld, ${b[0]} mm per lade` : `Gelijk verdeeld, ${b.join(' + ')} mm`
}

export const MEUBEL_AANTAL_MAX = 99

/** Alles wat van een meubel wordt opgeslagen; de server rekent de prijs zelf na. */
export interface MeubelConfig extends MeubelInput {
  ladeBreedtes: LadeBreedtes
  quantity: number
}

/** Volledige controle van een configuratie (server en client). Foutmelding of null. */
export function valideerMeubelConfig(c: MeubelConfig): string | null {
  if (c.opAanvraag) {
    const model = getMeubelModel(c.modelId)
    if (!model || !HOUTKLEUREN.some((k) => k.id === c.houtkleur)) return 'Dit model of deze houtkleur bestaat niet.'
    const bereik = getAanvraagBereik(model)
    if (!Number.isInteger(c.lengte) || c.lengte < bereik.min || c.lengte > bereik.max) return `Op aanvraag kan van ${bereik.min} tot ${bereik.max} mm.`
    if (!getAanvraagLadeOpties(c.lengte).includes(c.lades)) return 'Dit aantal lades past niet bij deze lengte.'
  } else if (calcMeubelNettoCents(c) === null) {
    return 'Deze combinatie van model, lengte, lades en houtkleur bestaat niet.'
  }
  const ladeFout = valideerLadeBreedtes(c.ladeBreedtes, c.lengte, c.lades)
  if (ladeFout) return ladeFout
  if (!Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > MEUBEL_AANTAL_MAX) return `Aantal moet tussen 1 en ${MEUBEL_AANTAL_MAX} liggen.`
  return null
}

// ─── Groter dan standaard: op aanvraag ──────────────────────────────────────
// De dealer kan bewust een lengte boven het bereik van het model kiezen. Zo'n
// meubel heeft geen tabelprijs en is altijd op aanvraag.

export const MEUBEL_AANVRAAG_MAX_MM = 3500
export const MEUBEL_AANVRAAG_LADES_MAX = 6

export function getAanvraagBereik(model: MeubelModel): { min: number; max: number } {
  return { min: getLengteBereik(model).max + 1, max: MEUBEL_AANVRAAG_MAX_MM }
}

/** Aantal lades naast elkaar waarbij elke lade bij gelijke verdeling 350 tot 1200 mm is. */
export function getAanvraagLadeOpties(lengte: number): number[] {
  const opties: number[] = []
  for (let n = 1; n <= MEUBEL_AANVRAAG_LADES_MAX; n++) {
    if (lengte / n >= LADE_MIN_MM && lengte / n <= LADE_MAX_MM) opties.push(n)
  }
  return opties
}
