// Statusfilter van de beheerpagina Configuraties, waar offertes en bestellingen
// samen in één lijst staan.

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:          'In behandeling',
  confirmed:        'Bevestigd',
  controle_vereist: 'Controle vereist',
  goedgekeurd:      'Goedgekeurd',
  afgekeurd:        'Afgekeurd',
  in_production:    'In productie',
  shipped:          'Verzonden',
  delivered:        'Geleverd',
  cancelled:        'Geannuleerd',
}

/** 'alle', 'offerte' (nog niet besteld), 'besteld' (elke orderstatus) of één orderstatus */
export type BeheerFilter = string

/** Leest ?status= uit de URL; ook de oude waarden van de configuratiepagina (saved, ordered). */
export function leesBeheerFilter(raw: string | undefined | null): BeheerFilter {
  if (!raw) return 'alle'
  if (raw === 'saved') return 'offerte'
  if (raw === 'ordered') return 'besteld'
  if (raw === 'offerte' || raw === 'besteld' || raw in ORDER_STATUS_LABELS) return raw
  return 'alle'
}

export interface BeheerFilterItem {
  /** Een order, of een configuratie zonder order */
  soort: 'order' | 'config'
  /** Orderstatus bij een order, status van de configuratie bij een configuratie */
  status: string
}

export function pastInBeheerFilter(item: BeheerFilterItem, filter: BeheerFilter): boolean {
  if (filter === 'alle') return true
  // Een bestelde configuratie zonder orderregel (oude gegevens) telt als besteld
  const besteld = item.soort === 'order' || item.status === 'ordered'
  if (filter === 'offerte') return !besteld
  if (filter === 'besteld') return besteld
  return item.soort === 'order' && item.status === filter
}
