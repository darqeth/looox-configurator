import { test, expect } from '@playwright/test'
import { projectRegel, projectTotaal, projectKop, isUuid } from '../src/lib/project'

const basis = { id: 'a', name: 'Badkamer De Vries', status: 'saved', width: 200, height: 60 }
const meubelOpts = (extra = {}, top = {}) => ({
  shape: 'meubel', quantity: 2, reference: 'REF-1',
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
