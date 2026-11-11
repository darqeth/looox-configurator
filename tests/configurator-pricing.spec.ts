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

// ─── Sol restmaten ────────────────────────────────────────────────────────────
test.describe('computeSolRestmaten', () => {
  test('standaardgeval ⌀80, meubel 35, uitsteek 15', async () => {
    const { computeSolRestmaten } = await import('../src/lib/configurator-config')
    const r = computeSolRestmaten(80, 35, 15)
    expect(r.bovendeelHoogte).toBe(30)   // 80 - 15 - 35
    expect(r.meubelVlakBreedte).toBe(77) // 2*sqrt(40² - 10²) = 77.46
    expect(r.valid).toBe(true)
  })

  test('koorde door het centrum = volledige diameter', async () => {
    const { computeSolRestmaten } = await import('../src/lib/configurator-config')
    // meubelTop op het centrum (r=50): onderkant+meubel = 50
    const r = computeSolRestmaten(100, 40, 10)
    expect(r.meubelVlakBreedte).toBe(100)
    expect(r.bovendeelHoogte).toBe(50)
  })

  test('meubel hoger dan de spiegel → ongeldig', async () => {
    const { computeSolRestmaten } = await import('../src/lib/configurator-config')
    const r = computeSolRestmaten(60, 70, 10)
    expect(r.valid).toBe(false)
  })
})

test.describe('computeLunaRestmaten', () => {
  test('muurcut binnen de koorde begrenst het meubelvlak', async () => {
    const { computeLunaRestmaten } = await import('../src/lib/configurator-config')
    // d=90, meubel 35, uitsteek 15, afstand 20: K=44.72 -> 44.72+45-20 = 69.7
    const r = computeLunaRestmaten(90, 35, 15, 20)
    expect(r.bovendeelHoogte).toBe(40)
    expect(r.meubelVlakBreedte).toBe(70)
    expect(r.valid).toBe(true)
  })

  test('muurcut buiten de koorde -> volledige koorde zoals Sol', async () => {
    const { computeLunaRestmaten, computeSolRestmaten } = await import('../src/lib/configurator-config')
    const luna = computeLunaRestmaten(80, 35, 15, 1)
    const sol = computeSolRestmaten(80, 35, 15)
    expect(luna.meubelVlakBreedte).toBe(sol.meubelVlakBreedte)
  })

  test('meubel hoger dan spiegel -> ongeldig', async () => {
    const { computeLunaRestmaten } = await import('../src/lib/configurator-config')
    expect(computeLunaRestmaten(60, 70, 10, 20).valid).toBe(false)
  })
})

test.describe('Organic maatnotatie (sprint 2026-11, S1)', () => {
  test('bekende maat toont breedte en hoogte', async () => {
    const { formatOrganicSize } = await import('../src/lib/configurator-config')
    expect(formatOrganicSize('120x100')).toBe('B 120 × H 100 cm')
    expect(formatOrganicSize('60x40')).toBe('B 60 × H 40 cm')
  })

  test('legacy key krijgt dezelfde notatie', async () => {
    const { formatOrganicSize } = await import('../src/lib/configurator-config')
    expect(formatOrganicSize('100x70')).toBe('B 100 × H 70 cm')
  })

  test('lege of onbekende key geeft geen kapotte tekst', async () => {
    const { formatOrganicSize } = await import('../src/lib/configurator-config')
    expect(formatOrganicSize(null)).toBe('')
    expect(formatOrganicSize('XL')).toBe('XL')
  })
})

test.describe('Kraangat boring (sprint 2026-11, S3)', () => {
  const basis = { organicSizeKey: null, glasKleur: 'helder' as const, ...baseLight }
  const meerprijs = (state: Omit<Parameters<typeof calcTotalPrice>[0], 'selectedOptions' | 'optionSubChoices'>, gaten: string) =>
    calcTotalPrice({ ...state, selectedOptions: ['kraangat'], optionSubChoices: { kraangat: gaten, 'kraangat-diameter': '35' } })
    - calcTotalPrice({ ...state, selectedOptions: [] })

  test('rechthoek t/m 200 cm = €12 per gat', () => {
    expect(meerprijs({ ...basis, shape: 'rechthoek', width: 200, height: 80, diameter: null }, '1')).toBe(12)
    expect(meerprijs({ ...basis, shape: 'rechthoek', width: 100, height: 70, diameter: null }, '3')).toBe(36)
    expect(meerprijs({ ...basis, shape: 'rounded-rect', width: 120, height: 80, diameter: null }, '1')).toBe(12)
  })

  test('langste zijde boven 200 cm = €24 per gat, ook als dat de hoogte is', () => {
    expect(meerprijs({ ...basis, shape: 'rechthoek', width: 201, height: 80, diameter: null }, '1')).toBe(24)
    expect(meerprijs({ ...basis, shape: 'rechthoek', width: 80, height: 210, diameter: null }, '1')).toBe(24)
  })

  test('rond: t/m Ø100 = €12, daarboven €24', () => {
    expect(meerprijs({ ...basis, shape: 'rond', width: 0, height: 0, diameter: 100 }, '1')).toBe(12)
    expect(meerprijs({ ...basis, shape: 'rond', width: 0, height: 0, diameter: 120 }, '2')).toBe(48)
  })

  test('bijzondere vormen altijd €24 per gat', () => {
    expect(meerprijs({ ...basis, shape: 'organic', width: 80, height: 60, diameter: null, organicSizeKey: '100x80' }, '1')).toBe(24)
    for (const shape of ['ovaal', 'arc'] as const) {
      expect(meerprijs({ ...basis, shape, width: 100, height: 60, diameter: null }, '1')).toBe(24)
    }
    expect(meerprijs({ ...basis, shape: 'elips', width: 100, height: 50, diameter: null }, '1')).toBe(24)
    expect(meerprijs({ ...basis, shape: 'sol', width: 0, height: 0, diameter: 80 }, '1')).toBe(24)
    expect(meerprijs({ ...basis, shape: 'luna', width: 0, height: 0, diameter: 90 }, '2')).toBe(48)
  })

  test('aantal wordt begrensd op 1 t/m 3 en zonder optie kost het niets', async () => {
    const { calcKraangatPrice, formatKraangat, isValidKraangatDiameter } = await import('../src/lib/configurator-config')
    const state = { shape: 'rechthoek' as const, width: 100, height: 70, diameter: null }
    expect(calcKraangatPrice({ ...state, selectedOptions: ['kraangat'], optionSubChoices: { kraangat: '9' } })).toBe(36)
    expect(calcKraangatPrice({ ...state, selectedOptions: ['kraangat'], optionSubChoices: {} })).toBe(12)
    expect(calcKraangatPrice({ ...state, selectedOptions: [], optionSubChoices: { kraangat: '2' } })).toBe(0)
    expect(formatKraangat({ kraangat: '2', 'kraangat-diameter': '35' })).toBe('Kraangat boring (2 gaten, Ø 35 mm)')
    expect(formatKraangat({ kraangat: '1' })).toBe('Kraangat boring (1 gat)')
    expect(isValidKraangatDiameter('35')).toBe(true)
    expect(isValidKraangatDiameter('5')).toBe(false)
    expect(isValidKraangatDiameter('abc')).toBe(false)
  })
})

test.describe('Organic toeslagen op de echte maat (sprint 2026-11, S5)', () => {
  // De wizard stuurt bij organic de rechthoek-invoer mee (standaard 80 × 60 of
  // een eerder ingevulde maat). Die mag de prijs niet beïnvloeden.
  const organic = (key: string, over: Partial<Parameters<typeof calcTotalPrice>[0]> = {}) => calcTotalPrice({
    shape: 'organic', width: 80, height: 60, diameter: null, organicSizeKey: key,
    glasKleur: 'helder', selectedOptions: [], ...baseLight, ...over,
  })

  const verwacht: Record<string, { smoke: number; verwarming: number }> = {
    '60x40':   { smoke: 15, verwarming: 76 },
    '80x60':   { smoke: 29, verwarming: 76 },
    '100x80':  { smoke: 49, verwarming: 76 },
    '120x100': { smoke: 73, verwarming: 304 },
  }

  for (const [key, v] of Object.entries(verwacht)) {
    test(`${key}: smoke +€${v.smoke}, verwarming +€${v.verwarming}`, () => {
      expect(organic(key, { glasKleur: 'smoke-zwart' }) - organic(key)).toBe(v.smoke)
      expect(organic(key, { selectedOptions: ['verwarming'] }) - organic(key)).toBe(v.verwarming)
    })
  }

  test('eerder ingevulde rechthoekmaat lekt niet door in de organic-prijs', () => {
    const metRestmaat = organic('120x100', { width: 250, height: 150, glasKleur: 'smoke-brons', selectedOptions: ['verwarming'] })
    const standaard = organic('120x100', { glasKleur: 'smoke-brons', selectedOptions: ['verwarming'] })
    expect(metRestmaat).toBe(standaard)
  })

  test('helder glas zonder opties blijft de basisprijs per maat', async () => {
    const { ORGANIC_BASE_PRICES } = await import('../src/lib/configurator-config')
    for (const key of Object.keys(verwacht)) expect(organic(key)).toBe(ORGANIC_BASE_PRICES[key])
  })
})
