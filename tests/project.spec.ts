import { test, expect } from '@playwright/test'
import { spiegelKenmerken, projectRegel, projectTotaal, projectKop, isUuid } from '../src/lib/project'

const basis = { id: 'a', name: 'Badkamer De Vries', status: 'saved', width: 200, height: 60 }
const meubelOpts = (extra = {}, top = {}) => ({
  shape: 'meubel', quantity: 2, reference: 'REF-1', attachmentUrl: 'https://example.com/storage/v1/object/public/attachments/tekening.png',
  meubel: { eenheid: 'mm', modelId: 'facet-double', lengte: 2000, lades: 3, ladeBreedtes: null, houtkleur: 'white', factor: 2, ...extra },
  ...top,
})

test.describe('Project: regels', () => {
  test('meubel: bruto per stuk maal aantal', () => {
    const r = projectRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts() })
    expect(r).toMatchObject({ soort: 'meubel', titel: 'Facet Double', quantity: 2, stukCents: 580112, totaalCents: 1160224, netto: false, opAanvraag: false })
    expect(r.omschrijving).toBe('2000 mm · 3 × 2 lades · White')
  })

  test('meubel op aanvraag telt niet mee', () => {
    const r = projectRegel({ ...basis, total_price: 0, selected_options: meubelOpts({ modelId: 'facet', lengte: 3300, lades: 4, opAanvraag: true }) })
    expect(r).toMatchObject({ opAanvraag: true, stukCents: 0, totaalCents: 0 })
  })

  test('maatwerk spiegel: total_price is per stuk', () => {
    const r = projectRegel({ ...basis, width: 120, height: 80, total_price: 450, selected_options: { shape: 'rechthoek', quantity: 3 } })
    expect(r).toMatchObject({ soort: 'maatwerk', titel: 'Spiegel rechthoek', omschrijving: 'B 120 × H 80 cm', quantity: 3, stukCents: 45000, totaalCents: 135000, netto: false })
  })

  test('spiegel op aanvraag heeft geen prijs', () => {
    const r = projectRegel({ ...basis, total_price: 999, selected_options: { shape: 'op-aanvraag', quantity: 1 } })
    expect(r).toMatchObject({ opAanvraag: true, totaalCents: 0 })
  })

  test('projectspiegel: total_price is al het netto totaal', () => {
    const r = projectRegel({ ...basis, width: 100, height: 70, total_price: '1250.50', selected_options: { shape: 'projectspiegel', quantity: 10 } })
    expect(r).toMatchObject({ soort: 'projectspiegel', quantity: 10, stukCents: 12505, totaalCents: 125050, netto: true })
  })

  test('bestelde regel is herkenbaar', () => {
    expect(projectRegel({ ...basis, status: 'ordered', total_price: 100, selected_options: { shape: 'rond', diameter: 80 } }).besteld).toBe(true)
  })
})

test.describe('Project: totaal en kop', () => {
  test('totaal telt regels met prijs en meldt regels op aanvraag', () => {
    const regels = [
      projectRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts() }),
      projectRegel({ ...basis, id: 'b', total_price: 450, selected_options: { shape: 'rechthoek', quantity: 1 } }),
      projectRegel({ ...basis, id: 'c', total_price: 0, selected_options: meubelOpts({ modelId: 'facet', lengte: 3300, lades: 4, opAanvraag: true }, { quantity: 1 }) }),
    ]
    expect(projectTotaal(regels)).toEqual({ totaalCents: 1160224 + 45000, opAanvraag: 1, stuks: 4 })
  })

  test('naam en referentie komen van de eerste regel', () => {
    expect(projectKop([{ ...basis, total_price: 1, selected_options: meubelOpts() }])).toEqual({ naam: 'Badkamer De Vries', referentie: 'REF-1', klant: null })
    expect(projectKop([])).toEqual({ naam: 'Naamloos project', referentie: '', klant: null })
  })

  test('isUuid', () => {
    expect(isUuid('b7657850-5092-42fd-bb29-5d207ba42ca2')).toBe(true)
    expect(isUuid('nieuw')).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})

import { berekenProjectOrderRegel, projectOrderTotaalCents } from '../src/lib/project-order'
import { computeOrderTotals } from '../src/lib/order-pricing'

test.describe('Project: prijs bij bestellen', () => {
  test('meubel: netto tabelprijs, geen dealerkorting', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts() }, 50)
    // Facet Double 2000 mm, 3 × 2 lades (2858,96) + White (41,60) = 2900,56 netto, 2 stuks
    expect(r).toMatchObject({ quantity: 2, unitPrice: 2900.56, totalPrice: 5801.12, korting: 0, fout: null })
  })

  test('meubel op aanvraag: geen prijs', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: 0, selected_options: meubelOpts({ modelId: 'facet', lengte: 3300, lades: 4, opAanvraag: true }) }, 50)
    expect(r).toMatchObject({ unitPrice: 0, totalPrice: 0, fout: null })
    expect(r.regel.opAanvraag).toBe(true)
  })

  test('meubel dat niet meer in de prijslijst staat geeft een fout', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: 100, selected_options: meubelOpts({ lades: 9 }) }, 50)
    expect(r.fout).toContain('prijslijst')
  })

  test('maatwerk spiegel rekent precies als een losse bestelling', () => {
    const r = berekenProjectOrderRegel({ ...basis, width: 120, height: 80, total_price: 450, selected_options: { shape: 'rechthoek', quantity: 3 } }, 50)
    const los = computeOrderTotals({ brutoUnitPrice: 450, dealerKortingPct: 50, quantity: 3 })
    expect(r).toMatchObject({ quantity: 3, unitPrice: 450, totalPrice: los.total, korting: 50, staffelPct: los.staffelPct })
  })

  test('projectspiegel: opgeslagen netto totaal, geen korting', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: '1250.50', selected_options: { shape: 'projectspiegel', quantity: 10 } }, 50)
    expect(r).toMatchObject({ quantity: 10, unitPrice: 125.05, totalPrice: 1250.5, korting: 0 })
  })

  test('totaal telt de regels in centen op', () => {
    const regels = [
      berekenProjectOrderRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts() }, 50),
      berekenProjectOrderRegel({ ...basis, id: 'b', total_price: 450, selected_options: { shape: 'rechthoek', quantity: 1 } }, 50),
    ]
    expect(projectOrderTotaalCents(regels)).toBe(580112 + 22500)
  })
})

test.describe('Project: maattekening verplicht bij meubels', () => {
  test('houten meubel zonder gaten is te bestellen zonder tekening', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts({}, { attachmentUrl: null }) }, 50)
    expect(r.fout).toBeNull()
  })

  test('eigen tekening met uitsparingen maar zonder bestand is niet te bestellen', () => {
    const r = berekenProjectOrderRegel({ ...basis, total_price: '5801.12', selected_options: meubelOpts({ uitsparingen: 2 }, { attachmentUrl: null }) }, 50)
    expect(r.fout).toContain('maattekening')
    expect(r.totalPrice).toBe(0)
  })

  test('spiegels hebben geen maattekening nodig', () => {
    expect(berekenProjectOrderRegel({ ...basis, total_price: 450, selected_options: { shape: 'rechthoek', quantity: 1 } }, 50).fout).toBeNull()
  })
})

test.describe('spiegelKenmerken', () => {
  test('verlichting, verwarming en glaskleur staan in één regel voor het bestelvenster', () => {
    const tekst = spiegelKenmerken({
      shape: 'rond', diameter: 80, glasKleur: 'helder',
      directLight: { position: 'rondom' }, indirectLight: { position: 'geen' },
      lightType: '3000k', lightControl: 'tip-touch', extras: ['verwarming'],
    })
    expect(tekst).toBe('Direct licht: Rondom / 3000K warm wit / Tip-Touch sensor · Spiegelverwarming')
  })

  test('zonder verlichting staat dat er ook', () => {
    expect(spiegelKenmerken({ shape: 'rechthoek', directLight: { position: 'geen' }, indirectLight: { position: 'geen' } })).toBe('Zonder verlichting')
  })
})

import { maatSeintje } from '../src/lib/project'

test.describe('Project: seintje spiegel en meubel', () => {
  const meubel = (lengte: number) => ({ ...basis, id: 'm', width: null, height: null, total_price: 1000, selected_options: meubelOpts({ lengte }) })
  const spiegel = (width: number, shape = 'rechthoek') => ({ ...basis, id: 's', width, height: 70, total_price: 400, selected_options: { shape, quantity: 1 } })

  test('even breed: geen seintje', () => {
    expect(maatSeintje([meubel(1200), spiegel(120)])).toBeNull()
  })
  test('meubel breder gemaakt: seintje', () => {
    expect(maatSeintje([meubel(1300), spiegel(120)])).toBe('De spiegel (120 cm) en het meubel (130 cm) zijn niet even breed. Klopt dat nog?')
  })
  test('spiegel breder dan meubel: seintje', () => {
    expect(maatSeintje([meubel(1200), spiegel(140)])).toContain('is breder dan het meubel')
  })
  test('bewust veel smallere of ronde spiegel: geen seintje', () => {
    expect(maatSeintje([meubel(1600), spiegel(80)])).toBeNull()
    expect(maatSeintje([meubel(1200), spiegel(110, 'rond')])).toBeNull()
  })
  test('zonder meubel of met twee meubels: geen seintje', () => {
    expect(maatSeintje([spiegel(120)])).toBeNull()
    expect(maatSeintje([meubel(1300), { ...meubel(1500), id: 'm2' }, spiegel(120)])).toBeNull()
  })
})

import { leesKlant, offerteNummer } from '../src/lib/project'

test.describe('Project: klant en offertenummer', () => {
  test('klant komt van de eerste regel die er een heeft', () => {
    const klant = { naam: 'Familie Van Dijk', adres: 'Dorpsstraat 1', plaats: '1234 AB Ede' }
    const kop = projectKop([
      { ...basis, id: 'a', total_price: 1, selected_options: { shape: 'rechthoek' } },
      { ...basis, id: 'b', total_price: 1, selected_options: { shape: 'rechthoek', klant } },
    ])
    expect(kop.klant).toEqual(klant)
    expect(projectKop([{ ...basis, total_price: 1, selected_options: {} }]).klant).toBeNull()
  })
  test('lege of ongeldige klant telt niet', () => {
    expect(leesKlant({ klant: { naam: '  ', adres: '', plaats: '' } })).toBeNull()
    expect(leesKlant({ klant: 'x' })).toBeNull()
    expect(leesKlant({ klant: { naam: ' Jansen ', adres: 5 } })).toEqual({ naam: 'Jansen', adres: '', plaats: '' })
  })
  test('offertenummer is vast per project', () => {
    expect(offerteNummer('3f9a2c1e-0000-4000-8000-000000000000', '2026-11-16T10:00:00Z')).toBe('OFF-2026-3F9A2C')
  })
})

import { komControle, komMaat } from '../src/lib/project'

test.describe('Project: past de waskom', () => {
  const gat = (soort: 'sifon' | 'kraan', x: number, y = 240) => ({ soort, x, y, d: soort === 'sifon' ? 45 : 35 })
  const meubel = (gaten: unknown[] = [], lengte = 1400) => ({ ...basis, id: 'm', width: null, height: null, total_price: 1000, selected_options: meubelOpts({ modelId: 'facet', lengte, lades: 2, ...(gaten.length && { tekenwijze: 'module', gaten }) }, { quantity: 1, attachmentUrl: null }) })
  const kom = (variant = 'WTMWK40W', quantity = 1) => ({ ...basis, id: 'k' + variant, width: null, height: null, total_price: 100, selected_options: { shape: 'meubel', quantity, meubel: { eenheid: 'mm', modelId: 'waskom-ceramic', variant, factor: 2 } } })

  test('maat uit de prijslijsttekst', () => {
    expect(komMaat('Ø 40 cm, hoogte 15 cm')).toEqual({ b: 400, d: 400 })
    expect(komMaat('45 × 32,5 cm, hoogte 13,5 cm')).toEqual({ b: 450, d: 325 })
    expect(komMaat(undefined)).toBeNull()
  })
  test('zonder waskom of zonder meubel: niets', () => {
    expect(komControle([meubel()])).toBeNull()
    expect(komControle([kom()])).toBeNull()
  })
  test('geen gaten getekend: past op het blad, monteur boort', () => {
    const r = komControle([meubel(), kom()])
    expect(r?.goed).toBe(true)
    expect(r?.tekst).toContain('monteur boort')
  })
  test('aantal gaten en kommen verschilt', () => {
    const r = komControle([meubel([gat('sifon', 400)]), kom('WTMWK40W', 2)])
    expect(r).toEqual({ goed: false, tekst: 'Je hebt 1 afvoergat getekend en 2 waskommen in dit project. Klopt dat?' })
  })
  test('kom over de zijkant, kommen tegen elkaar, kraan onder de kom', () => {
    expect(komControle([meubel([gat('sifon', 150)]), kom()])?.tekst).toContain('over de zijkant')
    expect(komControle([meubel([gat('sifon', 500), gat('sifon', 800)]), kom('WTMWK40W', 2)])?.tekst).toContain('raken elkaar')
    expect(komControle([meubel([gat('sifon', 400), gat('kraan', 450, 300)]), kom()])?.tekst).toContain('onder de waskom')
  })
  test('alles klopt', () => {
    const r = komControle([meubel([gat('sifon', 350), gat('sifon', 1050), gat('kraan', 350, 420), gat('kraan', 1050, 420)]), kom('WTMWK30W', 2)])
    expect(r).toEqual({ goed: true, tekst: 'De waskommen passen: de afvoergaten liggen goed en de kommen blijven binnen het blad.' })
  })
})
