import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { composeVisualisationWithLayers } from '../src/lib/visualisation/compose'
import { applyAiPass } from '../src/lib/visualisation/ai-pass'
import { SCENES } from '../src/lib/visualisation/scenes'

// Echte OpenAI-call (~EUR 0,05): draait alleen bewust via AI_LIVE=1
test('ai-pas live: echte OpenAI-afwerking + re-compose', async () => {
  test.skip(process.env.AI_LIVE !== '1', 'alleen met AI_LIVE=1')
  test.setTimeout(120_000)
  const scene = SCENES.find(s => s.id === 'japandi')!
  const composed = await composeVisualisationWithLayers(scene, {
    shape: 'rechthoek', width: 120, height: 70, glasKleur: 'helder',
    directPositions: ['boven-beneden'], indirectPositions: ['rondom'], lichtKelvin: 3000,
  })
  const ai = await applyAiPass(composed)
  expect(ai.length).toBeGreaterThan(50_000)
  mkdirSync('.tmp/visual-tests', { recursive: true })
  writeFileSync('.tmp/visual-tests/_ai-live-fase1.jpg', composed.jpeg)
  writeFileSync('.tmp/visual-tests/_ai-live-resultaat.jpg', ai)
})
