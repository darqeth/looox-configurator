import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { composeVisualisation, type VisualisationInput } from '../src/lib/visualisation/compose'
import { SCENES } from '../src/lib/visualisation/scenes'

// Genereert testbeelden voor visuele beoordeling (.tmp/visual-tests/) en
// bewaakt dat de pipeline voor alle vorm/licht/glas-varianten blijft draaien.

const VARIANTEN: Array<{ naam: string; input: VisualisationInput }> = [
  {
    naam: 'rechthoek-80x60-helder-indirect-warm',
    input: { shape: 'rechthoek', width: 80, height: 60, glasKleur: 'helder', directPositions: [], indirect: true, lichtKelvin: 3000 },
  },
  {
    naam: 'rechthoek-120x70-smoke-direct-bo-koel',
    input: { shape: 'rechthoek', width: 120, height: 70, glasKleur: 'smoke-zwart', directPositions: ['boven-beneden'], indirect: false, lichtKelvin: 4000 },
  },
  {
    naam: 'rond-80-helder-indirect-warm',
    input: { shape: 'rond', width: 80, height: 80, glasKleur: 'helder', directPositions: [], indirect: true, lichtKelvin: 3000 },
  },
  {
    naam: 'rond-100-brons-direct-ring-koel',
    input: { shape: 'rond', width: 100, height: 100, glasKleur: 'smoke-brons', directPositions: ['rondom'], indirect: false, lichtKelvin: 4000 },
  },
  {
    naam: 'rounded-rect-90x60-helder-direct-bo-warm',
    input: { shape: 'rounded-rect', width: 90, height: 60, glasKleur: 'helder', directPositions: ['boven-beneden'], indirect: false, lichtKelvin: 3000 },
  },
  {
    naam: 'rechthoek-100x70-helder-aluframe-indirect-warm',
    input: { shape: 'rechthoek', width: 100, height: 70, glasKleur: 'helder', directPositions: [], indirect: true, lichtKelvin: 3000, frameColor: 'aluminium' },
  },
  {
    naam: 'rond-90-helder-zwartframe-warm',
    input: { shape: 'rond', width: 90, height: 90, glasKleur: 'helder', directPositions: [], indirect: false, lichtKelvin: 3000, frameColor: 'zwart' },
  },
  {
    naam: 'rechthoek-140x80-helder-alles-warm',
    input: { shape: 'rechthoek', width: 140, height: 80, glasKleur: 'helder', directPositions: ['rondom'], indirect: true, lichtKelvin: 3000 },
  },
]

test.describe('visualisatie-compositing', () => {
  for (const scene of SCENES) {
    for (const v of VARIANTEN) {
      test(`${scene.id}: ${v.naam}`, async () => {
        const buf = await composeVisualisation(scene, v.input)
        expect(buf.length).toBeGreaterThan(50_000) // echte jpeg, geen lege buffer
        mkdirSync('.tmp/visual-tests', { recursive: true })
        writeFileSync(`.tmp/visual-tests/${scene.id}-${v.naam}.jpg`, buf)
      })
    }
  }
})
