import { test, expect } from '@playwright/test'
import { projectRegel, projectTotaal, projectKop, isUuid } from '../src/lib/project'

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
    expect(projectKop([{ ...basis, total_price: 1, selected_options: meubelOpts() }])).toEqual({ naam: 'Badkamer De Vries', referentie: 'REF-1' })
    expect(projectKop([])).toEqual({ naam: 'Naamloos project', referentie: '' })
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
