import { test, expect } from '@playwright/test'
import {
  calcMeubelNettoCents, calcMeubelBrutoCents, getLadeOpties, getMeubelModel,
  getLengteBereik, parseMeubelFactor, MEUBEL_FACTOR_DEFAULT,
} from '../src/lib/meubel-config'

// Prijslijst Tailor-Made juli 2026 (netto). Rij: [lengte, lades, euro].
// Per staffel de onder- en bovengrens, zodat een verschoven grens opvalt.
const FACET: [number, number, number][] = [
  [50, 1, 981.76], [120, 1, 981.76], [60, 2, 1153.36], [120, 2, 1153.36],
  [121, 2, 1226.16], [129, 2, 1226.16],
  [130, 2, 1558.96], [190, 2, 1558.96], [130, 3, 1798.16], [190, 3, 1798.16],
  [191, 2, 1694.16], [210, 2, 1694.16], [191, 3, 1964.56], [210, 3, 1964.56], [191, 4, 2224.56], [210, 4, 2224.56],
  [211, 2, 1922.96], [240, 2, 1922.96], [211, 3, 2141.36], [260, 3, 2141.36], [211, 4, 2494.96], [260, 4, 2494.96],
]

const FACET_DOUBLE: [number, number, number][] = [
  [50, 1, 1423.76], [120, 1, 1423.76], [60, 2, 1751.36], [120, 2, 1751.36],
  [121, 2, 1870.96], [129, 2, 1870.96],
  [130, 2, 2266.16], [190, 2, 2266.16], [130, 3, 2640.56], [190, 3, 2640.56],
  [191, 2, 2302.56], [210, 2, 2302.56], [191, 3, 2858.96], [210, 3, 2858.96],
  [211, 2, 2489.76], [240, 2, 2489.76], [211, 3, 3046.16], [260, 3, 3046.16],
  [261, 3, 3233.36], [290, 3, 3233.36],
]

const basis = { houtkleur: 'old-grey' } as const

for (const [modelId, rijen] of [['facet', FACET], ['facet-double', FACET_DOUBLE]] as const) {
  test.describe(`Tabelprijzen ${modelId}`, () => {
    for (const [lengte, lades, euro] of rijen) {
      test(`${lengte} cm, ${lades} lade(s) = € ${euro}`, () => {
        expect(calcMeubelNettoCents({ modelId, lengte, lades, ...basis })).toBe(Math.round(euro * 100))
      })
    }
  })
}

test.describe('Meubel: opties en grenzen', () => {
  test('houtkleur met meerprijs telt € 41,60 op, Old Grey en Black niet', () => {
    const in_ = { modelId: 'facet', lengte: 100, lades: 1 }
    expect(calcMeubelNettoCents({ ...in_, houtkleur: 'white' })).toBe(98176 + 4160)
    expect(calcMeubelNettoCents({ ...in_, houtkleur: 'black' })).toBe(98176)
  })

  test('uitsparing € 10,40 per stuk', () => {
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 100, lades: 1, ...basis, uitsparingen: 2 })).toBe(98176 + 2080)
  })

  test('buiten bereik of onbekende combinatie geeft null', () => {
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 49, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 261, lades: 3, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 125, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 100.5, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 100, lades: 1, houtkleur: 'roze' })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'onbekend', lengte: 100, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 100, lades: 1, ...basis, uitsparingen: -1 })).toBeNull()
  })

  test('lade smaller dan 30 cm of breder dan 120 cm is niet te kiezen', () => {
    const facet = getMeubelModel('facet')!
    expect(getLadeOpties(facet, 55)).toEqual([1])
    expect(getLadeOpties(facet, 60)).toEqual([1, 2])
    expect(getLadeOpties(facet, 250)).toEqual([3, 4])
    expect(getLadeOpties(facet, 240)).toEqual([2, 3, 4])
  })

  test('lengtebereik per model', () => {
    expect(getLengteBereik(getMeubelModel('facet')!)).toEqual({ min: 50, max: 260 })
    expect(getLengteBereik(getMeubelModel('facet-double')!)).toEqual({ min: 50, max: 290 })
  })
})

test.describe('Meubel: bruto en factor', () => {
  const in_ = { modelId: 'facet', lengte: 100, lades: 1, ...basis }

  test('bruto = netto × factor', () => {
    expect(calcMeubelBrutoCents(in_, 2)).toBe(196352)
    expect(calcMeubelBrutoCents(in_, 2.35)).toBe(Math.round(98176 * 2.35))
  })

  test('ongeldige factor valt terug op 2, zodat er nooit netto in beeld staat', () => {
    expect(MEUBEL_FACTOR_DEFAULT).toBe(2)
    for (const fout of [null, undefined, '', 'abc', 0, -1, NaN, 99]) {
      expect(parseMeubelFactor(fout)).toBe(2)
    }
    expect(parseMeubelFactor('2,5')).toBe(2.5)
    expect(calcMeubelBrutoCents(in_, NaN)).toBe(196352)
  })
})
