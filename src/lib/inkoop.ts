/**
 * Mag deze gebruiker de eigen inkoopprijs (netto) zien?
 * Manager en account zonder bedrijfsrij: altijd. Collega: alleen als de manager het aanzet.
 */
export function zietInkoop(lid: { role?: string | null; can_see_purchase_prices?: boolean | null } | null | undefined): boolean {
  if (!lid) return true
  if (lid.role === 'manager') return true
  return lid.can_see_purchase_prices === true
}
