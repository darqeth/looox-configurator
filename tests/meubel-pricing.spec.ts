import { test, expect } from '@playwright/test'
import {
  calcMeubelNettoCents, calcMeubelBrutoCents, getLadeOpties, getMeubelModel,
  getLengteBereik, parseMeubelFactor, MEUBEL_FACTOR_DEFAULT, getMeubelPrijsOpbouw,
  getAanvraagBereik, getAanvraagLadeOpties, getMeubelOrderOpbouw, formatPct,
  MEUBEL_MODELLEN, getHoutkleuren, getMeubelHoogte, ladeRuimte, meubelOptiesTekst,
  getRegaalBreedte, getDuoPrijs, getDuoReeksen, getLengteBereik as lengteBereik,
  formatMm, ladeBreedtesTekst, valideerLadeBreedtes, getLadeBreedtes, startLadeBreedtes, kanLadesAanpassen, valideerMeubelConfig,
} from '../src/lib/meubel-config'

// Prijslijst Tailor-Made juli 2026 (netto). Rij: [lengte in mm, lades, euro].
// Per staffel de onder- en bovengrens, zodat een verschoven grens opvalt.
const FACET: [number, number, number][] = [
  [500, 1, 981.76], [1200, 1, 981.76], [700, 2, 1153.36], [1200, 2, 1153.36],
  [1210, 2, 1226.16], [1290, 2, 1226.16],
  [1300, 2, 1558.96], [1900, 2, 1558.96], [1300, 3, 1798.16], [1900, 3, 1798.16],
  [1910, 2, 1694.16], [2100, 2, 1694.16], [1910, 3, 1964.56], [2100, 3, 1964.56], [1910, 4, 2224.56], [2100, 4, 2224.56],
  [2110, 2, 1922.96], [2400, 2, 1922.96], [2110, 3, 2141.36], [2600, 3, 2141.36], [2110, 4, 2494.96], [2600, 4, 2494.96],
]

const FACET_DOUBLE: [number, number, number][] = [
  [500, 1, 1423.76], [1200, 1, 1423.76], [700, 2, 1751.36], [1200, 2, 1751.36],
  [1210, 2, 1870.96], [1290, 2, 1870.96],
  [1300, 2, 2266.16], [1900, 2, 2266.16], [1300, 3, 2640.56], [1900, 3, 2640.56],
  [1910, 2, 2302.56], [2100, 2, 2302.56], [1910, 3, 2858.96], [2100, 3, 2858.96],
  [2110, 2, 2489.76], [2400, 2, 2489.76], [2110, 3, 3046.16], [2600, 3, 3046.16],
  [2610, 3, 3233.36], [2900, 3, 3233.36],
]

const basis = { houtkleur: 'old-grey' } as const

for (const [modelId, rijen] of [['facet', FACET], ['facet-double', FACET_DOUBLE]] as const) {
  test.describe(`Tabelprijzen ${modelId}`, () => {
    for (const [lengte, lades, euro] of rijen) {
      test(`${lengte} mm, ${lades} lade(s) = € ${euro}`, () => {
        expect(calcMeubelNettoCents({ modelId, lengte, lades, ...basis })).toBe(Math.round(euro * 100))
      })
    }
  })
}

test.describe('Meubel: opties en grenzen', () => {
  test('houtkleur met meerprijs telt € 41,60 op, Old Grey en Black niet', () => {
    const in_ = { modelId: 'facet', lengte: 1000, lades: 1 }
    expect(calcMeubelNettoCents({ ...in_, houtkleur: 'white' })).toBe(98176 + 4160)
    expect(calcMeubelNettoCents({ ...in_, houtkleur: 'black' })).toBe(98176)
  })

  test('uitsparing € 10,40 per stuk', () => {
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 1000, lades: 1, ...basis, uitsparingen: 2 })).toBe(98176 + 2080)
  })

  test('buiten bereik of onbekende combinatie geeft null', () => {
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 499, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 2601, lades: 3, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 1250, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 1000.5, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 1000, lades: 1, houtkleur: 'roze' })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'onbekend', lengte: 1000, lades: 1, ...basis })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 1000, lades: 1, ...basis, uitsparingen: -1 })).toBeNull()
  })

  test('aantal lades: prijslijst, met 350 tot 1200 mm per lade', () => {
    const facet = getMeubelModel('facet')!
    expect(getLadeOpties(facet, 500)).toEqual([1])
    expect(getLadeOpties(facet, 699)).toEqual([1])
    expect(getLadeOpties(facet, 700)).toEqual([1, 2])
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 699, lades: 2, houtkleur: 'old-grey' })).toBeNull()
    expect(getLadeOpties(facet, 1250)).toEqual([2])
    expect(getLadeOpties(facet, 2400)).toEqual([2, 3, 4])
    expect(getLadeOpties(facet, 2401)).toEqual([3, 4])
    expect(calcMeubelNettoCents({ modelId: 'facet', lengte: 2600, lades: 2, houtkleur: 'old-grey' })).toBeNull()
    expect(getLadeOpties(getMeubelModel('facet-double')!, 2700)).toEqual([3])
  })

  test('lengtebereik per model', () => {
    expect(getLengteBereik(getMeubelModel('facet')!)).toEqual({ min: 500, max: 2600 })
    expect(getLengteBereik(getMeubelModel('facet-double')!)).toEqual({ min: 500, max: 2900 })
  })
})

test.describe('Meubel: bruto en factor', () => {
  const in_ = { modelId: 'facet', lengte: 1000, lades: 1, ...basis }

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
      const in_ = { modelId: 'facet-double', lengte: 2000, lades: 3, houtkleur: 'white', uitsparingen: 3 }
      const opbouw = getMeubelPrijsOpbouw(in_, factor)!
      expect(opbouw.regels.reduce((s, r) => s + r.cents, 0)).toBe(opbouw.totaal)
      expect(opbouw.totaal).toBe(calcMeubelBrutoCents(in_, factor))
      expect(opbouw.regels.map((r) => r.label)).toEqual(['Facet Double 2000 mm · 3 × 2 lades', 'Houtkleur · White', 'Uitsparing · 3×'])
    }
  })

  test('kleur zonder meerprijs geeft geen eigen regel', () => {
    const opbouw = getMeubelPrijsOpbouw({ modelId: 'facet', lengte: 1000, lades: 1, houtkleur: 'black' }, 2)!
    expect(opbouw.regels).toEqual([{ label: 'Facet 1000 mm · 1 lade', cents: 196352 }])
  })
})

test.describe('Meubel: lade-indeling', () => {
  test('gelijk verdeeld', () => {
    expect(valideerLadeBreedtes(null, 2400, 2)).toBeNull()
    expect(getLadeBreedtes(null, 1800, 3)).toEqual([600, 600, 600])
    // Komt het niet uit, dan is elke lade toch even breed, met een maat achter de komma
    const derde = getLadeBreedtes(null, 2000, 3)
    expect(new Set(derde).size).toBe(1)
    expect(derde.map(formatMm)).toEqual(['666,7', '666,7', '666,7'])
    expect(ladeBreedtesTekst(null, 2000, 3)).toBe('Gelijk verdeeld, 666,7 mm per lade')
    expect(ladeBreedtesTekst(null, 1800, 3)).toBe('Gelijk verdeeld, 600 mm per lade')
    expect(formatMm(1250)).toBe('1250')
  })

  test('eigen indeling: hele mm, 350 tot 1200, samen de lengte', () => {
    expect(valideerLadeBreedtes([600, 800, 600], 2000, 3)).toBeNull()
    expect(valideerLadeBreedtes([600, 800], 2000, 3)).toContain('aantal')
    expect(valideerLadeBreedtes([349, 1051, 600], 2000, 3)).toContain('tussen 350 en 1200')
    expect(valideerLadeBreedtes([1201, 399, 400], 2000, 3)).toContain('tussen 350 en 1200')
    expect(valideerLadeBreedtes([600, 800, 601], 2000, 3)).toContain('samen 2000')
    expect(valideerLadeBreedtes([600.5, 799.5, 600], 2000, 3)).toContain('hele')
  })

  test('startindeling telt op tot de lengte', () => {
    expect(startLadeBreedtes(2000, 3)).toEqual([667, 667, 666])
    expect(startLadeBreedtes(1200, 2)).toEqual([600, 600])
  })

  test('aanpassen kan alleen als elke lade binnen 350 tot 1200 mm past', () => {
    expect(kanLadesAanpassen(699, 2)).toBe(false)
    expect(kanLadesAanpassen(700, 2)).toBe(true)
    expect(kanLadesAanpassen(2600, 2)).toBe(false)
    expect(kanLadesAanpassen(1000, 1)).toBe(false)
  })

  test('ongeldige opgeslagen indeling valt in de tekening terug op gelijk', () => {
    expect(getLadeBreedtes([100, 100], 1200, 2)).toEqual([600, 600])
  })

  test('volledige configuratie', () => {
    const ok = { modelId: 'facet', lengte: 2000, lades: 3, houtkleur: 'white', ladeBreedtes: [600, 800, 600], quantity: 2 }
    expect(valideerMeubelConfig(ok)).toBeNull()
    expect(valideerMeubelConfig({ ...ok, quantity: 0 })).toContain('Aantal')
    expect(valideerMeubelConfig({ ...ok, lades: 5 })).toContain('combinatie')
    expect(valideerMeubelConfig({ ...ok, ladeBreedtes: [600, 800, 700] })).toContain('samen 2000')
  })
})

test.describe('Meubel: groter dan standaard is altijd op aanvraag', () => {
  const basisAanvraag = { modelId: 'facet', lengte: 3000, lades: 3, houtkleur: 'white', ladeBreedtes: null, quantity: 1, opAanvraag: true }

  test('nooit een prijs, ook niet bij een lengte die wel in de tabel staat', () => {
    expect(calcMeubelNettoCents(basisAanvraag)).toBeNull()
    expect(calcMeubelBrutoCents({ ...basisAanvraag, lengte: 2000 }, 2)).toBeNull()
    expect(getMeubelPrijsOpbouw(basisAanvraag, 2)).toBeNull()
  })

  test('bereik begint boven het maximum van het model', () => {
    expect(getAanvraagBereik(getMeubelModel('facet')!)).toEqual({ min: 2601, max: 3500 })
    expect(getAanvraagBereik(getMeubelModel('facet-double')!)).toEqual({ min: 2901, max: 3500 })
  })

  test('lades: gelijke verdeling binnen 350 tot 1200 mm', () => {
    expect(getAanvraagLadeOpties(3000)).toEqual([3, 4, 5, 6])
    expect(getAanvraagLadeOpties(3500)).toEqual([3, 4, 5, 6])
    expect(getAanvraagLadeOpties(3601)).toEqual([4, 5, 6])
  })

  test('validatie', () => {
    expect(valideerMeubelConfig(basisAanvraag)).toBeNull()
    expect(valideerMeubelConfig({ ...basisAanvraag, lengte: 2600 })).toContain('Op aanvraag kan van 2601')
    expect(valideerMeubelConfig({ ...basisAanvraag, lengte: 3501 })).toContain('Op aanvraag')
    expect(valideerMeubelConfig({ ...basisAanvraag, lades: 2 })).toContain('lades')
    expect(valideerMeubelConfig({ ...basisAanvraag, ladeBreedtes: [1000, 1000, 1000] })).toBeNull()
    expect(valideerMeubelConfig({ ...basisAanvraag, houtkleur: 'roze' })).toContain('bestaat niet')
  })

  test('zonder de schakelaar blijft een te grote lengte ongeldig', () => {
    expect(valideerMeubelConfig({ ...basisAanvraag, opAanvraag: false })).toContain('combinatie')
  })
})

test.describe('Meubel: staffelgrenzen in mm', () => {
  const p = (lengte: number, lades: number) => calcMeubelNettoCents({ modelId: 'facet', lengte, lades, houtkleur: 'old-grey' })

  test('boven de bovengrens van een staffel geldt de volgende', () => {
    expect(p(1200, 2)).toBe(115336) // 50 tot 120 cm
    expect(p(1201, 2)).toBe(122616) // 121 tot 129 cm
    expect(p(1290, 2)).toBe(122616)
    expect(p(1291, 2)).toBe(155896) // 130 tot 190 cm
    expect(p(1900, 3)).toBe(179816)
    expect(p(1901, 3)).toBe(196456) // 191 tot 210 cm
    expect(p(2101, 4)).toBe(249496) // 211 tot 260 cm
  })

  test('1 lade kan niet meer boven 1200 mm', () => {
    expect(p(1200, 1)).toBe(98176)
    expect(p(1201, 1)).toBeNull()
  })
})

test.describe('Meubel: prijsopbouw bij de bestelling', () => {
  test('bruto, korting en netto tellen op; factor 2 is 50% korting', () => {
    expect(getMeubelOrderOpbouw(98176, 2)).toEqual({ brutoCents: 196352, kortingCents: 98176, kortingPct: 50, nettoCents: 98176 })
  })

  test('andere factor: netto blijft de tabelprijs', () => {
    const o = getMeubelOrderOpbouw(98176, 2.35)
    expect(o.brutoCents - o.kortingCents).toBe(98176)
    expect(o.kortingPct).toBe(57.4)
    expect(formatPct(o.kortingPct)).toBe('57,4%')
    expect(getMeubelOrderOpbouw(98176, 1).kortingCents).toBe(0)
  })
})

// Fase 4: overige houten modellen. Per model een paar cellen uit de prijslijst,
// op de onder- of bovengrens van de staffel. Rij: [model, lengte in mm, lades, euro].
const FASE4: [string, number, number, number][] = [
  ['facet-deco', 500, 1, 1038.96], ['facet-deco', 1200, 2, 1215.76], ['facet-deco', 1290, 2, 1257.36],
  ['facet-stripes', 700, 1, 976.56], ['facet-stripes', 1200, 2, 1142.96], ['facet-stripes', 1390, 2, 1215.76],
  ['facet-stripes', 1900, 3, 1860.56], ['facet-stripes', 2100, 2, 1702.48], ['facet-stripes', 2550, 3, 2078.96],
  ['facet-stripes-double', 700, 1, 1777.36], ['facet-stripes-double', 1400, 2, 2214.16], ['facet-stripes-double', 1900, 3, 3170.96],
  ['facet-stripes-double', 2100, 2, 2921.36], ['facet-stripes-double', 2500, 3, 3576.56],
  ['facet-waves', 500, 1, 1392.56], ['facet-waves', 1290, 2, 1704.56], ['facet-waves', 1900, 3, 2229.76], ['facet-waves', 2600, 3, 2474.16],
  ['full-frame', 500, 1, 1402.96], ['full-frame', 1750, 3, 1922.96], ['full-frame', 2250, 2, 1954.16], ['full-frame', 2700, 3, 2422.16],
  ['u-frame', 500, 1, 1142.96], ['u-frame', 1200, 2, 1454.96], ['u-frame', 1750, 3, 1891.76], ['u-frame', 2700, 3, 2385.76],
  ['u-floor', 500, 1, 2110.16], ['u-floor', 1200, 1, 2141.36], ['u-floor', 1400, 2, 2744.56], ['u-floor', 1800, 2, 3430.96], ['u-floor', 2200, 2, 3753.36],
  ['basic-drawer', 800, 1, 1038.96], ['basic-drawer', 1000, 2, 1142.96], ['basic-drawer', 1200, 1, 1132.56], ['basic-drawer', 1600, 2, 1350.96], ['basic-drawer', 2400, 2, 1766.96],
  ['drawer-box', 800, 1, 1226.16], ['drawer-box', 1000, 2, 1553.76], ['drawer-box', 1600, 2, 1725.36], ['drawer-box', 2100, 3, 2302.56], ['drawer-box', 2400, 2, 2390.96],
  ['drawer-box-double', 800, 1, 1829.36], ['drawer-box-double', 1000, 1, 1766.96], ['drawer-box-double', 1200, 2, 2224.56], ['drawer-box-double', 2100, 3, 3108.56], ['drawer-box-double', 2600, 3, 3347.76],
  ['block', 680, 1, 1007.76], ['block', 880, 1, 1012.96], ['block', 1200, 2, 1397.76], ['block', 1580, 2, 1428.96], ['block', 2280, 2, 1647.36],
]

test.describe('Fase 4: tabelprijzen overige houten modellen', () => {
  for (const [modelId, lengte, lades, euro] of FASE4) {
    test(`${modelId} ${lengte} mm, ${lades} lade(s) = € ${euro}`, () => {
      expect(calcMeubelNettoCents({ modelId, lengte, lades, houtkleur: 'old-grey' })).toBe(Math.round(euro * 100))
    })
  }

  test('elk model heeft bij elke staffelgrens minstens één ladekeuze', () => {
    for (const model of MEUBEL_MODELLEN.filter((m) => !m.vasteLengtes)) {
      for (const staffel of model.staffels) {
        // Regal-modellen met de standaardbreedte van de regaalkast
        expect(getLadeOpties(model, staffel.max * 10, getRegaalBreedte(model, null)).length, `${model.id} ${staffel.max} cm`).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Fase 4: rand, hoogte en kleur', () => {
  const fullFrame = getMeubelModel('full-frame')!
  const uFloor = getMeubelModel('u-floor')!

  test('rand gaat er aan beide zijden af voordat de lades verdeeld worden', () => {
    expect(ladeRuimte(fullFrame, 2000)).toBe(1900)
    expect(ladeRuimte(uFloor, 1400)).toBe(1320)
    expect(ladeRuimte(getMeubelModel('facet')!, 2000)).toBe(2000)
    expect(getLadeBreedtes(null, ladeRuimte(fullFrame, 2000), 2)).toEqual([950, 950])
  })

  test('grenzen van 350 en 1200 mm gelden op de ruimte na de rand', () => {
    // Full-Frame 2500 mm: 2400 mm voor de lades, dus 2 lades van 1200 kan nog net
    expect(getLadeOpties(fullFrame, 2500)).toEqual([2, 3])
    expect(getLadeOpties(fullFrame, 2501)).toEqual([3])
    // 790 mm: 690 mm voor de lades, 2 lades zou 345 mm zijn
    expect(getLadeOpties(fullFrame, 790)).toEqual([1])
    expect(getLadeOpties(fullFrame, 800)).toEqual([1, 2])
  })

  test('eigen indeling moet optellen tot de ruimte na de rand', () => {
    const basisCfg = { modelId: 'full-frame', lengte: 2000, lades: 2, houtkleur: 'old-grey', quantity: 1 }
    expect(valideerMeubelConfig({ ...basisCfg, ladeBreedtes: [900, 1000] })).toBeNull()
    expect(valideerMeubelConfig({ ...basisCfg, ladeBreedtes: [1000, 1000] })).toContain('samen 1900')
  })

  test('hoogte: keuze zonder prijsverschil, alleen bij modellen die het hebben', () => {
    expect(getMeubelHoogte(fullFrame, 400)).toBe(400)
    expect(getMeubelHoogte(fullFrame, 380)).toBe(300)
    expect(getMeubelHoogte(getMeubelModel('facet')!, 400)).toBe(300)
    const cfg = { modelId: 'full-frame', lengte: 1000, lades: 1, houtkleur: 'old-grey', ladeBreedtes: null, quantity: 1 }
    expect(valideerMeubelConfig({ ...cfg, hoogte: 350 })).toBeNull()
    expect(valideerMeubelConfig({ ...cfg, hoogte: 380 })).toContain('hoogte')
    expect(calcMeubelNettoCents({ ...cfg, hoogte: 400 })).toBe(calcMeubelNettoCents(cfg))
  })

  test('Stripes is niet in White te krijgen', () => {
    expect(getHoutkleuren(getMeubelModel('facet-stripes')!).map((k) => k.id)).not.toContain('white')
    expect(getHoutkleuren(getMeubelModel('facet-stripes-double')!).map((k) => k.id)).not.toContain('white')
    expect(calcMeubelNettoCents({ modelId: 'facet-stripes', lengte: 1000, lades: 1, houtkleur: 'white' })).toBeNull()
    expect(calcMeubelNettoCents({ modelId: 'facet-stripes', lengte: 1000, lades: 1, houtkleur: 'pure' })).toBe(97656 + 4160)
    expect(getHoutkleuren(getMeubelModel('facet')!)).toHaveLength(7)
  })
})

test.describe('Meubel: vaste maten en opties', () => {
  test('Basic Drawer is in elke lengte uit de tabel te bestellen', () => {
    const basic = { modelId: 'basic-drawer', lades: 1, houtkleur: 'old-grey' }
    expect(calcMeubelNettoCents({ ...basic, lengte: 750 })).toBe(103896)
    expect(calcMeubelNettoCents({ ...basic, lades: 2, lengte: 1650 })).toBe(148616)
    expect(getMeubelModel('basic-drawer')!.vasteLengtes).toBeUndefined()
  })

  test('uitsparing telt mee in netto en in de bruto opbouw; logo kost niets', () => {
    const cfg = { modelId: 'facet', lengte: 1000, lades: 1, houtkleur: 'old-grey', uitsparingen: 2 }
    expect(calcMeubelNettoCents(cfg)).toBe(98176 + 2080)
    const opbouw = getMeubelPrijsOpbouw(cfg, 2)!
    expect(opbouw.regels.map((r) => r.label)).toEqual(['Facet 1000 mm · 1 lade', 'Uitsparing · 2×'])
    expect(opbouw.totaal).toBe((98176 + 2080) * 2)
  })

  test('optietekst', () => {
    expect(meubelOptiesTekst({})).toBe('Geen')
    expect(meubelOptiesTekst({ logo: true })).toBe('Met logo')
    expect(meubelOptiesTekst({ logo: true, uitsparingen: 1 })).toBe('Met logo · 1 uitsparing (volgens maattekening)')
    expect(meubelOptiesTekst({ uitsparingen: 3 })).toBe('3 uitsparingen (volgens maattekening)')
  })

  test('aantal uitsparingen begrensd, ook op aanvraag', () => {
    const cfg = { modelId: 'facet', lengte: 3000, lades: 3, houtkleur: 'old-grey', ladeBreedtes: null, quantity: 1, opAanvraag: true }
    expect(valideerMeubelConfig({ ...cfg, uitsparingen: 4 })).toBeNull()
    expect(valideerMeubelConfig({ ...cfg, uitsparingen: 11 })).toContain('Uitsparingen')
  })
})

test.describe('Regal-modellen: regaalkast', () => {
  const regal = { modelId: 'facet-regal', houtkleur: 'old-grey', regaalBreedte: 400, regaalZijde: 'rechts' as const }
  const facetRegal = getMeubelModel('facet-regal')!
  const ffRegal = getMeubelModel('full-frame-regal')!

  // Prijslijst: totale lengte in mm, lades, euro
  const FACET_REGAL: [number, number, number][] = [
    [800, 1, 1558.96], [1290, 1, 1558.96], [1500, 1, 1673.36], [1500, 2, 1870.96],
    [1900, 2, 1922.96], [2100, 2, 2078.96], [2100, 3, 2130.96], [2600, 2, 2110.16], [2600, 3, 2318.16],
  ]
  for (const [lengte, lades, euro] of FACET_REGAL) {
    test(`facet-regal ${lengte} mm, ${lades} lade(s) = € ${euro}`, () => {
      expect(calcMeubelNettoCents({ ...regal, lengte, lades })).toBe(Math.round(euro * 100))
    })
  }

  test('full-frame-regal tabelprijzen', () => {
    const ff = { modelId: 'full-frame-regal', houtkleur: 'old-grey', regaalBreedte: 400, regaalZijde: 'links' as const }
    expect(calcMeubelNettoCents({ ...ff, lengte: 1200, lades: 1 })).toBe(163176)
    expect(calcMeubelNettoCents({ ...ff, lengte: 1750, lades: 2 })).toBe(195416)
    expect(calcMeubelNettoCents({ ...ff, lengte: 2250, lades: 2 })).toBe(197496)
    expect(calcMeubelNettoCents({ ...ff, lengte: 2700, lades: 2 })).toBe(213096)
  })

  test('lades verdelen de lengte min de regaalkast (en min de rand)', () => {
    expect(ladeRuimte(facetRegal, 2000, 400)).toBe(1600)
    expect(ladeRuimte(ffRegal, 2000, 400)).toBe(1500)
    // model zonder regaalkast negeert de breedte
    expect(ladeRuimte(getMeubelModel('facet')!, 2000, 400)).toBe(2000)
  })

  test('ladekeuze hangt af van de breedte van de regaalkast', () => {
    // 1500 mm: met een regaal van 300 blijft 1200 over (1 lade kan), met 500 blijft 1000 over
    expect(getLadeOpties(facetRegal, 1500, 300)).toEqual([1, 2])
    // 2 lades van 350 mm vraagt 700 mm: bij 1500 − 500 = 1000 kan dat, bij 1300 − 500 = 800 ook
    expect(getLadeOpties(facetRegal, 1300, 500)).toEqual([1, 2])
    // 1300 mm met regaal 300: 1000 mm voor 1 lade, prijslijst kent bij 1300 ook 2 lades
    expect(getLadeOpties(facetRegal, 1290, 300)).toEqual([1])
  })

  test('breedte en kant zijn verplicht en begrensd', () => {
    const cfg = { ...regal, lengte: 1500, lades: 2, ladeBreedtes: null, quantity: 1 }
    expect(valideerMeubelConfig(cfg)).toBeNull()
    expect(valideerMeubelConfig({ ...cfg, regaalBreedte: 299 })).toContain('regaalkast')
    expect(valideerMeubelConfig({ ...cfg, regaalBreedte: 501 })).toContain('regaalkast')
    expect(valideerMeubelConfig({ ...cfg, regaalBreedte: undefined })).toContain('regaalkast')
    expect(valideerMeubelConfig({ ...cfg, regaalZijde: undefined })).toContain('kant')
    // eigen indeling telt op tot lengte min regaalkast
    expect(valideerMeubelConfig({ ...cfg, ladeBreedtes: [500, 600] })).toBeNull()
    expect(valideerMeubelConfig({ ...cfg, ladeBreedtes: [700, 800] })).toContain('samen 1100')
  })

  test('standaardbreedte bij ontbrekende of ongeldige waarde', () => {
    expect(getRegaalBreedte(facetRegal, null)).toBe(400)
    expect(getRegaalBreedte(facetRegal, 350)).toBe(350)
    expect(getRegaalBreedte(facetRegal, 900)).toBe(400)
    expect(getRegaalBreedte(getMeubelModel('facet')!, 350)).toBe(0)
  })
})

test.describe('Drawer Box Regal: twee kasten met een regaalkast ertussen', () => {
  const model = getMeubelModel('drawer-box-regal')!
  const cfg = (links: number, rechts: number, regaal = 400) => ({
    modelId: 'drawer-box-regal', lengte: links + rechts + regaal, lades: 2, ladeBreedtes: [links, rechts],
    houtkleur: 'old-grey', regaalBreedte: regaal, regaalZijde: 'midden' as const, quantity: 1,
  })

  test('reeksen uit de prijslijst in mm', () => {
    expect(getDuoReeksen(model)).toEqual([{ min: 560, max: 800, prijs: 257400 }, { min: 801, max: 1000, prijs: 285896 }])
    expect(lengteBereik(model)).toEqual({ min: 1420, max: 2500 })
  })

  test('prijs volgt de reeks van beide kasten', () => {
    expect(calcMeubelNettoCents(cfg(560, 800))).toBe(257400)
    expect(calcMeubelNettoCents(cfg(700, 750))).toBe(257400)
    expect(calcMeubelNettoCents(cfg(801, 1000))).toBe(285896)
    expect(calcMeubelNettoCents({ ...cfg(700, 700), houtkleur: 'white', uitsparingen: 1 })).toBe(257400 + 4160 + 1040)
  })

  test('kasten in verschillende reeksen of buiten bereik kunnen niet', () => {
    expect(getDuoPrijs(model, [750, 950])).toBeNull()
    expect(getDuoPrijs(model, [559, 700])).toBeNull()
    expect(getDuoPrijs(model, [900, 1001])).toBeNull()
    expect(calcMeubelNettoCents(cfg(750, 950))).toBeNull()
    expect(valideerMeubelConfig(cfg(750, 950))).toContain('dezelfde reeks')
  })

  test('validatie: lengte is de som, regaalkast 300 tot 500 mm, geen op aanvraag', () => {
    expect(valideerMeubelConfig(cfg(700, 780))).toBeNull()
    expect(valideerMeubelConfig({ ...cfg(700, 780), lengte: 2000 })).toContain('lengte')
    expect(valideerMeubelConfig(cfg(700, 780, 299))).toContain('regaalkast')
    expect(valideerMeubelConfig({ ...cfg(700, 780), opAanvraag: true })).toContain('bestaat niet')
  })

  test('de regaalbreedte verandert de prijs niet', () => {
    expect(calcMeubelNettoCents(cfg(700, 700, 300))).toBe(calcMeubelNettoCents(cfg(700, 700, 500)))
  })
})

// Solid Surface: per model een paar cellen uit de prijslijst. Rij: [model, lengte in mm, lades, euro].
const SOLID: [string, number, number, number][] = [
  ['solid-facet', 700, 1, 1860.56], ['solid-facet', 1200, 2, 2172.56], ['solid-facet', 1390, 2, 2442.96], ['solid-facet', 1600, 3, 2973.36],
  ['solid-facet', 1800, 2, 2838.16], ['solid-facet', 2400, 3, 3347.76], ['solid-facet', 2600, 3, 3607.76],
  ['solid-facet-double', 1200, 1, 2942.16], ['solid-facet-double', 1390, 2, 3222.96], ['solid-facet-double', 1800, 2, 3628.56], ['solid-facet-double', 2400, 3, 4574.96], ['solid-facet-double', 2600, 3, 4678.96],
  ['solid-facet-stripes', 700, 1, 1870.96], ['solid-facet-stripes', 1200, 2, 2297.36], ['solid-facet-stripes', 1900, 3, 3274.96], ['solid-facet-stripes', 2100, 2, 3254.16], ['solid-facet-stripes', 2550, 3, 3690.96],
  ['solid-facet-stripes-double', 1200, 1, 2515.76], ['solid-facet-stripes-double', 1600, 2, 3618.16], ['solid-facet-stripes-double', 1810, 2, 4262.96], ['solid-facet-stripes-double', 2500, 3, 4730.96],
  ['solid-drawer-box', 1200, 1, 2151.76], ['solid-drawer-box', 1390, 2, 2640.56], ['solid-drawer-box', 2100, 3, 3742.96], ['solid-drawer-box', 2400, 2, 3846.96],
  ['solid-drawer-box-double', 1200, 1, 2728.96], ['solid-drawer-box-double', 1600, 2, 3846.96], ['solid-drawer-box-double', 2100, 3, 4855.76], ['solid-drawer-box-double', 2600, 3, 5510.96],
  ['solid-base-drawer-box', 1200, 1, 1959.36], ['solid-base-drawer-box', 1400, 2, 2401.36], ['solid-base-drawer-box', 1410, 2, 2505.36], ['solid-base-drawer-box', 2400, 3, 3711.76], ['solid-base-drawer-box', 2500, 3, 3784.56],
  ['solid-base-drawer-box-double', 1200, 1, 2562.56], ['solid-base-drawer-box-double', 1600, 2, 2994.16], ['solid-base-drawer-box-double', 2100, 3, 4616.56], ['solid-base-drawer-box-double', 2600, 3, 5302.96],
  ['solid-frame', 700, 1, 1479.00], ['solid-frame', 1200, 2, 1999.00], ['solid-frame', 1600, 2, 2299.00], ['solid-frame', 1800, 3, 2479.00], ['solid-frame', 2400, 2, 2899.00], ['solid-frame', 2600, 3, 3119.00],
]

test.describe('Solid Surface: tabelprijzen', () => {
  for (const [modelId, lengte, lades, euro] of SOLID) {
    test(`${modelId} ${lengte} mm, ${lades} lade(s) = € ${euro}`, () => {
      expect(calcMeubelNettoCents({ modelId, lengte, lades, houtkleur: 'old-grey' })).toBe(Math.round(euro * 100))
    })
  }

  test('categorie-indeling', () => {
    expect(MEUBEL_MODELLEN.filter((m) => m.categorie === 'solid-surface')).toHaveLength(9)
    expect(MEUBEL_MODELLEN.filter((m) => m.categorie === 'wastafelmeubels')).toHaveLength(16)
  })

  test('waskom: alleen bij modellen met ingebouwde waskom, vorm en aantal verplicht', () => {
    const cfg = { modelId: 'solid-facet', lengte: 1200, lades: 2, houtkleur: 'old-grey', ladeBreedtes: null, quantity: 1 }
    expect(valideerMeubelConfig(cfg)).toContain('vorm van de waskom')
    expect(valideerMeubelConfig({ ...cfg, waskomVorm: 'ovaal' })).toContain('twee waskommen')
    expect(valideerMeubelConfig({ ...cfg, waskomVorm: 'ovaal', waskomAantal: 3 })).toContain('twee waskommen')
    expect(valideerMeubelConfig({ ...cfg, waskomVorm: 'vierkant', waskomAantal: 2 })).toBeNull()
    // Solid Base heeft geen ingebouwde waskom
    expect(valideerMeubelConfig({ ...cfg, modelId: 'solid-base-drawer-box', lengte: 1400 })).toBeNull()
    expect(getMeubelModel('solid-base-drawer-box')!.waskom).toBeUndefined()
  })

  test('Solid Facet Stripes ook niet in White', () => {
    expect(calcMeubelNettoCents({ modelId: 'solid-facet-stripes', lengte: 1000, lades: 1, houtkleur: 'white' })).toBeNull()
  })
})
