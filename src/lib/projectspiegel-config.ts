// src/lib/projectspiegel-config.ts

export type Glasdikte = '4' | '5' | '6'

export const GLASDIKTES = ['4', '5', '6'] as const satisfies Glasdikte[]
export const AFMETING_MIN = 20  // projectspiegels kunnen kleiner zijn dan reguliere spiegels (min 40)
export const AFMETING_MAX = 300

export const GLASDIKTE_PRIJS_M2: Record<Glasdikte, number> = {
  '4': 30.78,
  '5': 34.68,
  '6': 36.36,
}

export const POLIJSTEN_PER_M = 4.55
export const OPHANGING_KLEIN = 3.80   // oppervlakte ≤ 0.8 m²
export const OPHANGING_GROOT = 6.18   // oppervlakte > 0.8 m² (ook >1.6 m² TBD — juiste prijs opzoeken)
export const VERPAKKING_PER_STUK = 9.16

export const STAFFEL_KORTINGEN = [
  { vanaf: 500, pct: 0.45 },
  { vanaf: 250, pct: 0.43 },
  { vanaf: 100, pct: 0.40 },
  { vanaf:  50, pct: 0.35 },
  { vanaf:  20, pct: 0.283 },
  { vanaf:  10, pct: 0.213 },
  { vanaf:   1, pct: 0 },
] as const

// Toon tip wanneer qty binnen deze afstand van de volgende grens ligt
const STAFFEL_TIP_WINDOW: Record<number, number> = {
  10: 3, 20: 5, 50: 10, 100: 15, 250: 30, 500: 50,
}

export function calcBasisprijs(params: {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  ophanging: boolean
  verpakkingPerStuk: boolean
}): number {
  const opp   = (params.lengte / 100) * (params.hoogte / 100)
  const omtrek = 2 * ((params.lengte + params.hoogte) / 100)
  let prijs = opp * GLASDIKTE_PRIJS_M2[params.glasdikte]
  prijs += omtrek * POLIJSTEN_PER_M
  if (params.ophanging) prijs += opp <= 0.8 ? OPHANGING_KLEIN : OPHANGING_GROOT
  if (params.verpakkingPerStuk) prijs += VERPAKKING_PER_STUK
  return Math.round(prijs * 100) / 100
}

export function getStaffelKorting(qty: number): number {
  return STAFFEL_KORTINGEN.find(s => qty >= s.vanaf)?.pct ?? 0
}

export function calcStuksprijs(basisprijs: number, qty: number): number {
  return Math.round(basisprijs * (1 - getStaffelKorting(qty)) * 100) / 100
}

export function calcTotaal(basisprijs: number, qty: number): number {
  return Math.round(basisprijs * (1 - getStaffelKorting(qty)) * qty * 100) / 100
}

export type StaffelTip = {
  stuks: number        // hoeveel extra stuks nodig
  tierQty: number      // de grens die gehaald wordt
  stuksprijsNu: number
  stuksprijsVolgend: number
}

export function getStaffelTip(basisprijs: number, qty: number): StaffelTip | null {
  const tiers = [10, 20, 50, 100, 250, 500]
  const nextTier = tiers.find(t => t > qty)
  if (!nextTier) return null
  const window = STAFFEL_TIP_WINDOW[nextTier] ?? 5
  if (nextTier - qty > window) return null
  return {
    stuks: nextTier - qty,
    tierQty: nextTier,
    stuksprijsNu: calcStuksprijs(basisprijs, qty),
    stuksprijsVolgend: calcStuksprijs(basisprijs, nextTier),
  }
}

export const VERPAKKING_DREMPEL = 25  // onder deze qty altijd verpakken per stuk
