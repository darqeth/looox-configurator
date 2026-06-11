// Badkamerscènes voor de visualisatie (epic, besluit V1/V8).
// Per scène: schaal-anker (px per cm, gekalibreerd op een object met bekende
// breedte), spiegelpositie en lichtinformatie. Foto's staan in public/scenes/.
//
// LET OP: 'warm' is de tijdelijke bouwscène (AI-gegenereerd). Zodra Mark's
// LoooX-foto's binnen zijn worden ze hier gekalibreerd toegevoegd en gaat de
// testscène eruit (besluit V1).

export type Scene = {
  id: string
  name: string
  /** Pad relatief aan public/ */
  image: string
  /** Volledige beeldbreedte/hoogte in px (bron) */
  width: number
  height: number
  /** Schaal: pixels per centimeter op het spiegelmuurvlak */
  pxPerCm: number
  /** Horizontaal middelpunt van de spiegelpositie (px) */
  centerX: number
  /** Onderkant van de spiegel (px) — engine rekent de top uit vanaf de maat */
  mirrorBottomY: number
  /** Richting van het daglicht voor de slagschaduw: -1 = licht van links */
  lightFromX: -1 | 1
  /** Tegenfoto (wat er tegenover de spiegel staat) — echte reflectie */
  reflectionImage?: string
  /** Welk hoogtedeel van de tegenfoto de spiegel toont (0-1, default 0.5) */
  reflectionFocusY?: number
  /** Verkleiningsfactor van de reflectie-inhoud (spiegel toont de overkant
      kleiner door de langere optische weg); default 0.55 bij tegenfoto */
  reflectionScale?: number
}

export const SCENES: Scene[] = [
  {
    id: 'warm',
    name: 'Warm minimalistisch',
    image: 'scenes/test-warm.jpg',
    width: 2336,
    height: 1600,
    pxPerCm: 8.6,       // meubel ≈ 160 cm breed ≈ 1372 px (bijgesteld na beeldcheck)
    centerX: 1163,
    mirrorBottomY: 855, // ≈ 23 cm boven het meubelblad (lucht boven de kraan)
    lightFromX: -1,
  },
  {
    id: 'japandi',
    name: 'Japandi',
    image: 'scenes/japandi.jpg',
    width: 5000,
    height: 3700,
    pxPerCm: 8.83,       // meubel 250 cm = 2208 px (bijgesteld na beeldcheck)
    centerX: 2496,
    mirrorBottomY: 1860, // net boven de kraanplaatjes (20cm lager na beeldcheck)
    lightFromX: -1,
    reflectionImage: 'scenes/japandi_spiegelbeeld.jpg',
    reflectionFocusY: 0.5,
    reflectionScale: 0.55,
  },
]

export function getScene(id: string): Scene | undefined {
  return SCENES.find(s => s.id === id)
}
