// Mirror Maintenance Set (MMS): los accessoire dat de dealer aan het eind van een
// maatwerk-configuratie kan toevoegen (sprint 2026-11, S4).
//
// Het is een aparte orderregel en geen onderdeel van de stuksprijs van de spiegel:
//   - het aantal staat los van het aantal spiegels (max. 10 per configuratie)
//   - alleen de dealerkorting gaat eraf; geen staffelkorting, geen kortingscode
//   - geen internationale toeslag
// De set kost €18,95 en introduceert dus centen in een systeem dat verder in hele
// euro's rekent. Daarom rekenen we hier in centen en ronden we per regel af.

export const MMS = {
  code: 'MMS',
  ean: '8720791347550',
  name: 'Mirror Maintenance Set',
  description: 'Glasreiniger voor spiegels (spray, 600 ml) met microvezeldoek.',
  /** Vrijstaande productfoto (public/images), 331 × 448 px */
  image: '/images/mirror-maintenance-set.webp',
  /** Bruto adviesprijs per stuk, excl. btw */
  price: 18.95,
  max: 10,
} as const

const PRICE_CENTS = Math.round(MMS.price * 100)

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
export function calcMmsBruto(quantity: number): number {
  return (clampMmsQuantity(quantity) * PRICE_CENTS) / 100
}

/** Netto regeltotaal na dealerkorting, per regel afgerond op hele centen */
export function calcMmsNetto(quantity: number, dealerKortingPct: number): number {
  return Math.round((clampMmsQuantity(quantity) * PRICE_CENTS * (100 - dealerKortingPct)) / 100) / 100
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
