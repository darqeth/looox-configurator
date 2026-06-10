import { getMaatwerkStaffelKorting } from './maatwerk-staffel'

// Eén bron van waarheid voor order-totalen. Wordt gebruikt door de bestelmodal
// (client), placeOrder/placeOrderFromConfig (server), de PDF en de e-mail —
// zodat de dealer overal exact hetzelfde bedrag ziet.
//
// Semantiek (alles in hele euro's, zoals de bestelmodal aan de dealer toont):
//   bruto catalogusprijs → dealerkorting → staffelkorting → kortingscode
// Kortingscodes werken dus op het NETTO subtotaal, niet op bruto.

export type OrderDiscount = { type: 'pct' | 'fixed'; value: number } | null

export type OrderTotals = {
  brutoUnitPrice: number
  dealerKortingPct: number
  /** bruto × (1 − dealerkorting) */
  nettoNaDealer: number
  staffelPct: number
  staffelAmountPerStuk: number
  /** nettoNaDealer − staffel per stuk */
  nettoUnitPrice: number
  /** nettoUnitPrice × quantity */
  subtotal: number
  discountAmount: number
  /** subtotal − discountAmount — wat de dealer betaalt */
  total: number
}

export function computeOrderTotals(input: {
  brutoUnitPrice: number
  dealerKortingPct: number
  quantity: number
  /** Projectspiegels: prijs is al netto en staffel is niet van toepassing */
  isProjectspiegel?: boolean
  discount?: OrderDiscount
}): OrderTotals {
  const { brutoUnitPrice, dealerKortingPct, quantity, isProjectspiegel = false, discount } = input

  const nettoNaDealer = isProjectspiegel
    ? brutoUnitPrice
    : Math.round(brutoUnitPrice * (1 - dealerKortingPct / 100))
  const staffelPct = isProjectspiegel ? 0 : getMaatwerkStaffelKorting(quantity)
  const staffelAmountPerStuk = isProjectspiegel ? 0 : Math.round(nettoNaDealer * staffelPct)
  const nettoUnitPrice = nettoNaDealer - staffelAmountPerStuk
  const subtotal = nettoUnitPrice * quantity
  const discountAmount = discount
    ? (discount.type === 'pct'
        ? Math.round(subtotal * discount.value / 100)
        : Math.min(discount.value, subtotal))
    : 0

  return {
    brutoUnitPrice,
    dealerKortingPct,
    nettoNaDealer,
    staffelPct,
    staffelAmountPerStuk,
    nettoUnitPrice,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
  }
}
