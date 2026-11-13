import {
  HOUTKLEUREN, MEUBEL_FACTOR_DEFAULT, UITSPARING_MAX, getMeubelHoogte, getMeubelDiepte, meubelAfmeting, tekeningVerplicht, getArtikelVariant, indelingTekst, PLANK_EXTRAS, heeftExtras, getPlankExtraArtikel, plankExtraPrijs,
  type PlankExtra, type HanddoekType, getRegaalBreedte, ladeRuimte, getMeubelModel, ladeLabel, parseMeubelFactor,
  type LadeBreedtes, type MeubelInput, type MeubelModel, type WaskomVorm,
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
  /** Maattekening is nodig om te bestellen en ontbreekt nog (bij een kast alleen nodig met uitsparingen) */
  tekeningOntbreekt: boolean
  /** Waskom in het Solid Surface blad; null bij een model zonder ingebouwde waskom */
  waskomVorm: WaskomVorm | null
  waskomAantal: number
  /** Plank: handdoekhouders, het type en wat eronder hangt */
  handdoekhouders: number
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
  return {
    model,
    lengte,
    waskomVorm: model.waskom && (m.waskomVorm === 'ovaal' || m.waskomVorm === 'vierkant') ? m.waskomVorm : null,
    waskomAantal: m.waskomAantal === 2 ? 2 : 1,
    regaalBreedte,
    handdoekhouders: houders,
    handdoekType: m.handdoekType === 'B' ? 'B' : 'A',
    extra: heeftExtras(basisModel, typeof m.variant === 'string' ? m.variant : null) ? PLANK_EXTRAS.find((e) => e.id === m.extra)?.id ?? null : null,
    extraArtikel: heeftExtras(basisModel, typeof m.variant === 'string' ? m.variant : null) ? getPlankExtraArtikel(typeof m.extra === 'string' ? m.extra : null, typeof m.extraArtikel === 'string' ? m.extraArtikel : null)?.id ?? null : null,
    variant: getArtikelVariant(basisModel, typeof m.variant === 'string' ? m.variant : null)?.id ?? null,
    regaalZijde: m.regaalZijde === 'links' || m.regaalZijde === 'midden' ? m.regaalZijde : 'rechts',
    ladeRuimte: ladeRuimte(model, lengte, regaalBreedte),
    // Een kast of los blad heeft geen lades: daar is 0 een geldige waarde
    lades: model.kast || model.zonderLades || model.plank || model.artikel ? Math.max(0, Number(m.lades) || 0) : Number(m.lades) || 1,
    ladeBreedtes: breedtes,
    houtkleur: kleur?.id ?? '',
    houtkleurNaam: model.geenHout ? (model.artikel ? '' : 'Solid Surface') : kleur?.naam ?? '',
    factor: m.factor === undefined ? MEUBEL_FACTOR_DEFAULT : parseMeubelFactor(m.factor),
    opAanvraag: m.opAanvraag === true,
    logo: m.logo === true,
    uitsparingen,
    attachmentUrl,
    tekeningOntbreekt: tekeningVerplicht(model, uitsparingen) && !attachmentUrl,
    quantity: Math.max(1, Math.floor(Number(opts.quantity) || 1)),
    reference: typeof opts.reference === 'string' ? opts.reference : '',
    description: typeof opts.description === 'string' ? opts.description : '',
  }
}

/** Korte omschrijving voor lijsten: "Facet Double · 2000 mm · 3 × 2 lades · White". */
export function meubelSamenvatting(m: OpgeslagenMeubel): string {
  return [m.model.naam, meubelKort(m), m.regaalBreedte ? `regaal ${m.regaalZijde}` : '', m.houtkleurNaam].filter(Boolean).join(' · ')
}

/** Maat en indeling voor een lijstregel: "2000 mm · 3 lades", of bij een kast de drie maten. */
export function meubelKort(m: OpgeslagenMeubel): string {
  if (m.model.artikel) return indelingTekst(m.model, 0, null, 0, m)
  if (m.model.plank) return meubelAfmeting(m.model, m.lengte)
  if (m.model.kast) return [meubelAfmeting(m.model, m.lengte), m.model.kast.deuren ? ladeLabel(m.model, m.lades) : ''].filter(Boolean).join(' · ')
  return `${m.lengte} mm · ${ladeLabel(m.model, m.lades)}`
}

/** Invoer voor de prijsmotor uit een opgeslagen meubel: één plek, zodat geen optie wordt vergeten. */
export function meubelPrijsInput(m: OpgeslagenMeubel): MeubelInput {
  return { modelId: m.model.id, lengte: m.lengte, lades: m.lades, hoogte: m.model.hoogte, diepte: m.model.diepte,
    ...(m.handdoekhouders > 0 && { handdoekhouders: m.handdoekhouders, handdoekType: m.handdoekType }), ...(m.extra && { extra: m.extra, extraArtikel: m.extraArtikel }), ...(m.variant && { variant: m.variant }), houtkleur: m.houtkleur, uitsparingen: m.uitsparingen, regaalBreedte: m.regaalBreedte || undefined, regaalZijde: m.regaalZijde, ladeBreedtes: m.ladeBreedtes }
}

/** Accessoire onder de plank: catalogusprijs en netto, voor de prijsopbouw bij bestellen. */
export function meubelExtraPrijs(m: OpgeslagenMeubel): { bruto: number; netto: number } {
  return plankExtraPrijs({ modelId: m.model.id, extra: m.extra, extraArtikel: m.extraArtikel, variant: m.variant })
}
