import {
  HOUTKLEUREN, MEUBEL_FACTOR_DEFAULT, UITSPARING_MAX, getMeubelHoogte, getMeubelDiepte, meubelAfmeting, tekeningVerplicht, getArtikelVariant, indelingTekst, PLANK_EXTRAS, heeftExtras, getPlankExtraArtikel, plankExtraPrijs, LAMPEN_MAX, getDeurOpties, kanLogo, kanLadeAccessoire, getLadeAccessoire,
  type PlankExtra, type HanddoekType, getRegaalBreedte, ladeRuimte, getMeubelModel, ladeLabel, parseMeubelFactor,
  type LadeBreedtes, type MeubelInput, type MeubelModel, type WaskomVorm, gatenContext, telUitsparingen, HANDDOEK_UITSPARING_MODEL,
} from '@/lib/meubel-config'
import { gatenSoort, herzieGaten, kommenCompleet, komMax, werkGaten, type Gat, type GatenContext, type KomMaat, type Tekenwijze } from '@/lib/meubel-gaten'

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
  /** Aantal uitsparingen waarvoor betaald wordt: de getekende gaten of de teller, plus de handdoekuitsparing */
  uitsparingen: number
  /** Teller van de dealer bij een eigen tekening (zonder handdoekuitsparing); 0 bij zelf tekenen */
  uitsparingenTeller: number
  /** Zelf getekend in de configurator of een eigen tekening; oude configuraties zijn 'upload' */
  tekenwijze: Tekenwijze
  /** Gaten en waskommen uit de tekenmodule; leeg bij een eigen tekening */
  gaten: Gat[]
  /** Blad en snapvakken voor de tekenmodule; null als dit product die niet heeft */
  gatenContext: GatenContext | null
  /** Maat van de rechthoekige waskom; null bij ovaal of zonder waskom */
  waskomMaat: KomMaat | null
  /** Mini Base Shelf: uitsparing in de voorkant */
  handdoekUitsparing: boolean
  attachmentUrl: string | null
  /** Er kan nog niet besteld worden: de waskom staat niet in de tekening, of de eigen maattekening ontbreekt */
  tekeningOntbreekt: boolean
  /** Waskom in het Solid Surface blad; null bij een model zonder ingebouwde waskom */
  waskomVorm: WaskomVorm | null
  waskomAantal: number
  /** Plank: handdoekhouders, het type en wat eronder hangt */
  handdoekhouders: number
  lampen: number
  /** Bijverkoop voor in de lade: artikelnummer of null */
  organizer: string | null
  divider: string | null
  handdoekType: HanddoekType
  extra: PlankExtra | null
  extraArtikel: string | null
  /** Vast artikel: artikelnummer van de gekozen uitvoering */
  variant: string | null
  /** Regaalkast (Regal-modellen): breedte in mm, 0 bij een model zonder */
  regaalBreedte: number
  regaalZijde: 'links' | 'rechts' | 'midden'
  /** Breedte die de lades samen innemen: lengte min rand en regaalkast */
  ladeRuimte: number
  quantity: number
  reference: string
  description: string
}

/** Heeft dit de vorm van een gat uit de tekenmodule? De maten toetst herzieGaten. */
function isGat(g: unknown): g is Gat {
  const o = g as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  const n = (k: string) => typeof o[k] === 'number' && Number.isFinite(o[k] as number)
  if (o.soort === 'sifon') return n('vak') && n('y') && n('d')
  if (o.soort === 'kraan') return n('x') && n('y') && n('d')
  if (o.soort === 'kom') return n('vak')
  if (o.soort === 'kraan-kom') return n('vak') && n('dx') && n('d')
  return false
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
  const model = {
    ...basisModel,
    hoogte: getMeubelHoogte(basisModel, m.hoogte == null ? null : Number(m.hoogte)),
    diepte: getMeubelDiepte(basisModel, m.diepte == null ? null : Number(m.diepte)),
    afmetingTekst: getArtikelVariant(basisModel, typeof m.variant === 'string' ? m.variant : null)?.afmeting,
    afbeelding: getArtikelVariant(basisModel, typeof m.variant === 'string' ? m.variant : null)?.afbeelding ?? basisModel.afbeelding,
  }
  const houders = basisModel.plank?.handdoekhouder ? Math.min(2, Math.max(0, Math.floor(Number(m.handdoekhouders) || 0))) : 0
  const kleur = HOUTKLEUREN.find((k) => k.id === m.houtkleur)
  const breedtes = Array.isArray(m.ladeBreedtes) ? m.ladeBreedtes.map(Number) : null
  const lengte = Number(m.lengte) || 0
  const uitsparingen = Math.min(UITSPARING_MAX, Math.max(0, Math.floor(Number(m.uitsparingen) || 0)))
  const attachmentUrl = typeof opts.attachmentUrl === 'string' && opts.attachmentUrl ? opts.attachmentUrl : null
  const regaalBreedte = getRegaalBreedte(model, m.regaalBreedte == null ? null : Number(m.regaalBreedte))
  const lades = model.kast ? (getDeurOpties(model, model.hoogte).includes(Number(m.lades)) ? Number(m.lades) : getDeurOpties(model, model.hoogte)[0]) : model.zonderLades || model.plank || model.artikel ? Math.max(0, Number(m.lades) || 0) : Number(m.lades) || 1
  const waskomVorm: WaskomVorm | null = model.waskom && (m.waskomVorm === 'ovaal' || m.waskomVorm === 'vierkant') ? m.waskomVorm : null
  const waskomAantal = m.waskomAantal === 2 ? 2 : 1
  const waskomMaat: KomMaat | null = waskomVorm === 'vierkant' ? (Number(m.waskomMaat) === 850 ? 850 : 500) : null
  const regaalZijde = m.regaalZijde === 'links' || m.regaalZijde === 'midden' ? m.regaalZijde : 'rechts' as const
  // Zelf getekend telt alleen bij een product met tekenmodule; wat niet (meer) te maken is, valt weg
  const tekenwijze: Tekenwijze = m.tekenwijze === 'module' && gatenSoort(basisModel) ? 'module' : 'upload'
  const context = gatenContext({ modelId: basisModel.id, lengte, lades, diepte: model.diepte, regaalBreedte: regaalBreedte || undefined, regaalZijde, waskomVorm: waskomVorm ?? undefined, waskomMaat: waskomMaat ?? undefined, waskomAantal, ladeBreedtes: breedtes })
  const gaten = tekenwijze === 'module' && context && Array.isArray(m.gaten) ? herzieGaten(m.gaten.filter(isGat), context).gaten : []
  const handdoekUitsparing = m.handdoekUitsparing === true && basisModel.id === HANDDOEK_UITSPARING_MODEL
  const uitsparingenTeller = tekenwijze === 'module' ? 0 : uitsparingen
  return {
    model,
    lengte,
    waskomVorm,
    waskomAantal,
    waskomMaat,
    regaalBreedte,
    handdoekhouders: houders,
    organizer: kanLadeAccessoire(basisModel) ? getLadeAccessoire('organizer', typeof m.organizer === 'string' ? m.organizer : null)?.id ?? null : null,
    divider: kanLadeAccessoire(basisModel) ? getLadeAccessoire('divider', typeof m.divider === 'string' ? m.divider : null)?.id ?? null : null,
    lampen: basisModel.lamp ? Math.min(LAMPEN_MAX, Math.max(0, Math.floor(Number(m.lampen) || 0))) : 0,
    handdoekType: m.handdoekType === 'B' ? 'B' : 'A',
    extra: heeftExtras(basisModel, typeof m.variant === 'string' ? m.variant : null) ? PLANK_EXTRAS.find((e) => e.id === m.extra)?.id ?? null : null,
    extraArtikel: heeftExtras(basisModel, typeof m.variant === 'string' ? m.variant : null) ? getPlankExtraArtikel(typeof m.extra === 'string' ? m.extra : null, typeof m.extraArtikel === 'string' ? m.extraArtikel : null)?.id ?? null : null,
    variant: getArtikelVariant(basisModel, typeof m.variant === 'string' ? m.variant : null)?.id ?? null,
    regaalZijde,
    ladeRuimte: ladeRuimte(model, lengte, regaalBreedte),
    // Een kast of los blad heeft geen lades: daar is 0 een geldige waarde
    // Kast: een eerder opgeslagen aantal deuren dat bij deze hoogte niet (meer) kan, wordt het eerste dat wel kan
    lades,
    ladeBreedtes: breedtes,
    houtkleur: kleur?.id ?? '',
    houtkleurNaam: model.geenHout ? (model.artikel ? '' : 'Solid Surface') : kleur?.naam ?? '',
    factor: m.factor === undefined ? MEUBEL_FACTOR_DEFAULT : parseMeubelFactor(m.factor),
    opAanvraag: m.opAanvraag === true,
    logo: m.logo === true && kanLogo(model),
    uitsparingen: telUitsparingen({ modelId: basisModel.id, uitsparingen: uitsparingenTeller, tekenwijze, gaten, handdoekUitsparing }),
    uitsparingenTeller,
    tekenwijze,
    gaten,
    gatenContext: context,
    handdoekUitsparing,
    // Een geüploade tekening telt alleen bij een eigen tekening; zelf getekend heeft hem niet nodig
    attachmentUrl: tekenwijze === 'module' ? null : attachmentUrl,
    tekeningOntbreekt: tekeningVerplicht(model, { tekenwijze, uitsparingen: uitsparingenTeller, kommenCompleet: !!context && kommenCompleet(gaten, context) }) && (tekenwijze === 'module' || !attachmentUrl),
    quantity: Math.max(1, Math.floor(Number(opts.quantity) || 1)),
    reference: typeof opts.reference === 'string' ? opts.reference : '',
    description: typeof opts.description === 'string' ? opts.description : '',
  }
}

/** Waarom er nog niet besteld kan worden, voor de dealer; null als de tekening in orde is. */
export function tekeningMelding(m: OpgeslagenMeubel): string | null {
  if (!m.tekeningOntbreekt) return null
  return m.tekenwijze === 'module'
    ? `Bij ${m.model.naam} staat de waskom nog niet in de tekening. Plaats hem met de knop bij die regel.`
    : `Bij ${m.model.naam} ontbreekt de maattekening. Voeg hem toe met de knop bij die regel.`
}

/** Wat het tekenvenster nodig heeft om de tekening van een opgeslagen meubel te maken of aan te passen. */
export interface TekenInvoer {
  context: GatenContext
  gaten: Gat[]
  titel: string
  /** De dealer koos voor zelf tekenen: er hoort geen eigen maattekening bij */
  zelf: boolean
}

/** Null als er bij dit meubel niet getekend kan worden, of als de gekozen waskom niet boven de lades past. */
export function tekenInvoer(m: OpgeslagenMeubel): TekenInvoer | null {
  const c = m.gatenContext
  if (!c) return null
  if (c.soort === 'solid' && (!c.kom || komMax(c.blad, c.kom) < c.komAantal)) return null
  return { context: c, gaten: werkGaten(m.gaten, c).gaten, titel: `${m.model.naam} · ${m.lengte} mm`, zelf: m.tekenwijze === 'module' }
}

/** Korte omschrijving voor lijsten: "Facet Double · 2000 mm · 3 × 2 lades · White". */
export function meubelSamenvatting(m: OpgeslagenMeubel): string {
  return [m.model.naam, meubelKort(m), m.regaalBreedte ? `regaal ${m.regaalZijde}` : '', m.houtkleurNaam].filter(Boolean).join(' · ')
}

/** Maat en indeling voor een lijstregel: "2000 mm · 3 lades", of bij een kast de drie maten. */
export function meubelKort(m: OpgeslagenMeubel): string {
  if (m.model.artikel) return indelingTekst(m.model, 0, null, 0, m)
  if (m.model.plank) return meubelAfmeting(m.model, m.lengte)
  if (m.model.kast) return [meubelAfmeting(m.model, m.lengte), m.lades > 0 ? ladeLabel(m.model, m.lades) : ''].filter(Boolean).join(' · ')
  return `${m.lengte} mm · ${ladeLabel(m.model, m.lades)}`
}

/** Invoer voor de prijsmotor uit een opgeslagen meubel: één plek, zodat geen optie wordt vergeten. */
export function meubelPrijsInput(m: OpgeslagenMeubel): MeubelInput {
  return { modelId: m.model.id, lengte: m.lengte, lades: m.lades, hoogte: m.model.hoogte, diepte: m.model.diepte,
    ...(m.handdoekhouders > 0 && { handdoekhouders: m.handdoekhouders, handdoekType: m.handdoekType }), ...(m.extra && { extra: m.extra, extraArtikel: m.extraArtikel }), ...(m.lampen > 0 && { lampen: m.lampen }), ...(m.organizer && { organizer: m.organizer }), ...(m.divider && { divider: m.divider }), ...(m.variant && { variant: m.variant }), houtkleur: m.houtkleur, uitsparingen: m.uitsparingen, regaalBreedte: m.regaalBreedte || undefined, regaalZijde: m.regaalZijde, ladeBreedtes: m.ladeBreedtes }
}

/** Accessoire onder de plank: catalogusprijs en netto, voor de prijsopbouw bij bestellen. */
export function meubelExtraPrijs(m: OpgeslagenMeubel): { bruto: number; netto: number } {
  return plankExtraPrijs({ modelId: m.model.id, extra: m.extra, extraArtikel: m.extraArtikel, variant: m.variant, lampen: m.lampen })
}
