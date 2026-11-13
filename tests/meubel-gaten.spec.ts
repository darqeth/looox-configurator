import { test, expect } from '@playwright/test'
import { getMeubelModel } from '../src/lib/meubel-config'
import { gatenTabel, tekenGaten, tekenKommenIndicatief } from '../src/lib/meubel-tekening'
import {
  maakBlad, snappunten, valideerGaten, klemGat, getKom, komMax, plaatsGat, herzieGaten,
  betaaldeGaten, kommenCompleet, gatenSoort, startGaten, type GatenContext,
} from '../src/lib/meubel-gaten'

const facet = getMeubelModel('facet')!, solid = getMeubelModel('solid-facet')!
const hout = (lengte: number, breedtes: number[]): GatenContext =>
  ({ soort: 'hout', blad: maakBlad({ model: facet, lengte, diepte: facet.diepte, breedtes }), kom: null, komAantal: 0 })
const blad = (lengte: number, breedtes: number[]) => maakBlad({ model: solid, lengte, diepte: 460, breedtes })

test('snappunten: hart van elke lade', () => {
  expect(snappunten(hout(1800, [600, 600, 600]).blad).map((s) => s.x)).toEqual([300, 900, 1500])
})

test('snappunten: geen punt boven de regaalkast, wel rekening met de rand', () => {
  const regal = getMeubelModel('full-frame-regal')!
  const b = maakBlad({ model: regal, lengte: 1500, diepte: regal.diepte, breedtes: [500, 500], regaal: { breedte: 400, zijde: 'links' } })
  expect(snappunten(b).map((s) => s.x)).toEqual([(regal.rand ?? 0) + 400 + 250, (regal.rand ?? 0) + 400 + 750])
})

test('blad zonder lades: één snappunt, vanaf 1200 mm drie', () => {
  const plank = getMeubelModel('base-shelf-solo')!
  expect(snappunten(maakBlad({ model: plank, lengte: 900, diepte: 400, breedtes: [] })).map((s) => s.x)).toEqual([450])
  expect(snappunten(maakBlad({ model: plank, lengte: 1200, diepte: 400, breedtes: [] })).map((s) => s.x)).toEqual([200, 600, 1000])
})

test('sifon te dicht op de achterrand wordt geweigerd', () => {
  expect(valideerGaten([{ soort: 'sifon', vak: 0, y: 40, d: 45 }], hout(1200, [600, 600]))).not.toBeNull()
})

test('rand precies 30 mm is goed, 29 niet', () => {
  expect(valideerGaten([{ soort: 'kraan', x: 50, y: 50, d: 40 }], hout(1200, [600, 600]))).toBeNull()
  expect(valideerGaten([{ soort: 'kraan', x: 49, y: 50, d: 40 }], hout(1200, [600, 600]))).not.toBeNull()
})

test('twee gaten dichter dan 30 mm op elkaar', () => {
  const c = hout(1200, [600, 600])
  expect(valideerGaten([{ soort: 'kraan', x: 300, y: 100, d: 35 }, { soort: 'kraan', x: 360, y: 100, d: 35 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kraan', x: 300, y: 100, d: 35 }, { soort: 'kraan', x: 365, y: 100, d: 35 }], c)).toBeNull()
})

test('één sifongat per lade, en alleen boven een bestaande lade', () => {
  const c = hout(1200, [600, 600])
  expect(valideerGaten([{ soort: 'sifon', vak: 0, y: 200, d: 45 }, { soort: 'sifon', vak: 0, y: 300, d: 45 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'sifon', vak: 2, y: 200, d: 45 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kom', vak: 0 }], c)).not.toBeNull()
})

test('diametergrenzen en het maximum van tien', () => {
  const c = hout(2400, [600, 600, 600, 600])
  expect(valideerGaten([{ soort: 'sifon', vak: 0, y: 200, d: 101 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kraan', x: 300, y: 200, d: 19 }], c)).not.toBeNull()
  const elf = Array.from({ length: 11 }, (_, i) => ({ soort: 'kraan' as const, x: 100 + i * 200, y: 100, d: 35 }))
  expect(valideerGaten(elf, c)).toContain('maximaal 10')
  expect(valideerGaten(elf.slice(0, 10), c)).toBeNull()
})

test('klemGat houdt diameter en plaats binnen de grenzen', () => {
  const c = hout(1200, [600, 600])
  expect(klemGat({ soort: 'kraan', x: -50, y: 9999, d: 500 }, c)).toEqual({ soort: 'kraan', x: 60, y: facet.diepte - 60, d: 60 })
  expect(klemGat({ soort: 'kraan', x: NaN, y: NaN, d: NaN }, c)).toEqual({ soort: 'kraan', x: 600, y: Math.round(facet.diepte / 2), d: 35 })
  expect(klemGat({ soort: 'sifon', vak: 0, y: 0, d: 45.4 }, c)).toEqual({ soort: 'sifon', vak: 0, y: 53, d: 45 })
  // Wat klemGat teruggeeft is altijd te maken
  expect(valideerGaten([klemGat({ soort: 'sifon', vak: 1, y: 9999, d: 100 }, c)], c)).toBeNull()
})

test('kom 500 past boven een lade van 650, niet van 640', () => {
  const kom = getKom('vierkant', 500)
  expect(komMax(blad(1300, [650, 650]), kom)).toBe(2)
  expect(komMax(blad(1280, [640, 640]), kom)).toBe(0)
  expect(komMax(blad(1500, [500, 500, 500]), kom)).toBe(0)
})

test('kom 850 vraagt een lade van 1000; ovaal bestaat in één maat', () => {
  expect(komMax(blad(1000, [1000]), getKom('vierkant', 850))).toBe(1)
  expect(komMax(blad(999, [999]), getKom('vierkant', 850))).toBe(0)
  expect(getKom('ovaal', 850)).toEqual(getKom('ovaal'))
  expect(getKom('vierkant').b).toBe(500)
})

test('Solid Washbasin Solo: kom in het midden, twee kommen op een kwart en driekwart', () => {
  const solo = getMeubelModel('solid-washbasin-solo')!, kom = getKom('vierkant', 500)
  const een = maakBlad({ model: solo, lengte: 800, diepte: 460, breedtes: [], komAantal: 1 })
  expect(komMax(een, kom)).toBe(1)
  expect(snappunten(een, kom).map((s) => s.x)).toEqual([400])
  const twee = maakBlad({ model: solo, lengte: 1400, diepte: 460, breedtes: [], komAantal: 2 })
  expect(komMax(twee, kom)).toBe(2)
  expect(snappunten(twee, kom).map((s) => s.x)).toEqual([350, 1050])
  expect(komMax(maakBlad({ model: solo, lengte: 1200, diepte: 460, breedtes: [], komAantal: 2 }), kom)).toBe(1)
})

test('kraangat bij kom: vaste Y, X tot 50 mm voorbij de kom', () => {
  const c: GatenContext = { soort: 'solid', blad: blad(800, [800]), kom: getKom('vierkant', 500), komAantal: 1 }
  expect(plaatsGat({ soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, c)).toEqual({ x: 400, y: 45.5, d: 34 })
  expect(plaatsGat({ soort: 'kom', vak: 0 }, c)).toEqual({ x: 400, y: 240, d: 0, b: 500, h: 298 })
  expect(klemGat({ soort: 'kraan-kom', vak: 0, dx: 900, d: 80 }, c)).toEqual({ soort: 'kraan-kom', vak: 0, dx: 300, d: 40 })
  expect(klemGat({ soort: 'kraan-kom', vak: 0, dx: -900, d: 5 }, c)).toEqual({ soort: 'kraan-kom', vak: 0, dx: -300, d: 20 })
  expect(valideerGaten([{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }], c)).toBeNull()
  expect(valideerGaten([{ soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 301, d: 34 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kom', vak: 0 }, { soort: 'sifon', vak: 0, y: 200, d: 45 }], c)).not.toBeNull()
})

test('meer kommen dan gekozen, of een kom die niet past', () => {
  const c: GatenContext = { soort: 'solid', blad: blad(1400, [700, 700]), kom: getKom('vierkant', 500), komAantal: 1 }
  expect(valideerGaten([{ soort: 'kom', vak: 0 }, { soort: 'kom', vak: 1 }], c)).not.toBeNull()
  expect(valideerGaten([{ soort: 'kom', vak: 0 }], { ...c, kom: getKom('vierkant', 850) })).not.toBeNull()
})

test('herzieGaten: gat in vervallen vak verdwijnt, de rest blijft', () => {
  const r = herzieGaten([{ soort: 'sifon', vak: 0, y: 240, d: 45 }, { soort: 'sifon', vak: 2, y: 240, d: 45 }], hout(1200, [600, 600]))
  expect(r).toEqual({ gaten: [{ soort: 'sifon', vak: 0, y: 240, d: 45 }], vervallen: 1 })
})

test('herzieGaten: korter blad haalt het kraangat binnen het blad, kom weg haalt ook zijn kraangat weg', () => {
  const kort = herzieGaten([{ soort: 'kraan', x: 1500, y: 80, d: 35 }], hout(1200, [600, 600]))
  expect(kort.vervallen).toBe(0)
  expect(valideerGaten(kort.gaten, hout(1200, [600, 600]))).toBeNull()
  const smal: GatenContext = { soort: 'solid', blad: blad(1200, [600, 600]), kom: getKom('vierkant', 500), komAantal: 1 }
  expect(herzieGaten([{ soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, { soort: 'kom', vak: 0 }], smal)).toEqual({ gaten: [], vervallen: 2 })
  const ok: GatenContext = { ...smal, blad: blad(1400, [700, 700]) }
  expect(herzieGaten([{ soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, { soort: 'kom', vak: 0 }], ok).vervallen).toBe(0)
})

test('kom telt niet als betaalde uitsparing', () => {
  expect(betaaldeGaten([{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, { soort: 'sifon', vak: 0, y: 200, d: 45 }])).toBe(2)
})

test('kommenCompleet: 2 gekozen, 1 geplaatst is niet compleet', () => {
  const c: GatenContext = { soort: 'solid', blad: blad(1400, [700, 700]), kom: getKom('vierkant', 500), komAantal: 2 }
  expect(kommenCompleet([{ soort: 'kom', vak: 0 }], c)).toBe(false)
  expect(kommenCompleet([{ soort: 'kom', vak: 0 }, { soort: 'kom', vak: 1 }], c)).toBe(true)
  expect(kommenCompleet([], hout(1200, [600, 600]))).toBe(true)
})

test('startGaten: valt er niets te kiezen, dan staat de kom er al', () => {
  const kom = getKom('vierkant', 500)
  expect(startGaten({ soort: 'solid', blad: blad(800, [800]), kom, komAantal: 1 })).toEqual([{ soort: 'kom', vak: 0 }])
  expect(startGaten({ soort: 'solid', blad: blad(1400, [700, 700]), kom, komAantal: 2 })).toEqual([{ soort: 'kom', vak: 0 }, { soort: 'kom', vak: 1 }])
  expect(startGaten({ soort: 'solid', blad: blad(1400, [700, 700]), kom, komAantal: 1 })).toEqual([])
  expect(startGaten(hout(1200, [600, 600]))).toEqual([])
})

test('gatenSoort per model', () => {
  for (const id of ['facet-deco', 'block', 'niche-shelf', 'wall-shelf-free', 'cover', 'mirror-cabinet']) expect(gatenSoort(getMeubelModel(id)!), id).toBeNull()
  for (const id of ['facet', 'solid-base-drawer-box', 'mini-base-shelf', 'base-shelf-solo', 'base-shelf-deco', 'basic-cube-mini', 'cabinet-facet-mini']) expect(gatenSoort(getMeubelModel(id)!), id).toBe('hout')
  expect(gatenSoort(solid)).toBe('solid')
  expect(gatenSoort(getMeubelModel('solid-washbasin-solo')!)).toBe('solid')
})

test('gatenTabel: plaats naar het hart in mm, waskommen eerst', () => {
  expect(gatenTabel([{ soort: 'sifon', vak: 1, y: 240, d: 45 }], hout(1200, [600, 600]))).toEqual([{ nr: 1, soort: 'Sifongat', x: '900', y: '240', maat: 'Ø 45' }])
  const c: GatenContext = { soort: 'solid', blad: blad(1400, [700, 700]), kom: getKom('vierkant', 500), komAantal: 2 }
  expect(gatenTabel([{ soort: 'kraan-kom', vak: 1, dx: -100, d: 34 }, { soort: 'kom', vak: 1 }, { soort: 'kom', vak: 0 }], c)).toEqual([
    { nr: 1, soort: 'Waskom rechthoekig 500', x: '350', y: '240', maat: '500 × 298' },
    { nr: 2, soort: 'Waskom rechthoekig 500', x: '1050', y: '240', maat: '500 × 298' },
    { nr: 3, soort: 'Kraangat', x: '950', y: '45,5', maat: 'Ø 34' },
  ])
  expect(gatenTabel([{ soort: 'kom', vak: 0 }], { ...c, kom: getKom('ovaal') })[0].soort).toBe('Waskom ovaal')
})

test('tekenGaten onthoudt welk gat het is, ook na sorteren', () => {
  const g = tekenGaten([{ soort: 'kraan', x: 900, y: 80, d: 35 }, { soort: 'sifon', vak: 0, y: 240, d: 45 }], hout(1200, [600, 600]))
  expect(g.map((t) => [t.nr, t.index, t.x])).toEqual([[1, 1, 300], [2, 0, 900]])
})

test('tekenKommenIndicatief verdeelt de waskommen over de lengte', () => {
  const c: GatenContext = { soort: 'solid', blad: blad(1200, [600, 600]), kom: getKom('vierkant', 500), komAantal: 2 }
  expect(tekenKommenIndicatief(c).map((k) => [k.x, k.b])).toEqual([[300, 420], [900, 420]])
  expect(tekenKommenIndicatief({ ...c, komAantal: 1 }).map((k) => [k.x, k.b])).toEqual([[600, 500]])
  expect(tekenKommenIndicatief(hout(1200, [600, 600]))).toEqual([])
})
