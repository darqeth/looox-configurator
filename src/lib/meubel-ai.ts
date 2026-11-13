import {
  MEUBEL_MODELLEN, MEUBEL_CATEGORIEEN, HOUTKLEUREN, HOUTKLEUR_DEFAULT, MEUBEL_AANTAL_MAX, MEUBEL_AANVRAAG_MAX_MM, LAMPEN_MAX,
  getMeubelModel, getLengteBereik, getLadeOpties, getAanvraagLadeOpties, getHoutkleuren, getMeubelHoogte, getMeubelDiepte,
  getKastHoogteBereik, getDeurOpties, getRegaalBreedte, getDuoPrijs, getDuoReeksen, getArtikelVariant, getLadeAccessoire,
  kanLadeAccessoire, kanLogo, kanUitsparing, ladeRuimte, valideerMeubelConfig, gatenContext, waskomMax, UITSPARING_MAX,
  type MeubelModel, type MeubelConfig, type WaskomVorm, type HanddoekType,
} from '@/lib/meubel-config'
import { GAT, klemGat, komMax, snappunten, startGaten, type Gat } from '@/lib/meubel-gaten'

// AI-hulp voor Tailor-Made. Het taalmodel kiest alleen een model en keuzes; alles wat
// hier binnenkomt is onbetrouwbaar en wordt teruggebracht naar iets wat de prijslijst
// kent. Het taalmodel bepaalt nooit een prijs: die rekent de prijsmotor zelf uit.

/** Wat het taalmodel per product teruggeeft (alles optioneel en ongecontroleerd). */
export interface MeubelAiRuw {
  modelId?: unknown
  lengte?: unknown
  hoogte?: unknown
  diepte?: unknown
  lades?: unknown
  houtkleur?: unknown
  variant?: unknown
  waskomVorm?: unknown
  waskomAantal?: unknown
  waskomMaat?: unknown
  regaalBreedte?: unknown
  regaalZijde?: unknown
  handdoekhouders?: unknown
  handdoekType?: unknown
  lamp?: unknown
  organizer?: unknown
  divider?: unknown
  uitsparingen?: unknown
  aantal?: unknown
  opmerkingen?: unknown
}

/** Een geldige configuratie, klaar voor de configurator of voor opslaan. */
export interface MeubelVoorstelConfig extends MeubelConfig {
  hoogte: number
  logo: boolean
  uitsparingen: number
  opAanvraag: boolean
}

export interface MeubelVoorstel {
  config: MeubelVoorstelConfig
  /** Wat de dealer moet nakijken: aangepaste maten, gekozen standaarden, twijfels van het taalmodel */
  meldingen: string[]
}

export const AI_MAX_PRODUCTEN = 8
export const AI_MAX_SPIEGELS = 3
const MELDING_MAX = 6

function getal(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? Math.round(n) : null
}

function dichtstbij(keuzes: number[], waarde: number): number {
  return keuzes.reduce((beste, k) => (Math.abs(k - waarde) < Math.abs(beste - waarde) ? k : beste), keuzes[0])
}

function klem(waarde: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, waarde))
}

function teksten(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim().slice(0, 200)) : []
}

/**
 * Maakt van de ruwe uitvoer van het taalmodel een geldige configuratie. Wat niet kan,
 * wordt de dichtstbijzijnde keuze uit de prijslijst, met een melding erbij.
 * Null als het model niet bestaat of er geen geldige configuratie van te maken is.
 */
export function maakMeubelVoorstel(ruw: MeubelAiRuw): MeubelVoorstel | null {
  const model = getMeubelModel(String(ruw.modelId ?? ''))
  if (!model) return null
  const meldingen: string[] = []
  const meld = (tekst: string) => { if (!meldingen.includes(tekst)) meldingen.push(tekst) }

  // Houtkleur: niet elke kleur kan bij elk model
  const kleuren = getHoutkleuren(model)
  const gevraagdeKleur = typeof ruw.houtkleur === 'string' ? ruw.houtkleur : null
  const kleur = kleuren.find((k) => k.id === gevraagdeKleur)
  if (!model.geenHout && !kleur) {
    meld(gevraagdeKleur && HOUTKLEUREN.some((k) => k.id === gevraagdeKleur)
      ? `Deze houtkleur kan niet bij ${model.naam}. Kies een andere kleur.`
      : 'Geen houtkleur genoemd. Kies de houtkleur.')
  }
  const houtkleur = kleur?.id ?? HOUTKLEUR_DEFAULT

  const aantal = klem(getal(ruw.aantal) ?? 1, 1, MEUBEL_AANTAL_MAX)
  const gevraagdeLengte = getal(ruw.lengte)
  const gevraagdeHoogte = getal(ruw.hoogte)
  const gevraagdeDiepte = getal(ruw.diepte)

  const basis = {
    modelId: model.id, houtkleur, quantity: aantal, uitsparingen: 0, logo: kanLogo(model),
    opAanvraag: false, ladeBreedtes: null as number[] | null,
  }
  let config: MeubelVoorstelConfig

  if (model.artikel) {
    // Vast artikel: alleen de uitvoering kiezen
    const variant = getArtikelVariant(model, typeof ruw.variant === 'string' ? ruw.variant : null)
    if (!variant && model.artikel.varianten.length > 1) meld('De uitvoering is niet genoemd. Kies de juiste uitvoering.')
    config = { ...basis, lengte: 0, lades: 0, hoogte: model.hoogte, variant: (variant ?? model.artikel.varianten[0]).id }
  } else if (model.kast) {
    const k = model.kast
    const lengte = dichtstbij(k.breedtes, gevraagdeLengte ?? k.breedtes[0])
    if (gevraagdeLengte != null && lengte !== gevraagdeLengte) meld(`Breedte ${gevraagdeLengte} mm bestaat niet. Het is ${lengte} mm geworden.`)
    const bereik = getKastHoogteBereik(model)
    const hoogte = gevraagdeHoogte == null
      ? model.hoogte
      : k.hoogtes?.length ? dichtstbij(k.hoogtes, gevraagdeHoogte) : bereik ? klem(gevraagdeHoogte, bereik.min, bereik.max) : model.hoogte
    if (gevraagdeHoogte != null && hoogte !== gevraagdeHoogte) meld(`Hoogte ${gevraagdeHoogte} mm kan niet. Het is ${hoogte} mm geworden.`)
    const diepte = dichtstbij(k.dieptes, gevraagdeDiepte ?? model.diepte)
    if (gevraagdeDiepte != null && diepte !== gevraagdeDiepte) meld(`Diepte ${gevraagdeDiepte} mm bestaat niet. Het is ${diepte} mm geworden.`)
    const deuren = getDeurOpties(model, hoogte)
    const lades = deuren.includes(getal(ruw.lades) ?? -1) ? getal(ruw.lades)! : deuren[0]
    config = { ...basis, lengte, lades, hoogte, diepte }
  } else if (model.plank) {
    const p = model.plank
    const lengte = klem(gevraagdeLengte ?? p.lengte.min, p.lengte.min, p.lengte.max)
    if (gevraagdeLengte == null) meld('Geen lengte genoemd. Vul de lengte in.')
    else if (lengte !== gevraagdeLengte) meld(`Lengte ${gevraagdeLengte} mm kan niet. Het is ${lengte} mm geworden.`)
    let diepte = gevraagdeDiepte == null
      ? model.diepte
      : p.dieptes?.length ? dichtstbij(p.dieptes, gevraagdeDiepte) : p.diepteBereik ? klem(gevraagdeDiepte, p.diepteBereik.min, p.diepteBereik.max) : model.diepte
    diepte = getMeubelDiepte(model, diepte)
    if (gevraagdeDiepte != null && diepte !== gevraagdeDiepte) meld(`Diepte ${gevraagdeDiepte} mm kan niet. Het is ${diepte} mm geworden.`)
    const hoogte = gevraagdeHoogte == null ? model.hoogte : dichtstbij(p.diktes, gevraagdeHoogte)
    let houders = p.handdoekhouder ? klem(getal(ruw.handdoekhouders) ?? 0, 0, 2) : 0
    if (houders > 0 && p.handdoekhouder && diepte < p.handdoekhouder.minDiepte) {
      meld(`Een handdoekhouder kan pas vanaf ${p.handdoekhouder.minDiepte} mm diepte. Hij is weggelaten.`)
      houders = 0
    }
    const handdoekType: HanddoekType = ruw.handdoekType === 'B' ? 'B' : 'A'
    config = { ...basis, lengte, lades: 0, hoogte, diepte, ...(p.handdoekhouder && { handdoekhouders: houders, handdoekType }) }
  } else if (model.duo) {
    // Twee kasten met de regaalkast ertussen: beide kasten in dezelfde reeks
    const regaalBreedte = getRegaalBreedte(model, getal(ruw.regaalBreedte))
    const reeks = getDuoReeksen(model)[0]
    const perKast = gevraagdeLengte != null ? Math.round((gevraagdeLengte - regaalBreedte) / 2) : NaN
    const kast = getDuoPrijs(model, [perKast, perKast]) !== null ? perKast : klem(700, reeks.min, reeks.max)
    if (gevraagdeLengte == null) meld('Geen maten genoemd. Vul de breedte van beide kasten in.')
    else if (kast !== perKast) meld(`Lengte ${gevraagdeLengte} mm kan niet bij dit model. Vul de breedte van beide kasten in.`)
    config = { ...basis, lengte: 2 * kast + regaalBreedte, lades: 2, ladeBreedtes: [kast, kast], hoogte: getMeubelHoogte(model, gevraagdeHoogte), regaalBreedte, regaalZijde: 'midden' }
  } else {
    // Ladenmeubel: lengte uit de staffel, daarboven op aanvraag
    const bereik = getLengteBereik(model)
    let lengte = gevraagdeLengte ?? klem(1200, bereik.min, bereik.max)
    let opAanvraag = false
    if (gevraagdeLengte == null) meld('Geen lengte genoemd. Vul de lengte in.')
    if (model.vasteLengtes) {
      lengte = dichtstbij(model.vasteLengtes, lengte)
    } else if (lengte > bereik.max && lengte <= MEUBEL_AANVRAAG_MAX_MM && !model.geenAanvraag) {
      opAanvraag = true
      meld(`${lengte} mm is groter dan standaard (tot ${bereik.max} mm). Dit meubel is op aanvraag, zonder prijs.`)
    } else {
      lengte = klem(lengte, bereik.min, bereik.max)
    }
    if (gevraagdeLengte != null && lengte !== gevraagdeLengte) meld(`Lengte ${gevraagdeLengte} mm kan niet bij ${model.naam}. Het is ${lengte} mm geworden.`)
    const regaalBreedte = getRegaalBreedte(model, getal(ruw.regaalBreedte))
    const ruimte = ladeRuimte(model, lengte, regaalBreedte)
    const opties = model.zonderLades ? [0] : opAanvraag ? getAanvraagLadeOpties(ruimte) : getLadeOpties(model, lengte, regaalBreedte)
    if (opties.length === 0) return null
    const gevraagdeLades = getal(ruw.lades)
    const lades = gevraagdeLades != null && opties.includes(gevraagdeLades) ? gevraagdeLades : gevraagdeLades != null ? dichtstbij(opties, gevraagdeLades) : opties[0]
    if (!model.zonderLades) {
      if (gevraagdeLades == null && opties.length > 1) meld('Aantal lades niet genoemd. Controleer de indeling.')
      else if (gevraagdeLades != null && lades !== gevraagdeLades) meld(`${gevraagdeLades} lades naast elkaar kan niet bij deze lengte. Het zijn er ${lades} geworden.`)
    }
    const hoogte = getMeubelHoogte(model, gevraagdeHoogte)
    if (gevraagdeHoogte != null && hoogte !== gevraagdeHoogte) meld(`Hoogte ${gevraagdeHoogte} mm bestaat niet bij ${model.naam}. Het is ${hoogte} mm geworden.`)
    const waskomVorm: WaskomVorm = ruw.waskomVorm === 'vierkant' ? 'vierkant' : 'ovaal'
    config = {
      ...basis, lengte, lades, hoogte, opAanvraag,
      ...(model.regaal && { regaalBreedte, regaalZijde: ruw.regaalZijde === 'links' ? 'links' as const : 'rechts' as const }),
      ...(model.waskom && { waskomVorm, waskomAantal: getal(ruw.waskomAantal) === 2 ? 2 : 1 }),
    }
    if (model.waskom && ruw.waskomVorm !== 'ovaal' && ruw.waskomVorm !== 'vierkant') meld('Vorm van de waskom niet genoemd. Kies ovaal of vierkant.')
  }

  // Bijverkoop: lamp bij de spiegelkast, Organizer en Divider bij een meubel met lades
  if (model.lamp && ruw.lamp === true) config.lampen = LAMPEN_MAX
  if (kanLadeAccessoire(model) && !config.opAanvraag) {
    for (const soort of ['organizer', 'divider'] as const) {
      const v = getLadeAccessoire(soort, typeof ruw[soort] === 'string' ? ruw[soort] as string : null)
      if (v) config[soort] = v.id
    }
  }

  // Uitsparingen in het blad (waskom, kraan). Kan er getekend worden, dan zet het hulpje een
  // eerste opzet in de tekening; de dealer loopt plaats en maat na. Anders telt alleen het aantal.
  const uitsparingen = kanUitsparing(model) ? klem(getal(ruw.uitsparingen) ?? 0, 0, UITSPARING_MAX) : 0
  let context = gatenContext(config)
  if (context?.soort === 'solid') {
    const aantal = config.waskomAantal === 2 ? 2 : 1
    if (config.waskomVorm === 'vierkant') {
      const gevraagd = getal(ruw.waskomMaat) === 850 ? 850 : 500
      config.waskomMaat = gevraagd === 850 && waskomMax(config, 'vierkant', 850) < aantal ? 500 : gevraagd
      if (config.waskomMaat !== gevraagd) meld('Een waskom van 850 mm past niet boven deze lades. Het is 500 mm geworden.')
      context = gatenContext(config)
    }
    const punten = context?.kom && komMax(context.blad, context.kom) >= aantal ? snappunten(context.blad, context.kom).slice(0, aantal) : []
    if (context && punten.length === aantal) {
      config.tekenwijze = 'module'
      config.gaten = punten.map((p): Gat => ({ soort: 'kom', vak: p.vak }))
      if (startGaten(context).length === 0) meld(`De ${aantal === 2 ? 'waskommen staan' : 'waskom staat'} in de tekening. Controleer boven welke lade.`)
    } else {
      config.tekenwijze = 'upload'
      meld('De waskom past niet boven deze lades: een lade moet minstens 15 cm breder zijn dan de waskom. Kies een andere indeling of lever een eigen maattekening aan.')
    }
  } else if (context) {
    config.tekenwijze = 'module'
    if (uitsparingen > 0) {
      const c = context
      const punten = snappunten(c.blad).slice(0, uitsparingen)
      config.gaten = punten.map((p) => klemGat({ soort: 'sifon', x: p.x, y: 240, d: GAT.sifon.std }, c))
      const rest = uitsparingen - punten.length
      meld(`${punten.length} ${punten.length === 1 ? 'sifongat' : 'sifongaten'} in de tekening gezet. Controleer plaats en maat.${rest > 0 ? ` Nog ${rest} ${rest === 1 ? 'gat' : 'gaten'} (bijvoorbeeld voor de kraan) zet je er zelf bij.` : ''}`)
    }
  } else if (uitsparingen > 0) {
    config.uitsparingen = uitsparingen
    meld(`${uitsparingen} ${uitsparingen === 1 ? 'uitsparing' : 'uitsparingen'} meegenomen. Teken de plaats op de maattekening.`)
  }

  if (valideerMeubelConfig(config) !== null) return null
  for (const t of teksten(ruw.opmerkingen)) meld(t)
  return { config, meldingen: meldingen.slice(0, MELDING_MAX) }
}

function maten(m: MeubelModel): string {
  if (m.artikel) return `uitvoeringen (variant): ${m.artikel.varianten.map((v) => `${v.id} = ${v.naam} ${v.afmeting}`.trim()).join('; ')}`
  if (m.plank) {
    const p = m.plank
    return [
      `lengte ${p.lengte.min}-${p.lengte.max}`,
      `diepte ${p.dieptes ? p.dieptes.join('/') : `${p.diepteBereik?.min}-${p.diepteBereik?.max}`}`,
      `dikte (veld hoogte) ${p.diktes.join('/')}`,
      p.handdoekhouder ? 'handdoekhouders 0-2 (type A standaard, B rounded)' : '',
    ].filter(Boolean).join(', ')
  }
  if (m.kast) {
    const b = getKastHoogteBereik(m)
    const deuren = getDeurOpties(m, m.hoogte)
    return [
      `breedte (veld lengte) ${m.kast.breedtes.join('/')}`,
      `hoogte ${m.kast.hoogtes?.length ? m.kast.hoogtes.join('/') : b ? `${b.min}-${b.max}` : m.hoogte}`,
      `diepte ${m.kast.dieptes.join('/')}`,
      deuren[0] > 0 ? `deuren (veld lades) ${deuren.join('/')}` : '',
      m.lamp ? 'lamp mogelijk (lamp: true)' : '',
    ].filter(Boolean).join(', ')
  }
  const b = getLengteBereik(m)
  const lades = m.zonderLades || m.duo ? [] : [...new Set(m.staffels.flatMap((s) => Object.keys(s.prijzen).map(Number)))].sort((x, y) => x - y)
  return [
    m.vasteLengtes ? `lengte ${m.vasteLengtes.join('/')}` : `lengte ${b.min}-${b.max}${m.geenAanvraag || m.duo ? '' : `, groter tot ${MEUBEL_AANVRAAG_MAX_MM} kan op aanvraag`}`,
    lades.length ? `lades naast elkaar ${lades.join('/')}` : m.duo ? 'twee kasten met elk één lade' : 'geen lades',
    m.rijen > 1 ? `${m.rijen} laderijen boven elkaar` : '',
    `hoogte ${m.hoogtes ? m.hoogtes.join('/') : m.hoogte}`,
    `diepte ${m.diepte}`,
    m.regaal ? `open regaalkast ${m.regaal.min}-${m.regaal.max} breed${m.duo ? ' in het midden' : ', links of rechts'}` : '',
    m.waskom ? 'waskom in het blad: ovaal of vierkant (rechthoekig, 500 of 850 breed), 1 of 2' : '',
    m.geenHout ? 'geen houtkleur' : m.geenKleuren?.length ? `niet in ${m.geenKleuren.join(', ')}` : '',
  ].filter(Boolean).join(', ')
}

/** De prijslijst als tekst voor het taalmodel: per model wat er te kiezen is. Maten in mm. */
export function meubelCatalogusTekst(): string {
  return MEUBEL_CATEGORIEEN.map((c) => {
    const modellen = MEUBEL_MODELLEN.filter((m) => m.categorie === c.id)
    if (modellen.length === 0) return ''
    return `## ${c.naam}\n${modellen.map((m) => `- ${m.id} | ${m.naam}: ${m.omschrijving} | ${maten(m)}`).join('\n')}`
  }).filter(Boolean).join('\n\n')
}

export function houtkleurenTekst(): string {
  return HOUTKLEUREN.map((k) => `${k.id} (${k.naam})`).join(', ')
}
