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
