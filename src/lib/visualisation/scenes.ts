// Badkamerscènes voor de visualisatie (epic, besluit V1/V8).
// Per scène: schaal-anker (px per cm, gekalibreerd op een object met bekende
// breedte), spiegelpositie en lichtinformatie. Foto's staan in public/scenes/.
//
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
  /** Egale muur als reflectie (hex): voor scènes waar tegenover de spiegel
      een kale witte muur zit — rustiger dan de scène-benadering */
  reflectionWall?: string
}

export const SCENES: Scene[] = [
  {
    id: 'japandi',
    name: 'Japandi',
    image: 'scenes/japandi.jpg',
    width: 2600,
    height: 1924,
    pxPerCm: 4.592,      // meubel 250 cm (geschaald 0.52: lambda-bundel klein houden)
    centerX: 1298,
    mirrorBottomY: 921,  // net boven de wandkranen
    lightFromX: -1,
    reflectionImage: 'scenes/japandi_spiegelbeeld.jpg',
    reflectionFocusY: 0.5,
    reflectionScale: 0.55,
  },
  {
    id: 'stijlvol',
    name: 'Stijlvol',
    image: 'scenes/stijlvol.jpg',
    width: 2600,
    height: 1924,
    pxPerCm: 4.144,      // meubel 305 cm (geschaald 0.52)
    centerX: 1326,       // midden tussen de twee wandkranen
    mirrorBottomY: 884,  // net boven de wandkranen
    lightFromX: 1,       // raam rechts
    reflectionWall: '#edecea',
  },
  {
    id: 'simple',
    name: 'Simple',
    image: 'scenes/simple.jpg',
    width: 2600,
    height: 1924,
    pxPerCm: 9.199,      // meubel 140 cm (geschaald 0.52)
    centerX: 1310,
    mirrorBottomY: 926,  // net boven de wandkranen
    lightFromX: -1,
    reflectionWall: '#eae6e2',
  },
  {
    id: 'sfeervol',
    name: 'Sfeervol',
    image: 'scenes/sfeervol.jpg',
    width: 2600,
    height: 1924,
    pxPerCm: 6.380,      // meubel 125 cm (geschaald 0.52)
    centerX: 1560,       // boven de ronde waskom
    mirrorBottomY: 967,  // net boven de wandkraan
    lightFromX: -1,      // raam links
    reflectionImage: 'scenes/sfeervol_spiegelbeeld.jpg',
    reflectionFocusY: 0.52,
    reflectionScale: 0.55,
  },
  {
    id: 'botanisch',
    name: 'Botanisch',
    image: 'scenes/botanisch.jpg',
    width: 1924,
    height: 2600,
    pxPerCm: 6.874,      // meubel 120 cm (geschaald 0.52)
    centerX: 934,
    mirrorBottomY: 1212, // net boven de wandkraan
    lightFromX: 1,
    reflectionImage: 'scenes/botanisch_spiegelbeeld.jpg',
    reflectionFocusY: 0.45,
    reflectionScale: 0.55,
  },
]

export function getScene(id: string): Scene | undefined {
  return SCENES.find(s => s.id === id)
}
