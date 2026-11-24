import { leesMeubel } from '@/lib/meubel-opslag'
import { moetNalopen, type ProjectConfigRij } from '@/lib/project'

// Handmatig op besteld zetten door het beheer: de dealer heeft via de groothandel
// besteld en dus niet in de configurator. De order is een gewone order op naam van
// de dealer; dat hij zo is ontstaan staat bij de configuratie (selected_options),
// net als het afleveradres en de staffel. Daar is geen eigen kolom voor nodig.

export interface ViaGroothandel {
  /** Referentie of inkoopnummer van de groothandel; leeg als die niet is ingevuld */
  referentie: string
  /** Moment waarop het beheer de order heeft aangemaakt (ISO), of null */
  op: string | null
}

/** Leest de markering van een order die het beheer namens de dealer heeft aangemaakt. */
export function leesViaGroothandel(selectedOptions: unknown): ViaGroothandel | null {
  const v = (selectedOptions as { viaGroothandel?: unknown } | null)?.viaGroothandel
  if (!v || typeof v !== 'object') return null
  const { referentie, op } = v as { referentie?: unknown; op?: unknown }
  return {
    referentie: typeof referentie === 'string' ? referentie.trim().slice(0, 200) : '',
    op: typeof op === 'string' ? op : null,
  }
}

/** Wat bij het aanmaken aan de opties van de configuratie wordt toegevoegd. */
export function groothandelPatch(invoer: { door: string; op: string; referentie: string; staffelPct: number }): Record<string, unknown> {
  const referentie = invoer.referentie.trim()
  return {
    viaGroothandel: { door: invoer.door, op: invoer.op, ...(referentie && { referentie }) },
    ...(invoer.staffelPct > 0 && { staffelKortingPct: invoer.staffelPct }),
  }
}

/**
 * Wat een dealer zelf eerst had moeten oplossen. Voor het beheer is het geen
 * blokkade (de order is al bij de groothandel geplaatst), wel iets om te weten.
 */
export function groothandelWaarschuwingen(selectedOptions: unknown): string[] {
  const meldingen: string[] = []
  if (moetNalopen(selectedOptions)) meldingen.push('Door het hulpje ingevuld en nog niet door de dealer nagelopen.')
  if (leesMeubel(selectedOptions)?.tekeningOntbreekt) meldingen.push('De maattekening of de plaats van de waskom ontbreekt nog.')
  return meldingen
}

type Regel = Pick<ProjectConfigRij, 'id' | 'status' | 'project_id'>

/**
 * Welke regels worden besteld als het beheer deze configuratie op besteld zet.
 * Een losse configuratie alleen zichzelf; een regel van een project alle regels
 * van dat project die nog niet besteld zijn, net als wanneer de dealer het
 * project bestelt. `projectRegels` zijn alle regels van het project.
 */
export function kiesGroothandelRegels<T extends Regel>(config: T, projectRegels: T[]): { regels: T[] } | { fout: string } {
  if (config.status === 'ordered') return { fout: 'Deze configuratie is al besteld' }
  const regels = config.project_id ? projectRegels.filter((r) => r.status !== 'ordered') : [config]
  if (regels.length === 0) return { fout: 'Dit project is al besteld' }
  if (regels.some((r) => r.status !== 'saved')) {
    return { fout: config.project_id ? 'Dit project bevat een regel die nog niet is opgeslagen' : 'Deze configuratie is nog niet opgeslagen' }
  }
  return { regels }
}
