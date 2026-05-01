export const MAATWERK_STAFFEL_KORTINGEN = [
  { vanaf: 500, pct: 0.15 },
  { vanaf: 250, pct: 0.12 },
  { vanaf: 100, pct: 0.10 },
  { vanaf:  50, pct: 0.07 },
  { vanaf:  20, pct: 0.05 },
  { vanaf:  10, pct: 0.03 },
  { vanaf:   1, pct: 0 },
] as const

export function getMaatwerkStaffelKorting(qty: number): number {
  return MAATWERK_STAFFEL_KORTINGEN.find(s => qty >= s.vanaf)?.pct ?? 0
}

export type MaatwerkStaffelTip = {
  stuks: number        // stuks nodig voor volgende tier
  tierQty: number      // volgende tier grens
  prijsNu: number      // netto stuksprijs bij huidige qty (na dealer én huidige staffel)
  prijsVolgend: number // netto stuksprijs bij volgende tier
}

// Tip tonen wanneer binnen 20% van de volgende tier
export function getMaatwerkStaffelTip(
  nettoNaDealer: number,  // bruto stuksprijs × (1 − dealerKorting/100)
  qty: number,
): MaatwerkStaffelTip | null {
  const tiers = [10, 20, 50, 100, 250, 500]
  const nextTier = tiers.find(t => t > qty)
  if (!nextTier) return null
  const tipWindow = Math.max(1, Math.round(nextTier * 0.2))
  if (nextTier - qty > tipWindow) return null
  return {
    stuks: nextTier - qty,
    tierQty: nextTier,
    prijsNu: Math.round(nettoNaDealer * (1 - getMaatwerkStaffelKorting(qty))),
    prijsVolgend: Math.round(nettoNaDealer * (1 - getMaatwerkStaffelKorting(nextTier))),
  }
}
