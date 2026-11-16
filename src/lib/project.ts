import { formatDimensions, formatExtras, formatGlas, formatLight, formatShape, type ConfigOptions } from '@/lib/pdf/helpers'
import { leesMeubel, meubelSamenvatting, tekenInvoer, type TekenInvoer } from '@/lib/meubel-opslag'
import { productIcoon } from '@/lib/product-icoon'

// Een project is het winkelmandje: configuraties met hetzelfde project_id vormen
// samen één offerte en één bestelling. Er is geen eigen tabel; projectnaam en
// referentie staan op elke regel (configurations.name en selected_options.reference).
// Een configuratie zonder project_id is een losse configuratie, zoals altijd.

export type ProjectRegelSoort = 'maatwerk' | 'projectspiegel' | 'meubel'

export interface ProjectConfigRij {
  id: string
  name: string | null
  article_number?: string | null
  total_price: number | string
  status: string
  width: number | null
  height: number | null
  selected_options: Record<string, unknown> | null
  project_id?: string | null
}

export interface ProjectRegel {
  id: string
  soort: ProjectRegelSoort
  /** Productnaam: model of vorm */
  titel: string
  /** Pad van het icoon: de vorm van de spiegel of de categorie van het meubel */
  icoon: string
  /** Afmeting en keuzes in één regel */
  omschrijving: string
  /** Belangrijkste keuzes van een spiegel (glas, verlichting, opties), voor het bestelvenster */
  details?: string
  quantity: number
  /** Geen prijs vanuit de configurator: spiegel op aanvraag of meubel groter dan standaard */
  opAanvraag: boolean
  /** Prijs per stuk in centen zoals op de offerte: bruto, bij projectspiegels netto */
  stukCents: number
  /** Regeltotaal in centen */
  totaalCents: number
  /** Projectspiegels worden netto getoond, de rest bruto */
  netto: boolean
  besteld: boolean
  /** Meubel zonder maattekening: kan nog niet besteld worden */
  tekeningOntbreekt?: boolean
  /** Invoer voor het tekenvenster, als de tekening ook zelf getekend kan worden */
  tekenen?: TekenInvoer | null
  /** Door het hulpje ingevuld en nog niet door de dealer nagelopen en opgeslagen */
  nalopen?: boolean
  /** Wat het hulpje de dealer laat nakijken; alleen zolang de regel nog nagelopen moet worden */
  aiNotities?: string[]
}

/** Door het hulpje ingevuld: de vlag vervalt zodra de dealer de regel opent en opslaat. */
export function moetNalopen(selectedOptions: unknown): boolean {
  return (selectedOptions as { nalopen?: unknown } | null)?.nalopen === true
}

function cents(bedrag: number | string): number {
  return Math.round(Number(bedrag) * 100) || 0
}

/** Wat de dealer bij bestellen wil nalezen: glas, verlichting en opties in één regel. */
export function spiegelKenmerken(opts: ConfigOptions): string {
  const glas = opts.glasKleur && opts.glasKleur !== 'helder' ? formatGlas(opts.glasKleur) : ''
  const direct = formatLight(opts.directLight, opts)
  const indirect = formatLight(opts.indirectLight, opts)
  const extras = formatExtras(opts.extras, opts.optionSubChoices)
  return [
    glas,
    direct !== 'Geen' ? `Direct licht: ${direct}` : '',
    indirect !== 'Geen' ? `Indirect licht: ${indirect}` : '',
    direct === 'Geen' && indirect === 'Geen' ? 'Zonder verlichting' : '',
    extras !== 'Geen' ? extras : '',
  ].filter(Boolean).join(' · ')
}

/** Zet een configuratie om naar een regel van het project, met de prijs zoals die op de offerte staat. */
export function projectRegel(c: ProjectConfigRij): ProjectRegel {
  const opts = (c.selected_options ?? {}) as Record<string, unknown>
  const shape = typeof opts.shape === 'string' ? opts.shape : 'rechthoek'
  const besteld = c.status === 'ordered'
  const aantal = Math.max(1, Math.floor(Number(opts.quantity) || 1))
  const nalopen = moetNalopen(opts) && !besteld
  const aiNotities = nalopen && Array.isArray(opts.aiNotities) ? opts.aiNotities.filter((n): n is string => typeof n === 'string') : undefined

  const meubel = leesMeubel(opts)
  if (meubel) {
    // total_price is bruto per stuk; het aantal staat in de opties
    const stuk = meubel.opAanvraag ? 0 : cents(c.total_price)
    return {
      id: c.id, soort: 'meubel', titel: meubel.model.naam,
      omschrijving: meubelSamenvatting(meubel).split(' · ').slice(1).join(' · '),
      quantity: meubel.quantity, opAanvraag: meubel.opAanvraag,
      stukCents: stuk, totaalCents: stuk * meubel.quantity, netto: false, besteld,
      tekeningOntbreekt: meubel.tekeningOntbreekt, tekenen: meubel.tekeningOntbreekt ? tekenInvoer(meubel) : null, nalopen, aiNotities, icoon: productIcoon(opts),
    }
  }

  const omschrijving = formatDimensions(shape, c.width, c.height, opts as unknown as ConfigOptions)
  const details = spiegelKenmerken(opts as unknown as ConfigOptions)
  if (shape === 'projectspiegel') {
    // total_price is hier al het netto totaal voor alle stuks
    const totaal = cents(c.total_price)
    return {
      id: c.id, soort: 'projectspiegel', titel: 'Projectspiegel', omschrijving, details,
      quantity: aantal, opAanvraag: false,
      stukCents: Math.round(totaal / aantal), totaalCents: totaal, netto: true, besteld, nalopen, aiNotities, icoon: productIcoon(opts),
    }
  }

  // Maatwerk spiegel: total_price is bruto per stuk
  const opAanvraag = shape === 'op-aanvraag'
  const stuk = opAanvraag ? 0 : cents(c.total_price)
  return {
    id: c.id, soort: 'maatwerk', titel: `Spiegel ${formatShape(shape).toLowerCase()}`, omschrijving, details,
    quantity: aantal, opAanvraag,
    stukCents: stuk, totaalCents: stuk * aantal, netto: false, besteld, nalopen, aiNotities, icoon: productIcoon(opts),
  }
}

export interface ProjectTotaal {
  /** Som van de regels met een prijs, in centen */
  totaalCents: number
  /** Aantal regels zonder prijs (op aanvraag); die tellen niet mee in het totaal */
  opAanvraag: number
  /** Totaal aantal stuks over alle regels */
  stuks: number
}

export function projectTotaal(regels: ProjectRegel[]): ProjectTotaal {
  return {
    totaalCents: regels.reduce((som, r) => som + r.totaalCents, 0),
    opAanvraag: regels.filter((r) => r.opAanvraag).length,
    stuks: regels.reduce((som, r) => som + r.quantity, 0),
  }
}

/** Klant van de dealer, voor op de offerte. Staat net als de referentie op elke regel. */
export interface ProjectKlant {
  naam: string
  adres: string
  plaats: string
}

export function leesKlant(selectedOptions: unknown): ProjectKlant | null {
  const k = (selectedOptions as { klant?: unknown } | null)?.klant as Partial<Record<keyof ProjectKlant, unknown>> | undefined
  if (!k || typeof k !== 'object') return null
  const tekst = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : '')
  const klant = { naam: tekst(k.naam), adres: tekst(k.adres), plaats: tekst(k.plaats) }
  return klant.naam || klant.adres || klant.plaats ? klant : null
}

/** Offertenummer van een project: vast per project, zonder eigen teller. */
export function offerteNummer(projectId: string, datum: string | Date = new Date()): string {
  return `OFF-${new Date(datum).getFullYear()}-${projectId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

/** Naam, referentie en klant van het project: die van de eerste regel (klant: de eerste regel die er een heeft). */
export function projectKop(configs: ProjectConfigRij[]): { naam: string; referentie: string; klant: ProjectKlant | null } {
  const eerste = configs[0]
  const opts = (eerste?.selected_options ?? {}) as Record<string, unknown>
  return {
    naam: eerste?.name?.trim() || 'Naamloos project',
    referentie: typeof opts.reference === 'string' ? opts.reference : '',
    klant: configs.map((c) => leesKlant(c.selected_options)).find(Boolean) ?? null,
  }
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

/**
 * Seintje als spiegel en meubel niet meer bij elkaar passen, bijvoorbeeld nadat het
 * meubel breder is gemaakt. Alleen bij één wastafelmeubel met een rechte spiegel die
 * breder is dan het meubel, of er net naast zit (tot 20 cm verschil).
 */
export function maatSeintje(configs: ProjectConfigRij[]): string | null {
  const open = configs.filter((c) => c.status !== 'ordered')
  const meubels = open.map((c) => leesMeubel(c.selected_options)).filter((m) => m && !m.model.artikel && !m.model.plank && !m.model.kast && (m.model.categorie === 'wastafelmeubels' || m.model.categorie === 'solid-surface'))
  if (meubels.length !== 1 || !meubels[0]) return null
  const meubelMm = meubels[0].lengte
  for (const c of open) {
    const opts = (c.selected_options ?? {}) as Record<string, unknown>
    if (leesMeubel(opts) || !c.width || opts.shape === 'projectspiegel' || opts.shape === 'rond') continue
    const spiegelMm = Number(c.width) * 10
    const verschil = spiegelMm - meubelMm
    if (verschil === 0 || verschil < -200) continue
    const cm = (mm: number) => `${(mm / 10).toLocaleString('nl-NL')} cm`
    return verschil > 0
      ? `De spiegel (${cm(spiegelMm)}) is breder dan het meubel (${cm(meubelMm)}). Klopt dat nog?`
      : `De spiegel (${cm(spiegelMm)}) en het meubel (${cm(meubelMm)}) zijn niet even breed. Klopt dat nog?`
  }
  return null
}

/** Maat van een losse waskom in mm uit de tekst van de prijslijst ("Ø 40 cm, …" of "49 × 40 cm, …"). */
export function komMaat(afmeting: string | undefined): { b: number; d: number } | null {
  if (!afmeting) return null
  const getal = (t: string) => Math.round(Number(t.replace(',', '.')) * 10)
  const rond = afmeting.match(/Ø\s*([\d,]+)\s*cm/)
  if (rond) return { b: getal(rond[1]), d: getal(rond[1]) }
  const recht = afmeting.match(/([\d,]+)\s*×\s*([\d,]+)\s*cm/)
  return recht ? { b: getal(recht[1]), d: getal(recht[2]) } : null
}

export type KomControle = { goed: boolean; tekst: string }

/**
 * Past de losse waskom op het meubel en bij de getekende gaten? Alleen bij één houten
 * wastafelmeubel met opbouwwaskommen in hetzelfde project. Geeft een geruststelling als
 * alles klopt en anders het eerste punt om na te lopen.
 */
export function komControle(configs: ProjectConfigRij[]): KomControle | null {
  const open = configs.filter((c) => c.status !== 'ordered').map((c) => leesMeubel(c.selected_options)).filter((m) => !!m)
  const meubels = open.filter((m) => !m.model.artikel && !m.model.plank && !m.model.kast && !m.model.waskom && m.model.categorie === 'wastafelmeubels')
  // Vrijstaande zuilen staan op de vloer en tellen niet mee
  const kommen = open.filter((m) => m.model.artikel && m.model.categorie === 'waskommen' && !/pillar/.test(m.model.id))
  if (meubels.length !== 1 || kommen.length === 0 || meubels[0].quantity !== 1) return null
  const meubel = meubels[0]
  const maten = kommen.map((k) => komMaat(k.model.afmetingTekst))
  if (maten.some((m) => !m)) return null
  const b = Math.max(...maten.map((m) => m!.b)), d = Math.max(...maten.map((m) => m!.d))
  const aantal = kommen.reduce((s, k) => s + k.quantity, 0)
  const cm = (mm: number) => `${(mm / 10).toLocaleString('nl-NL')} cm`
  const kom = aantal === 1 ? 'De waskom' : 'De waskommen'
  const letOp = (tekst: string): KomControle => ({ goed: false, tekst })

  if (d > meubel.model.diepte) return letOp(`De waskom (${cm(d)} diep) is dieper dan het blad (${cm(meubel.model.diepte)}). Kies een kleinere waskom.`)
  if (aantal * b > meubel.lengte) return letOp(`${aantal} waskommen van ${cm(b)} passen niet naast elkaar op ${cm(meubel.lengte)}.`)

  const sifons = meubel.gaten.filter((g) => g.soort === 'sifon')
  const kranen = meubel.gaten.filter((g) => g.soort === 'kraan')
  if (sifons.length === 0) {
    return { goed: true, tekst: `${kom} ${aantal === 1 ? 'past' : 'passen'} op het blad (${cm(b)} breed op ${cm(meubel.lengte)}). Er zijn geen gaten opgegeven, de monteur boort het afvoergat zelf.` }
  }
  if (sifons.length !== aantal) {
    return letOp(`Je hebt ${sifons.length} ${sifons.length === 1 ? 'afvoergat' : 'afvoergaten'} getekend en ${aantal} ${aantal === 1 ? 'waskom' : 'waskommen'} in dit project. Klopt dat?`)
  }
  if (sifons.some((g) => g.x - b / 2 < 0 || g.x + b / 2 > meubel.lengte)) return letOp(`Een waskom van ${cm(b)} steekt op deze plek over de zijkant van het blad. Zet het afvoergat verder naar binnen.`)
  if (sifons.some((g) => g.y - d / 2 < 0 || g.y + d / 2 > meubel.model.diepte)) return letOp(`Een waskom van ${cm(d)} diep steekt op deze plek over de voor- of achterkant van het blad. Zet het afvoergat meer in het midden.`)
  const gesorteerd = [...sifons].sort((p, q) => p.x - q.x)
  if (gesorteerd.some((g, i) => i > 0 && g.x - gesorteerd[i - 1].x < b)) return letOp(`De afvoergaten staan dichter bij elkaar dan de waskom breed is (${cm(b)}). De waskommen raken elkaar.`)
  // Kraangat binnen de omtrek van de kom (ellips rond het afvoergat), de boring zelf meegerekend
  if (kranen.some((k) => sifons.some((g) => ((k.x - g.x) / (b / 2 + k.d / 2)) ** 2 + ((k.y - g.y) / (d / 2 + k.d / 2)) ** 2 < 1))) return letOp(`Een kraangat valt onder de waskom (${cm(b)}). Zet het kraangat naast de waskom of kies een kleinere waskom.`)
  return { goed: true, tekst: `${kom} ${aantal === 1 ? 'past' : 'passen'}: ${aantal === 1 ? 'het afvoergat ligt' : 'de afvoergaten liggen'} goed en ${aantal === 1 ? 'de kom blijft' : 'de kommen blijven'} binnen het blad.` }
}
