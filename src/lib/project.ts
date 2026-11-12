import { formatDimensions, formatShape, type ConfigOptions } from '@/lib/pdf/helpers'
import { leesMeubel, meubelSamenvatting } from '@/lib/meubel-opslag'

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
  /** Afmeting en keuzes in één regel */
  omschrijving: string
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
}

function cents(bedrag: number | string): number {
  return Math.round(Number(bedrag) * 100) || 0
}

/** Zet een configuratie om naar een regel van het project, met de prijs zoals die op de offerte staat. */
export function projectRegel(c: ProjectConfigRij): ProjectRegel {
  const opts = (c.selected_options ?? {}) as Record<string, unknown>
  const shape = typeof opts.shape === 'string' ? opts.shape : 'rechthoek'
  const besteld = c.status === 'ordered'
  const aantal = Math.max(1, Math.floor(Number(opts.quantity) || 1))

  const meubel = leesMeubel(opts)
  if (meubel) {
    // total_price is bruto per stuk; het aantal staat in de opties
    const stuk = meubel.opAanvraag ? 0 : cents(c.total_price)
    return {
      id: c.id, soort: 'meubel', titel: meubel.model.naam,
      omschrijving: meubelSamenvatting(meubel).split(' · ').slice(1).join(' · '),
      quantity: meubel.quantity, opAanvraag: meubel.opAanvraag,
      stukCents: stuk, totaalCents: stuk * meubel.quantity, netto: false, besteld,
      tekeningOntbreekt: !meubel.attachmentUrl,
    }
  }

  const omschrijving = formatDimensions(shape, c.width, c.height, opts as unknown as ConfigOptions)
  if (shape === 'projectspiegel') {
    // total_price is hier al het netto totaal voor alle stuks
    const totaal = cents(c.total_price)
    return {
      id: c.id, soort: 'projectspiegel', titel: 'Projectspiegel', omschrijving,
      quantity: aantal, opAanvraag: false,
      stukCents: Math.round(totaal / aantal), totaalCents: totaal, netto: true, besteld,
    }
  }

  // Maatwerk spiegel: total_price is bruto per stuk
  const opAanvraag = shape === 'op-aanvraag'
  const stuk = opAanvraag ? 0 : cents(c.total_price)
  return {
    id: c.id, soort: 'maatwerk', titel: `Spiegel ${formatShape(shape).toLowerCase()}`, omschrijving,
    quantity: aantal, opAanvraag,
    stukCents: stuk, totaalCents: stuk * aantal, netto: false, besteld,
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

/** Naam en referentie van het project: die van de eerste regel. */
export function projectKop(configs: ProjectConfigRij[]): { naam: string; referentie: string } {
  const eerste = configs[0]
  const opts = (eerste?.selected_options ?? {}) as Record<string, unknown>
  return {
    naam: eerste?.name?.trim() || 'Naamloos project',
    referentie: typeof opts.reference === 'string' ? opts.reference : '',
  }
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
