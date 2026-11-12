import { test, expect } from '@playwright/test'
import {
  calcMeubelNettoCents, calcMeubelBrutoCents, getLadeOpties, getMeubelModel,
  getLengteBereik, parseMeubelFactor, MEUBEL_FACTOR_DEFAULT, getMeubelPrijsOpbouw,
  getAanvraagBereik, getAanvraagLadeOpties,
  valideerLadeBreedtes, getLadeBreedtes, startLadeBreedtes, kanLadesAanpassen, valideerMeubelConfig,
} from '../src/lib/meubel-config'

// Prijslijst Tailor-Made juli 2026 (netto). Rij: [lengte, lades, euro].
// Per staffel de onder- en bovengrens, zodat een verschoven grens opvalt.
const FACET: [number, number, number][] = [
  [50, 1, 981.76], [120, 1, 981.76], [50, 2, 1153.36], [120, 2, 1153.36],
  [121, 2, 1226.16], [129, 2, 1226.16],
  [130, 2, 1558.96], [190, 2, 1558.96], [130, 3, 1798.16], [190, 3, 1798.16],
  [191, 2, 1694.16], [210, 2, 1694.16], [191, 3, 1964.56], [210, 3, 1964.56], [191, 4, 2224.56], [210, 4, 2224.56],
  [211, 2, 1922.96], [260, 2, 1922.96], [211, 3, 2141.36], [260, 3, 2141.36], [211, 4, 2494.96], [260, 4, 2494.96],
]

const FACET_DOUBLE: [number, number, number][] = [
  [50, 1, 1423.76], [120, 1, 1423.76], [50, 2, 1751.36], [120, 2, 1751.36],
  [121, 2, 1870.96], [129, 2, 1870.96],
  [130, 2, 2266.16], [190, 2, 2266.16], [130, 3, 2640.56], [190, 3, 2640.56],
  [191, 2, 2302.56], [210, 2, 2302.56], [191, 3, 2858.96], [210, 3, 2858.96],
  [211, 2, 2489.76], [260, 2, 2489.76], [211, 3, 3046.16], [260, 3, 3046.16],
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

  test('prijslijst is leidend voor het aantal lades', () => {
    const facet = getMeubelModel('facet')!
    expect(getLadeOpties(facet, 50)).toEqual([1, 2])
    expect(getLadeOpties(facet, 125)).toEqual([2])
    expect(getLadeOpties(facet, 250)).toEqual([2, 3, 4])
    expect(getLadeOpties(getMeubelModel('facet-double')!, 270)).toEqual([3])
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

test.describe('Meubel: prijsopbouw in het paneel', () => {
  test('regels tellen exact op tot het bruto totaal, ook bij een scheve factor', () => {
    for (const factor of [2, 2.35, 1.37, 3.33]) {
      const in_ = { modelId: 'facet-double', lengte: 200, lades: 3, houtkleur: 'white', uitsparingen: 3 }
      const opbouw = getMeubelPrijsOpbouw(in_, factor)!
      expect(opbouw.regels.reduce((s, r) => s + r.cents, 0)).toBe(opbouw.totaal)
      expect(opbouw.totaal).toBe(calcMeubelBrutoCents(in_, factor))
      expect(opbouw.regels.map((r) => r.label)).toEqual(['Facet Double 200 cm · 3 × 2 lades', 'Houtkleur · White', 'Uitsparing · 3×'])
    }
  })

  test('kleur zonder meerprijs geeft geen eigen regel', () => {
    const opbouw = getMeubelPrijsOpbouw({ modelId: 'facet', lengte: 100, lades: 1, houtkleur: 'black' }, 2)!
    expect(opbouw.regels).toEqual([{ label: 'Facet 100 cm · 1 lade', cents: 196352 }])
  })
})

test.describe('Meubel: lade-indeling', () => {
  test('gelijk verdeeld is altijd goed, ook buiten 30 tot 120 cm', () => {
    expect(valideerLadeBreedtes(null, 50, 2)).toBeNull()
    expect(getLadeBreedtes(null, 200, 3)).toEqual([200 / 3, 200 / 3, 200 / 3])
  })

  test('eigen indeling: hele cm, 30 tot 120, samen de lengte', () => {
    expect(valideerLadeBreedtes([60, 80, 60], 200, 3)).toBeNull()
    expect(valideerLadeBreedtes([60, 80], 200, 3)).toContain('aantal')
    expect(valideerLadeBreedtes([29, 111, 60], 200, 3)).toContain('tussen 30 en 120')
    expect(valideerLadeBreedtes([121, 39, 40], 200, 3)).toContain('tussen 30 en 120')
    expect(valideerLadeBreedtes([60, 80, 61], 200, 3)).toContain('samen 200')
    expect(valideerLadeBreedtes([60.5, 79.5, 60], 200, 3)).toContain('hele')
  })

  test('startindeling telt op tot de lengte', () => {
    expect(startLadeBreedtes(200, 3)).toEqual([66, 66, 68])
    expect(startLadeBreedtes(120, 2)).toEqual([60, 60])
  })

  test('aanpassen kan alleen als elke lade binnen 30 tot 120 cm past', () => {
    expect(kanLadesAanpassen(50, 2)).toBe(false)
    expect(kanLadesAanpassen(60, 2)).toBe(true)
    expect(kanLadesAanpassen(260, 2)).toBe(false)
    expect(kanLadesAanpassen(100, 1)).toBe(false)
  })

  test('ongeldige opgeslagen indeling valt in de tekening terug op gelijk', () => {
    expect(getLadeBreedtes([10, 10], 120, 2)).toEqual([60, 60])
  })

  test('volledige configuratie', () => {
    const ok = { modelId: 'facet', lengte: 200, lades: 3, houtkleur: 'white', ladeBreedtes: [60, 80, 60], quantity: 2 }
    expect(valideerMeubelConfig(ok)).toBeNull()
    expect(valideerMeubelConfig({ ...ok, quantity: 0 })).toContain('Aantal')
    expect(valideerMeubelConfig({ ...ok, lades: 5 })).toContain('combinatie')
    expect(valideerMeubelConfig({ ...ok, ladeBreedtes: [60, 80, 70] })).toContain('samen 200')
  })
})

test.describe('Meubel: groter dan standaard is altijd op aanvraag', () => {
  const basisAanvraag = { modelId: 'facet', lengte: 300, lades: 3, houtkleur: 'white', ladeBreedtes: null, quantity: 1, opAanvraag: true }

  test('nooit een prijs, ook niet bij een lengte die wel in de tabel staat', () => {
    expect(calcMeubelNettoCents(basisAanvraag)).toBeNull()
    expect(calcMeubelBrutoCents({ ...basisAanvraag, lengte: 200 }, 2)).toBeNull()
    expect(getMeubelPrijsOpbouw(basisAanvraag, 2)).toBeNull()
  })

  test('bereik begint boven het maximum van het model', () => {
    expect(getAanvraagBereik(getMeubelModel('facet')!)).toEqual({ min: 261, max: 400 })
    expect(getAanvraagBereik(getMeubelModel('facet-double')!)).toEqual({ min: 291, max: 400 })
  })

  test('lades: gelijke verdeling binnen 30 tot 120 cm', () => {
    expect(getAanvraagLadeOpties(300)).toEqual([3, 4, 5, 6])
    expect(getAanvraagLadeOpties(400)).toEqual([4, 5, 6])
  })

  test('validatie', () => {
    expect(valideerMeubelConfig(basisAanvraag)).toBeNull()
    expect(valideerMeubelConfig({ ...basisAanvraag, lengte: 260 })).toContain('Op aanvraag kan van 261')
    expect(valideerMeubelConfig({ ...basisAanvraag, lengte: 401 })).toContain('Op aanvraag')
    expect(valideerMeubelConfig({ ...basisAanvraag, lades: 2 })).toContain('lades')
    expect(valideerMeubelConfig({ ...basisAanvraag, ladeBreedtes: [100, 100, 100] })).toBeNull()
    expect(valideerMeubelConfig({ ...basisAanvraag, houtkleur: 'roze' })).toContain('bestaat niet')
  })

  test('zonder de schakelaar blijft een te grote lengte ongeldig', () => {
    expect(valideerMeubelConfig({ ...basisAanvraag, opAanvraag: false })).toContain('combinatie')
  })
})
