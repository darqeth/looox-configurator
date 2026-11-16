import { test, expect } from '@playwright/test'
import { normaliseerBedrijf, lijktOpBedrijf, vergelijkBedrijf, suggereerBedrijven } from '../src/lib/bedrijfsnaam'

const BESTAAND = ['RM Sanitair', 'Baderie Eindhoven', 'Baderie Arnhem', 'Lamo NV', 'Gévier', 'Het Woonlab Barendrecht', 'Strous Badkamers & Tegels']

test('schrijfwijze en rechtsvorm vallen weg', () => {
  for (const n of ['rm sanitair', 'Rm Sanitair ', 'RM Sanitair B.V.', 'RM-Sanitair BV', 'R.M. Sanitair']) expect(normaliseerBedrijf(n)).toBe('rmsanitair')
  expect(normaliseerBedrijf('Lamo')).toBe(normaliseerBedrijf('Lamo NV'))
  expect(normaliseerBedrijf('Gevier')).toBe(normaliseerBedrijf('Gévier'))
  expect(normaliseerBedrijf('Strous Badkamers en Tegels')).toBe(normaliseerBedrijf('Strous Badkamers & Tegels'))
  expect(normaliseerBedrijf('V.O.F. B en B Tegelwerken')).toBe('benbtegelwerken')
})

test('rechtsvorm midden in een woord blijft staan', () => {
  expect(normaliseerBedrijf('Bvlgari Baden')).toBe('bvlgaribaden')
  expect(normaliseerBedrijf('Envy Sanitair')).toBe('envysanitair')
})

test('vestigingen blijven aparte bedrijven', () => {
  expect(normaliseerBedrijf('Baderie Eindhoven')).not.toBe(normaliseerBedrijf('Baderie Arnhem'))
  expect(lijktOpBedrijf('Baderie Eindhoven', 'Baderie Arnhem')).toBe(false)
  expect(vergelijkBedrijf('Baderie Zwolle', BESTAAND)).toEqual({ soort: 'nieuw' })
  expect(vergelijkBedrijf('Het Woonlab bv', BESTAAND)).toEqual({ soort: 'nieuw' })
})

test('vergelijken: zelfde, gelijk, lijkt, nieuw', () => {
  expect(vergelijkBedrijf(' RM Sanitair ', BESTAAND)).toEqual({ soort: 'zelfde', naam: 'RM Sanitair' })
  expect(vergelijkBedrijf('rm sanitair b.v.', BESTAAND)).toEqual({ soort: 'gelijk', naam: 'RM Sanitair' })
  expect(vergelijkBedrijf('RM Sanitar', BESTAAND)).toEqual({ soort: 'lijkt', naam: 'RM Sanitair' })
  expect(vergelijkBedrijf('Badkamer Totaal', BESTAAND)).toEqual({ soort: 'nieuw' })
  expect(vergelijkBedrijf('  ', BESTAAND)).toEqual({ soort: 'nieuw' })
})

test('snelselectie toont vestigingen naast elkaar, zonder dubbelen', () => {
  expect(suggereerBedrijven('bad', [...BESTAAND, 'baderie eindhoven'])).toEqual(['Baderie Arnhem', 'Baderie Eindhoven', 'Strous Badkamers & Tegels'])
  expect(suggereerBedrijven('rm', BESTAAND)).toEqual([])
  expect(suggereerBedrijven('woon', BESTAAND)).toEqual(['Het Woonlab Barendrecht'])
})
