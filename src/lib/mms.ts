// Mirror Maintenance Set (MMS): los accessoire dat de dealer aan het eind van een
// maatwerk-configuratie kan toevoegen (sprint 2026-11, S4).
//
// Het is een aparte orderregel en geen onderdeel van de stuksprijs van de spiegel:
//   - het aantal staat los van het aantal spiegels (max. 10 per configuratie)
//   - alleen de dealerkorting gaat eraf; geen staffelkorting, geen kortingscode
//   - internationale dealers betalen 5% toeslag, net als op de spiegels; de
//     stuksprijs wordt bij het opslaan vastgelegd bij de configuratie
// De set kost €18,95 en introduceert dus centen in een systeem dat verder in hele
// euro's rekent. Daarom rekenen we hier in centen en ronden we per regel af.

export const MMS = {
  code: 'MMS',
  ean: '8720791347550',
  name: 'Mirror Maintenance Set',
  description: 'Glasreiniger voor spiegels (spray, 600 ml) met microvezeldoek.',
  /** Vrijstaande productfoto (public/images), 331 × 448 px */
  image: '/images/mirror-maintenance-set.webp',
  /** Grote versie voor de vergrote weergave, 968 × 1320 px */
  imageLarge: '/images/mirror-maintenance-set-groot.webp',
  /** Bruto adviesprijs per stuk, excl. btw */
  price: 18.95,
  max: 10,
} as const

const PRICE_CENTS = Math.round(MMS.price * 100)
/** Buitenlandtoeslag, gelijk aan die op de spiegels */
export const MMS_INTERNATIONAL_FACTOR = 1.05
const PRICE_CENTS_INTERNATIONAL = Math.round(PRICE_CENTS * MMS_INTERNATIONAL_FACTOR)

/** Bruto stuksprijs voor deze dealer: €18,95, of €19,90 met buitenlandtoeslag */
export function getMmsUnitPrice(isInternational: boolean): number {
  return (isInternational ? PRICE_CENTS_INTERNATIONAL : PRICE_CENTS) / 100
}

/**
 * Stuksprijs zoals die bij de configuratie is vastgelegd. Alleen de twee bekende
 * prijzen zijn geldig; ontbreekt hij (configuratie van voor deze release) of is
 * hij onbekend, dan geldt de standaardprijs.
 */
export function resolveMmsUnitPrice(stored: unknown): number {
  return Math.round(Number(stored) * 100) === PRICE_CENTS_INTERNATIONAL ? PRICE_CENTS_INTERNATIONAL / 100 : MMS.price
}

/** Geldig aantal sets: geheel getal van 0 (geen) t/m MMS.max */
export function clampMmsQuantity(value: unknown): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) ? Math.min(MMS.max, Math.max(0, n)) : 0
}

/** Niet bij projectspiegels (eigen prijsmodel) en niet bij spiegel op aanvraag (geen prijs) */
export function isMmsAllowed(shape: string | null | undefined): boolean {
  return shape !== 'projectspiegel' && shape !== 'op-aanvraag'
}

/** Bruto regeltotaal excl. btw */
export function calcMmsBruto(quantity: number, unitPrice: number = MMS.price): number {
  return (clampMmsQuantity(quantity) * Math.round(unitPrice * 100)) / 100
}

/** Netto regeltotaal na dealerkorting, per regel afgerond op hele centen */
export function calcMmsNetto(quantity: number, dealerKortingPct: number, unitPrice: number = MMS.price): number {
  return Math.round((clampMmsQuantity(quantity) * Math.round(unitPrice * 100) * (100 - dealerKortingPct)) / 100) / 100
}

/** Telt een bedrag in hele euro's op bij een bedrag met centen zonder afrondingsruis */
export function addEuro(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100
}

/** "€510" voor hele bedragen, "€37,90" zodra er centen zijn */
export function formatEuro(amount: number): string {
  const heel = Math.abs(amount - Math.round(amount)) < 0.005
  return `€${amount.toLocaleString('nl-NL', { minimumFractionDigits: heel ? 0 : 2, maximumFractionDigits: 2 })}`
}
