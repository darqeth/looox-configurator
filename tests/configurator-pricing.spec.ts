import { test, expect } from '@playwright/test'
import { calcTotalPrice, SOL_CATALOGUS, LUNA_CATALOGUS, RONDE_GLAS_SMOKE_M2 } from '../src/lib/configurator-config'

// Regressietests voor de bugklasse "state-veld niet doorgegeven aan
// calcTotalPrice" (optionSubChoices 2026-05-27, lunaMeubelHoogte audit C1).

const baseLight = {
  directPosition: 'geen', directType: null, directControl: null,
  indirectPosition: 'geen', indirectType: null, indirectControl: null,
} as const

function luna(over: Partial<Parameters<typeof calcTotalPrice>[0]> = {}) {
  return calcTotalPrice({
    shape: 'luna', width: 0, height: 0, diameter: 90, organicSizeKey: null,
    glasKleur: 'helder', selectedOptions: [], ...baseLight, ...over,
  })
}

test.describe('Luna catalogusprijs', () => {
  test('basis zonder extra deel = €829', () => {
    expect(luna()).toBe(LUNA_CATALOGUS.basis)
  })

  test('extra deel + meubelhoogte 35 = €1019 (goedkope trap)', () => {
    expect(luna({ selectedOptions: ['luna-extra-deel'], lunaMeubelHoogte: 35 }))
      .toBe(LUNA_CATALOGUS.basis + LUNA_CATALOGUS.extraDeel35)
  })

  test('extra deel + meubelhoogte 28 = €1039 (dure trap — audit C1)', () => {
    // Dit is exact de bug: zonder lunaMeubelHoogte viel de server terug op
    // default 35 en sloeg €1019 op terwijl de klant €1039 zag.
    expect(luna({ selectedOptions: ['luna-extra-deel'], lunaMeubelHoogte: 28 }))
      .toBe(LUNA_CATALOGUS.basis + LUNA_CATALOGUS.extraDeel30)
  })

  test('extra deel + diameter > 160 = dure trap, ongeacht meubelhoogte', () => {
    expect(luna({ selectedOptions: ['luna-extra-deel'], lunaMeubelHoogte: 35, diameter: 170 }))
      .toBe(LUNA_CATALOGUS.basis + LUNA_CATALOGUS.extraDeel30)
  })

  test('smoke glaskleur: meerprijs = π × (d/200)² × €61', () => {
    const d = 90
    const verwacht = Math.round(Math.PI * Math.pow(d / 200, 2) * RONDE_GLAS_SMOKE_M2)
    expect(luna({ glasKleur: 'smoke-zwart' })).toBe(LUNA_CATALOGUS.basis + verwacht)
  })
})

test.describe('Sol catalogusprijs', () => {
  function sol(over: Partial<Parameters<typeof calcTotalPrice>[0]> = {}) {
    return calcTotalPrice({
      shape: 'sol', width: 0, height: 0, diameter: 80, organicSizeKey: null,
      glasKleur: 'helder', selectedOptions: [], ...baseLight, ...over,
    })
  }

  test('basis = €999, met extra deel = €1199', () => {
    expect(sol()).toBe(SOL_CATALOGUS.basis)
    expect(sol({ selectedOptions: ['sol-extra-deel'] })).toBe(SOL_CATALOGUS.metExtraDeel)
  })
})
