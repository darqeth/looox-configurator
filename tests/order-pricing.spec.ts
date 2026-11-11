import { test, expect } from '@playwright/test'
import { computeOrderTotals } from '../src/lib/order-pricing'

// computeOrderTotals is dé bron van waarheid voor ordertotalen: bestelmodal,
// placeOrder/placeOrderFromConfig, PDF en e-mail rekenen hiermee.
// Semantiek: bruto → dealerkorting → staffel → kortingscode (over netto).

test.describe('computeOrderTotals', () => {
  test('basis: dealerkorting 50%, 1 stuk, geen kortingen', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 1 })
    expect(t.nettoNaDealer).toBe(320)
    expect(t.staffelPct).toBe(0)
    expect(t.nettoUnitPrice).toBe(320)
    expect(t.subtotal).toBe(320)
    expect(t.discountAmount).toBe(0)
    expect(t.total).toBe(320)
  })

  test('staffel: 10 stuks = 3% over netto', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 10 })
    expect(t.nettoNaDealer).toBe(320)
    expect(t.staffelPct).toBe(0.03)
    expect(t.staffelAmountPerStuk).toBe(Math.round(320 * 0.03)) // 10
    expect(t.nettoUnitPrice).toBe(310)
    expect(t.subtotal).toBe(3100)
    expect(t.total).toBe(3100)
  })

  test('staffel-grenzen: 20 → 5%, 50 → 7%, 100 → 10%, 250 → 12%, 500 → 15%', () => {
    for (const [qty, pct] of [[20, 0.05], [50, 0.07], [100, 0.10], [250, 0.12], [500, 0.15]] as const) {
      const t = computeOrderTotals({ brutoUnitPrice: 1000, dealerKortingPct: 0, quantity: qty })
      expect(t.staffelPct, `qty=${qty}`).toBe(pct)
    }
  })

  test('kortingscode pct gaat over NETTO subtotaal, niet over bruto (audit C2)', () => {
    // Bruto 640, korting 50% → netto 320. 10%-code = €32, NIET €64.
    const t = computeOrderTotals({
      brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 1,
      discount: { type: 'pct', value: 10 },
    })
    expect(t.discountAmount).toBe(32)
    expect(t.total).toBe(288)
  })

  test('kortingscode fixed wordt geclamped op subtotaal', () => {
    const t = computeOrderTotals({
      brutoUnitPrice: 100, dealerKortingPct: 50, quantity: 1,
      discount: { type: 'fixed', value: 250 },
    })
    expect(t.discountAmount).toBe(50)
    expect(t.total).toBe(0)
  })

  test('stapeling: dealerkorting + staffel + pct-code in de juiste volgorde', () => {
    // bruto 1000, dealer 40% → 600; staffel 5% (qty 20) → 570 p/st
    // subtotaal 11400; 10%-code → 1140; totaal 10260
    const t = computeOrderTotals({
      brutoUnitPrice: 1000, dealerKortingPct: 40, quantity: 20,
      discount: { type: 'pct', value: 10 },
    })
    expect(t.nettoNaDealer).toBe(600)
    expect(t.staffelAmountPerStuk).toBe(30)
    expect(t.nettoUnitPrice).toBe(570)
    expect(t.subtotal).toBe(11400)
    expect(t.discountAmount).toBe(1140)
    expect(t.total).toBe(10260)
  })

  test('projectspiegel: geen dealerkorting, geen staffel', () => {
    const t = computeOrderTotals({
      brutoUnitPrice: 2500, dealerKortingPct: 50, quantity: 8, isProjectspiegel: true,
    })
    expect(t.nettoNaDealer).toBe(2500)
    expect(t.staffelPct).toBe(0)
    expect(t.subtotal).toBe(20000)
    expect(t.total).toBe(20000)
  })

  test('identiek aan de oude bestelmodal-berekening (regressiebewijs)', () => {
    // De formule zoals die in order-button.tsx stond vóór de refactor
    const price = 847, korting = 45, quantity = 12
    const nettoNaDealer = Math.round(price * (1 - korting / 100))
    const staffelPct = 0.03
    const staffelAmountPerStuk = Math.round(nettoNaDealer * staffelPct)
    const nettoUnitPrice = nettoNaDealer - staffelAmountPerStuk
    const subtotal = nettoUnitPrice * quantity
    const discountAmount = Math.round(subtotal * 15 / 100)

    const t = computeOrderTotals({
      brutoUnitPrice: price, dealerKortingPct: korting, quantity,
      discount: { type: 'pct', value: 15 },
    })
    expect(t.nettoUnitPrice).toBe(nettoUnitPrice)
    expect(t.subtotal).toBe(subtotal)
    expect(t.discountAmount).toBe(discountAmount)
    expect(t.total).toBe(subtotal - discountAmount)
  })
})

test.describe('Mirror Maintenance Set (sprint 2026-11, S4)', () => {
  test('zonder MMS verandert er niets aan het totaal', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 1 })
    expect(t.mmsQuantity).toBe(0)
    expect(t.mmsNetto).toBe(0)
    expect(t.total).toBe(320)
  })

  test('rekenvoorbeeld bij 50% dealerkorting: 1, 2 en 10 sets', () => {
    const basis = { brutoUnitPrice: 510, dealerKortingPct: 50, quantity: 1 }
    const een = computeOrderTotals({ ...basis, mmsQuantity: 1 })
    expect(een.mmsBruto).toBe(18.95)
    expect(een.mmsNetto).toBe(9.48)
    expect(een.total).toBe(264.48)
    const twee = computeOrderTotals({ ...basis, mmsQuantity: 2 })
    expect(twee.mmsBruto).toBe(37.9)
    expect(twee.mmsNetto).toBe(18.95)
    expect(twee.total).toBe(273.95)
    const tien = computeOrderTotals({ ...basis, mmsQuantity: 10 })
    expect(tien.mmsBruto).toBe(189.5)
    expect(tien.mmsNetto).toBe(94.75)
    expect(tien.total).toBe(349.75)
  })

  test('MMS-aantal staat los van het aantal spiegels en krijgt geen staffelkorting', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 10, mmsQuantity: 2 })
    expect(t.staffelPct).toBe(0.03)
    expect(t.subtotal).toBe(3100)
    expect(t.mmsNetto).toBe(18.95)
    expect(t.total).toBe(3118.95)
  })

  test('kortingscode geldt alleen voor de spiegels', () => {
    const pct = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 1, mmsQuantity: 2, discount: { type: 'pct', value: 10 } })
    expect(pct.discountAmount).toBe(32)
    expect(pct.total).toBe(306.95) // 320 − 32 + 18,95
    const fixed = computeOrderTotals({ brutoUnitPrice: 640, dealerKortingPct: 50, quantity: 1, mmsQuantity: 1, discount: { type: 'fixed', value: 5000 } })
    expect(fixed.discountAmount).toBe(320) // geclamped op het spiegel-subtotaal
    expect(fixed.total).toBe(9.48)         // de set blijft betaald
  })

  test('aantal wordt begrensd op 0 t/m 10 en afgerond naar beneden', () => {
    const basis = { brutoUnitPrice: 100, dealerKortingPct: 50, quantity: 1 }
    expect(computeOrderTotals({ ...basis, mmsQuantity: 25 }).mmsQuantity).toBe(10)
    expect(computeOrderTotals({ ...basis, mmsQuantity: -3 }).mmsQuantity).toBe(0)
    expect(computeOrderTotals({ ...basis, mmsQuantity: 2.9 }).mmsQuantity).toBe(2)
  })

  test('andere dealerkorting: 40% en 47,5%', () => {
    expect(computeOrderTotals({ brutoUnitPrice: 100, dealerKortingPct: 40, quantity: 1, mmsQuantity: 3 }).mmsNetto).toBe(34.11) // 56,85 × 0,6
    expect(computeOrderTotals({ brutoUnitPrice: 100, dealerKortingPct: 47.5, quantity: 1, mmsQuantity: 1 }).mmsNetto).toBe(9.95) // 18,95 × 0,525 = 9,94875
  })

  test('projectspiegel krijgt nooit een MMS-regel', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 52.6, dealerKortingPct: 50, quantity: 10, isProjectspiegel: true, mmsQuantity: 4 })
    expect(t.mmsQuantity).toBe(0)
    expect(t.total).toBe(526)
  })

  test('formatEuro: hele bedragen zonder centen, anders twee decimalen', async () => {
    const { formatEuro } = await import('../src/lib/mms')
    expect(formatEuro(510)).toBe('€510')
    expect(formatEuro(1530)).toBe('€1.530')
    expect(formatEuro(37.9)).toBe('€37,90')
    expect(formatEuro(9.48)).toBe('€9,48')
    expect(formatEuro(3118.95)).toBe('€3.118,95')
  })
})

test.describe('Mirror Maintenance Set: buitenlandtoeslag 5% (sprint 2026-11, S4)', () => {
  test('stuksprijs: €18,95 standaard, €19,90 voor internationale dealers', async () => {
    const { getMmsUnitPrice, resolveMmsUnitPrice } = await import('../src/lib/mms')
    expect(getMmsUnitPrice(false)).toBe(18.95)
    expect(getMmsUnitPrice(true)).toBe(19.9) // 18,95 × 1,05 = 19,8975 → 19,90
    // vastgelegde prijs: alleen de twee bekende prijzen worden geaccepteerd
    expect(resolveMmsUnitPrice(19.9)).toBe(19.9)
    expect(resolveMmsUnitPrice(18.95)).toBe(18.95)
    expect(resolveMmsUnitPrice(undefined)).toBe(18.95)
    expect(resolveMmsUnitPrice(1)).toBe(18.95)
  })

  test('ordertotaal voor een internationale dealer rekent met €19,90 per set', () => {
    const basis = { brutoUnitPrice: 510, dealerKortingPct: 50, quantity: 1, mmsUnitPrice: 19.9 }
    const een = computeOrderTotals({ ...basis, mmsQuantity: 1 })
    expect(een.mmsBruto).toBe(19.9)
    expect(een.mmsNetto).toBe(9.95)
    expect(een.total).toBe(264.95)
    const drie = computeOrderTotals({ ...basis, mmsQuantity: 3 })
    expect(drie.mmsBruto).toBe(59.7)
    expect(drie.mmsNetto).toBe(29.85)
    expect(drie.total).toBe(284.85)
  })

  test('zonder opgegeven stuksprijs geldt de standaardprijs', () => {
    const t = computeOrderTotals({ brutoUnitPrice: 510, dealerKortingPct: 50, quantity: 1, mmsQuantity: 2 })
    expect(t.mmsUnitPrice).toBe(18.95)
    expect(t.mmsNetto).toBe(18.95)
  })
})
