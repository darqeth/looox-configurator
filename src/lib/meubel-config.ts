// Tailor-Made meubels (configurator 2.0).
// Bron: inkoopprijslijst Tailor-Made, geldig vanaf 1 juli 2026 (netto, excl. btw).
// Alle bedragen in centen, alle maten in hele millimeters. In beeld en op de offerte staat altijd bruto
// (netto × factor van het bedrijf); netto is alleen voor de bestelstap.

export const MEUBEL_FACTOR_DEFAULT = 2
export const MEUBEL_FACTOR_MAX = 10
// Een lade is 350 tot 1200 mm breed (Mark, 12 nov). Harde grenzen, ook bij gelijke verdeling.
export const LADE_MIN_MM = 350
export const LADE_MAX_MM = 1200
export const UITSPARING_NETTO_CENTS = 1040
export const UITSPARING_MAX = 10

// Staffel: lengtebereik in cm, letterlijk zoals in de prijslijst, met de prijs per
// aantal lades naast elkaar. De configurator rekent in mm: een lengte valt in de
// eerste staffel waarvan de bovengrens niet wordt overschreden (1201 mm is dus
// de staffel 121 tot 129 cm, 1291 mm de staffel 130 tot 190 cm).
// Bij dubbele modellen (2 rijen) is de sleutel het aantal kolommen: 2 = "2×2".
interface Staffel {
  min: number
  max: number
  prijzen: Record<number, number>
}

export type MeubelCategorieId = 'wastafelmeubels' | 'solid-surface' | 'kasten' | 'toiletmeubels' | 'planken' | 'waskommen' | 'accessoires'

// Tailor-Made assortiment in categorieën: de dealer kiest eerst een categorie,
// daarna een model. Een categorie zonder modellen staat er als "binnenkort".
export const MEUBEL_CATEGORIEEN: { id: MeubelCategorieId; naam: string; omschrijving: string }[] = [
  { id: 'wastafelmeubels', naam: 'Wastafelmeubels', omschrijving: 'Houten ladenmeubels op maat.' },
  { id: 'solid-surface', naam: 'Solid Surface', omschrijving: 'Meubels met een Solid Surface blad en waskom.' },
  { id: 'kasten', naam: 'Kasten', omschrijving: 'Hoge kasten, regalen en de spiegelkast.' },
  { id: 'toiletmeubels', naam: 'Toiletmeubels', omschrijving: 'Compacte meubels en planken voor het toilet.' },
  { id: 'planken', naam: 'Planken', omschrijving: 'Base Shelf, Wall Shelf, Niche Shelf en Cover.' },
  { id: 'waskommen', naam: 'Waskommen', omschrijving: 'Keramiek, Solid Surface en vrijstaande zuilen.' },
  { id: 'accessoires', naam: 'Accessoires', omschrijving: 'Organizers en dividers voor in de lade.' },
]

export interface MeubelModel {
  id: string
  categorie: MeubelCategorieId
  naam: string
  omschrijving: string
  afbeelding: string
  /** Diepte in mm */
  diepte: number
  /** Hoogte in mm */
  hoogte: number
  /** Aantal laderijen boven elkaar */
  rijen: number
  /**
   * Rand van het frame in mm, altijd links en rechts (U-Floor 40, U-Frame en Full-Frame 50).
   * De lades verdelen de lengte min twee keer de rand.
   */
  rand?: number
  /** De rand loopt ook boven langs (U-Frame, U-Floor, Full-Frame) */
  randBoven?: boolean
  /** De rand loopt ook onder langs: frame rondom (Full-Frame) */
  randOnder?: boolean
  /**
   * Open regaalkast naast de lades (Regal-modellen): de dealer kiest links of rechts
   * en een breedte binnen dit bereik in mm. De lengte in de prijslijst is de totale lengte.
   */
  regaal?: { min: number; max: number }
  /**
   * Twee kasten met elk één lade en de regaalkast ertussen (Drawer Box Regal). Er is geen
   * lengte-invoer: de dealer kiest per kast een breedte. Beide breedtes moeten in dezelfde
   * reeks uit de prijslijst vallen (cm, zoals in de prijslijst); de lengte is de som.
   */
  duo?: { min: number; max: number; prijs: number }[]
  /**
   * Solid Surface blad met ingebouwde waskom: de dealer kiest de vorm en één of twee
   * waskommen, zonder prijsverschil. De plaats tekent hij op de maattekening.
   */
  waskom?: boolean
  /** Meerdere hoogtes zonder prijsverschil (Full-Frame, U-Frame); `hoogte` is de standaard */
  hoogtes?: number[]
  /** Houtkleuren die bij dit model niet kunnen (Stripes: geen White) */
  geenKleuren?: string[]
  /** Alleen in de standaardmaten te bestellen: geen "groter dan" op aanvraag (nu bij geen enkel model; zie Mirror Cabinet later) */
  geenAanvraag?: boolean
  /** Alleen deze lengtes in mm zijn te bestellen (Basic Drawer); de dealer kiest uit de lijst */
  vasteLengtes?: number[]
  /** Bijzonderheid uit de prijslijst, getoond bij het samenstellen */
  opmerking?: string
  staffels: Staffel[]
}

export const MEUBEL_MODELLEN: MeubelModel[] = [
  {
    id: 'facet',
    categorie: 'wastafelmeubels',
    naam: 'Facet',
    omschrijving: 'Greeploos ladenmeubel met facetrand.',
    afbeelding: '/images/meubels/model-facet.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    staffels: [
      { min: 50,  max: 120, prijzen: { 1: 98176, 2: 115336 } },
      { min: 121, max: 129, prijzen: { 2: 122616 } },
      { min: 130, max: 190, prijzen: { 2: 155896, 3: 179816 } },
      { min: 191, max: 210, prijzen: { 2: 169416, 3: 196456, 4: 222456 } },
      { min: 211, max: 260, prijzen: { 2: 192296, 3: 214136, 4: 249496 } },
    ],
  },
  {
    id: 'facet-double',
    categorie: 'wastafelmeubels',
    naam: 'Facet Double',
    omschrijving: 'Facet met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-facet-double.webp',
    diepte: 460,
    hoogte: 600,
    rijen: 2,
    staffels: [
      { min: 50,  max: 120, prijzen: { 1: 142376, 2: 175136 } },
      { min: 121, max: 129, prijzen: { 2: 187096 } },
      { min: 130, max: 190, prijzen: { 2: 226616, 3: 264056 } },
      { min: 191, max: 210, prijzen: { 2: 230256, 3: 285896 } },
      { min: 211, max: 260, prijzen: { 2: 248976, 3: 304616 } },
      { min: 261, max: 290, prijzen: { 3: 323336 } },
    ],
  },
  {
    id: 'facet-regal',
    categorie: 'wastafelmeubels',
    naam: 'Facet Regal',
    omschrijving: 'Facet met een open regaalkast links of rechts.',
    afbeelding: '/images/meubels/model-facet-regal.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    regaal: { min: 300, max: 500 },
    staffels: [
      { min: 80, max: 129, prijzen: { 1: 155896 } },
      { min: 130, max: 150, prijzen: { 1: 167336, 2: 187096 } },
      { min: 151, max: 190, prijzen: { 2: 192296 } },
      { min: 191, max: 210, prijzen: { 2: 207896, 3: 213096 } },
      { min: 211, max: 260, prijzen: { 2: 211016, 3: 231816 } },
    ],
  },
  {
    id: 'facet-deco',
    categorie: 'wastafelmeubels',
    naam: 'Facet Deco',
    omschrijving: 'Smalle Facet zonder ruimte voor een waskom.',
    afbeelding: '/images/meubels/model-facet-deco.webp',
    diepte: 420,
    hoogte: 350,
    rijen: 1,
    opmerking: 'Door onvoldoende ruimte achter de lade is het niet mogelijk om een waskom op de Facet Deco te plaatsen.',
    staffels: [
      { min: 50, max: 120, prijzen: { 1: 103896, 2: 121576 } },
      { min: 121, max: 129, prijzen: { 2: 125736 } },
    ],
  },
  {
    id: 'facet-stripes',
    categorie: 'wastafelmeubels',
    naam: 'Facet Stripes',
    omschrijving: 'Facet met verticale lamellen op het front.',
    afbeelding: '/images/meubels/model-facet-stripes.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    geenKleuren: ['white'],
    opmerking: 'De Facet Stripes is niet in een witte lak te verkrijgen.',
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 97656, 2: 114296 } },
      { min: 121, max: 139, prijzen: { 2: 121576 } },
      { min: 140, max: 190, prijzen: { 2: 153816, 3: 186056 } },
      { min: 191, max: 210, prijzen: { 2: 170248, 3: 197496 } },
      { min: 211, max: 255, prijzen: { 2: 180856, 3: 207896 } },
    ],
  },
  {
    id: 'facet-stripes-double',
    categorie: 'wastafelmeubels',
    naam: 'Facet Stripes Double',
    omschrijving: 'Facet Stripes met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-facet-stripes-double.webp',
    diepte: 460,
    hoogte: 600,
    rijen: 2,
    geenKleuren: ['white'],
    opmerking: 'De Facet Stripes is niet in een witte lak te verkrijgen.',
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 177736, 2: 198536 } },
      { min: 121, max: 140, prijzen: { 2: 221416 } },
      { min: 141, max: 190, prijzen: { 2: 279656, 3: 317096 } },
      { min: 191, max: 210, prijzen: { 2: 292136, 3: 331656 } },
      { min: 211, max: 250, prijzen: { 2: 321256, 3: 357656 } },
    ],
  },
  {
    id: 'facet-waves',
    categorie: 'wastafelmeubels',
    naam: 'Facet Waves',
    omschrijving: 'Facet met golvend front.',
    afbeelding: '/images/meubels/model-facet-waves.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    staffels: [
      { min: 50, max: 120, prijzen: { 1: 139256, 2: 155896 } },
      { min: 121, max: 129, prijzen: { 2: 170456 } },
      { min: 130, max: 190, prijzen: { 2: 197496, 3: 222976 } },
      { min: 191, max: 210, prijzen: { 2: 203736, 3: 227656 } },
      { min: 211, max: 260, prijzen: { 2: 226616, 3: 247416 } },
    ],
  },
  {
    id: 'full-frame',
    categorie: 'wastafelmeubels',
    naam: 'Full-Frame',
    omschrijving: 'Ladenmeubel met een frame rondom.',
    afbeelding: '/images/meubels/model-full-frame.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    hoogtes: [300, 350, 400],
    rand: 50,
    randBoven: true,
    randOnder: true,
    staffels: [
      { min: 50, max: 120, prijzen: { 1: 140296, 2: 154856 } },
      { min: 121, max: 175, prijzen: { 2: 170456, 3: 192296 } },
      { min: 176, max: 225, prijzen: { 2: 195416, 3: 213096 } },
      { min: 226, max: 270, prijzen: { 2: 226096, 3: 242216 } },
    ],
  },
  {
    id: 'full-frame-regal',
    categorie: 'wastafelmeubels',
    naam: 'Full-Frame Regal',
    omschrijving: 'Full-Frame met een open regaalkast links of rechts.',
    afbeelding: '/images/meubels/model-full-frame-regal.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    hoogtes: [300, 350, 400],
    rand: 50,
    randBoven: true,
    randOnder: true,
    regaal: { min: 300, max: 500 },
    staffels: [
      { min: 80, max: 120, prijzen: { 1: 163176 } },
      { min: 121, max: 175, prijzen: { 1: 166296, 2: 195416 } },
      { min: 176, max: 225, prijzen: { 2: 197496 } },
      { min: 226, max: 270, prijzen: { 2: 213096 } },
    ],
  },
  {
    id: 'u-frame',
    categorie: 'wastafelmeubels',
    naam: 'U-Frame',
    omschrijving: 'Ladenmeubel met een U-vormig frame.',
    afbeelding: '/images/meubels/model-u-frame.webp',
    diepte: 460,
    hoogte: 300,
    rijen: 1,
    hoogtes: [300, 350, 400],
    rand: 50,
    randBoven: true,
    staffels: [
      { min: 50, max: 120, prijzen: { 1: 114296, 2: 145496 } },
      { min: 121, max: 175, prijzen: { 2: 161096, 3: 189176 } },
      { min: 176, max: 225, prijzen: { 2: 185016, 3: 207896 } },
      { min: 226, max: 270, prijzen: { 2: 217256, 3: 238576 } },
    ],
  },
  {
    id: 'u-floor',
    categorie: 'wastafelmeubels',
    naam: 'U-Floor',
    omschrijving: 'Staand meubel met twee laderijen in een U-frame.',
    afbeelding: '/images/meubels/model-u-floor.webp',
    diepte: 460,
    hoogte: 780,
    rijen: 2,
    rand: 40,
    randBoven: true,
    staffels: [
      { min: 50, max: 100, prijzen: { 1: 211016 } },
      { min: 101, max: 120, prijzen: { 1: 214136 } },
      { min: 121, max: 140, prijzen: { 2: 274456 } },
      { min: 141, max: 160, prijzen: { 2: 287976 } },
      { min: 161, max: 180, prijzen: { 2: 343096 } },
      { min: 181, max: 220, prijzen: { 2: 375336 } },
    ],
  },
  {
    id: 'basic-drawer',
    categorie: 'wastafelmeubels',
    naam: 'Basic Drawer',
    omschrijving: 'Strak ladenmeubel met greeplijst.',
    afbeelding: '/images/meubels/model-basic-drawer.webp',
    diepte: 430,
    hoogte: 380,
    rijen: 1,
    staffels: [
      { min: 50, max: 80, prijzen: { 1: 103896 } },
      { min: 81, max: 100, prijzen: { 1: 109096, 2: 114296 } },
      { min: 101, max: 120, prijzen: { 1: 113256, 2: 117416 } },
      { min: 121, max: 160, prijzen: { 2: 135096 } },
      { min: 161, max: 190, prijzen: { 2: 148616 } },
      { min: 191, max: 230, prijzen: { 2: 169416 } },
      { min: 231, max: 240, prijzen: { 2: 176696 } },
    ],
  },
  {
    id: 'drawer-box',
    categorie: 'wastafelmeubels',
    naam: 'Drawer Box',
    omschrijving: 'Ladenmeubel met overstekend blad.',
    afbeelding: '/images/meubels/model-drawer-box.webp',
    diepte: 460,
    hoogte: 450,
    rijen: 1,
    staffels: [
      { min: 50, max: 80, prijzen: { 1: 122616 } },
      { min: 81, max: 100, prijzen: { 1: 128856, 2: 155376 } },
      { min: 101, max: 120, prijzen: { 1: 132496, 2: 155896 } },
      { min: 121, max: 160, prijzen: { 2: 172536 } },
      { min: 161, max: 210, prijzen: { 2: 204776, 3: 230256 } },
      { min: 211, max: 260, prijzen: { 2: 239096, 3: 259896 } },
    ],
  },
  {
    id: 'drawer-box-double',
    categorie: 'wastafelmeubels',
    naam: 'Drawer Box Double',
    omschrijving: 'Drawer Box met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-drawer-box-double.webp',
    diepte: 460,
    hoogte: 600,
    rijen: 2,
    opmerking: 'De onderste rij laden is voorzien van push-to-open.',
    staffels: [
      { min: 50, max: 80, prijzen: { 1: 182936 } },
      { min: 81, max: 100, prijzen: { 1: 176696, 2: 218296 } },
      { min: 101, max: 120, prijzen: { 1: 179816, 2: 222456 } },
      { min: 121, max: 160, prijzen: { 2: 232336 } },
      { min: 161, max: 210, prijzen: { 2: 273936, 3: 310856 } },
      { min: 211, max: 260, prijzen: { 2: 309816, 3: 334776 } },
    ],
  },
  {
    id: 'drawer-box-regal',
    categorie: 'wastafelmeubels',
    naam: 'Drawer Box Regal',
    omschrijving: 'Twee Drawer Box-kasten met een open regaalkast ertussen.',
    afbeelding: '/images/meubels/model-drawer-box-regal.webp',
    diepte: 460,
    hoogte: 450,
    rijen: 1,
    regaal: { min: 300, max: 500 },
    geenAanvraag: true,
    duo: [
      { min: 56, max: 80, prijs: 257400 },
      { min: 81, max: 100, prijs: 285896 },
    ],
    staffels: [],
  },
  {
    id: 'block',
    categorie: 'wastafelmeubels',
    naam: 'Block',
    omschrijving: 'Compact blokmeubel zonder ruimte voor een waskom.',
    afbeelding: '/images/meubels/model-block.webp',
    diepte: 400,
    hoogte: 300,
    rijen: 1,
    opmerking: 'Door onvoldoende ruimte achter de lade is het niet mogelijk om een waskom op de Block te plaatsen.',
    staffels: [
      { min: 50, max: 68, prijzen: { 1: 100776 } },
      { min: 69, max: 88, prijzen: { 1: 101296 } },
      { min: 89, max: 108, prijzen: { 1: 101816 } },
      { min: 109, max: 120, prijzen: { 1: 102856, 2: 139776 } },
      { min: 121, max: 138, prijzen: { 2: 140816 } },
      { min: 139, max: 158, prijzen: { 2: 142896 } },
      { min: 159, max: 178, prijzen: { 2: 161616 } },
      { min: 179, max: 228, prijzen: { 2: 164736 } },
    ],
  },
  {
    id: 'solid-facet',
    categorie: 'solid-surface',
    naam: 'Solid Facet',
    omschrijving: 'Facet met Solid Surface blad en ingebouwde waskom.',
    afbeelding: '/images/meubels/model-solid-facet.webp',
    diepte: 460,
    hoogte: 350,
    rijen: 1,
    waskom: true,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 186056, 2: 217256 } },
      { min: 121, max: 139, prijzen: { 2: 244296 } },
      { min: 140, max: 160, prijzen: { 2: 278616, 3: 297336 } },
      { min: 161, max: 180, prijzen: { 2: 283816, 3: 308776 } },
      { min: 181, max: 240, prijzen: { 2: 309816, 3: 334776 } },
      { min: 241, max: 260, prijzen: { 3: 360776 } },
    ],
  },
  {
    id: 'solid-facet-double',
    categorie: 'solid-surface',
    naam: 'Solid Facet Double',
    omschrijving: 'Solid Facet met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-solid-facet-double.webp',
    diepte: 460,
    hoogte: 700,
    rijen: 2,
    waskom: true,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 294216 } },
      { min: 121, max: 139, prijzen: { 2: 322296 } },
      { min: 140, max: 160, prijzen: { 2: 346216 } },
      { min: 161, max: 180, prijzen: { 2: 362856 } },
      { min: 181, max: 240, prijzen: { 2: 430456, 3: 457496 } },
      { min: 241, max: 260, prijzen: { 3: 467896 } },
    ],
  },
  {
    id: 'solid-facet-stripes',
    categorie: 'solid-surface',
    naam: 'Solid Facet Stripes',
    omschrijving: 'Facet Stripes met Solid Surface blad en ingebouwde waskom.',
    afbeelding: '/images/meubels/model-solid-facet-stripes.webp',
    diepte: 460,
    hoogte: 350,
    rijen: 1,
    waskom: true,
    geenKleuren: ['white'],
    opmerking: 'De Solid Facet Stripes is niet in een witte lak te verkrijgen.',
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 187096, 2: 229736 } },
      { min: 121, max: 139, prijzen: { 2: 254696 } },
      { min: 140, max: 190, prijzen: { 2: 297336, 3: 327496 } },
      { min: 191, max: 210, prijzen: { 2: 325416, 3: 356616 } },
      { min: 211, max: 255, prijzen: { 2: 349336, 3: 369096 } },
    ],
  },
  {
    id: 'solid-facet-stripes-double',
    categorie: 'solid-surface',
    naam: 'Solid Facet Stripes Double',
    omschrijving: 'Solid Facet Stripes met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-solid-facet-stripes-double.webp',
    diepte: 460,
    hoogte: 700,
    rijen: 2,
    waskom: true,
    geenKleuren: ['white'],
    opmerking: 'De Solid Facet Stripes is niet in een witte lak te verkrijgen.',
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 251576 } },
      { min: 121, max: 139, prijzen: { 2: 329576 } },
      { min: 140, max: 160, prijzen: { 2: 361816 } },
      { min: 161, max: 180, prijzen: { 2: 376376 } },
      { min: 181, max: 240, prijzen: { 2: 426296, 3: 457496 } },
      { min: 241, max: 250, prijzen: { 3: 473096 } },
    ],
  },
  {
    id: 'solid-drawer-box',
    categorie: 'solid-surface',
    naam: 'Solid Drawer Box',
    omschrijving: 'Drawer Box met Solid Surface blad en ingebouwde waskom.',
    afbeelding: '/images/meubels/model-solid-drawer-box.webp',
    diepte: 460,
    hoogte: 450,
    rijen: 1,
    waskom: true,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 215176 } },
      { min: 121, max: 139, prijzen: { 2: 264056 } },
      { min: 140, max: 160, prijzen: { 2: 276016 } },
      { min: 161, max: 210, prijzen: { 2: 329576, 3: 374296 } },
      { min: 211, max: 260, prijzen: { 2: 384696, 3: 415896 } },
    ],
  },
  {
    id: 'solid-drawer-box-double',
    categorie: 'solid-surface',
    naam: 'Solid Drawer Box Double',
    omschrijving: 'Solid Drawer Box met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-solid-drawer-box-double.webp',
    diepte: 460,
    hoogte: 600,
    rijen: 2,
    waskom: true,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 272896 } },
      { min: 121, max: 139, prijzen: { 2: 332696 } },
      { min: 140, max: 160, prijzen: { 2: 384696 } },
      { min: 161, max: 210, prijzen: { 2: 447096, 3: 485576 } },
      { min: 211, max: 260, prijzen: { 2: 502216, 3: 551096 } },
    ],
  },
  {
    id: 'solid-base-drawer-box',
    categorie: 'solid-surface',
    naam: 'Solid Base Drawer Box',
    omschrijving: 'Drawer Box met vlak Solid Surface blad, zonder ingebouwde waskom.',
    afbeelding: '/images/meubels/model-solid-base-drawer-box.webp',
    diepte: 460,
    hoogte: 450,
    rijen: 1,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 195936 } },
      { min: 121, max: 140, prijzen: { 2: 240136 } },
      { min: 141, max: 160, prijzen: { 2: 250536 } },
      { min: 161, max: 180, prijzen: { 2: 299416 } },
      { min: 181, max: 240, prijzen: { 2: 349856, 3: 371176 } },
      { min: 241, max: 250, prijzen: { 3: 378456 } },
    ],
  },
  {
    id: 'solid-base-drawer-box-double',
    categorie: 'solid-surface',
    naam: 'Solid Base Drawer Box Double',
    omschrijving: 'Solid Base Drawer Box met twee laderijen boven elkaar.',
    afbeelding: '/images/meubels/model-solid-base-drawer-box-double.webp',
    diepte: 460,
    hoogte: 600,
    rijen: 2,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 256256 } },
      { min: 121, max: 160, prijzen: { 2: 299416 } },
      { min: 161, max: 210, prijzen: { 2: 361816, 3: 461656 } },
      { min: 211, max: 260, prijzen: { 2: 472056, 3: 530296 } },
    ],
  },
  {
    id: 'solid-frame',
    categorie: 'solid-surface',
    naam: 'Solid Frame',
    omschrijving: 'Meubel met frame, Solid Surface blad en ingebouwde waskom.',
    afbeelding: '/images/meubels/model-solid-frame.webp',
    diepte: 460,
    hoogte: 370,
    rijen: 1,
    waskom: true,
    staffels: [
      { min: 70, max: 120, prijzen: { 1: 147900, 2: 199900 } },
      { min: 121, max: 139, prijzen: { 2: 214900 } },
      { min: 140, max: 160, prijzen: { 2: 229900 } },
      { min: 161, max: 180, prijzen: { 2: 239900, 3: 247900 } },
      { min: 181, max: 240, prijzen: { 2: 289900, 3: 298900 } },
      { min: 241, max: 260, prijzen: { 3: 311900 } },
    ],
  },
]

export interface Houtkleur {
  id: string
  naam: string
  meerprijs: number
  /** Donker hout: de tekening gebruikt dan lichte lijnen */
  donker?: boolean
}

export const HOUTKLEUREN: Houtkleur[] = [
  { id: 'white',      naam: 'White',      meerprijs: 4160 },
  { id: 'pure',       naam: 'Pure',       meerprijs: 4160 },
  { id: 'old-grey',   naam: 'Old Grey',   meerprijs: 0 },
  { id: 'dark-grey',  naam: 'Dark Grey',  meerprijs: 4160 },
  { id: 'brown-grey', naam: 'Brown Grey', meerprijs: 4160, donker: true },
  { id: 'dark-brown', naam: 'Dark Brown', meerprijs: 4160, donker: true },
  { id: 'black',      naam: 'Black',      meerprijs: 0, donker: true },
]

export const HOUTKLEUR_DEFAULT = 'old-grey'

export function houtkleurAfbeelding(id: string): string {
  return `/images/meubels/hout/${id}.webp`
}

export function getMeubelModel(id: string): MeubelModel | null {
  return MEUBEL_MODELLEN.find((m) => m.id === id) ?? null
}

/** Standaardbereik van de lengte in mm. */
export function getLengteBereik(model: MeubelModel): { min: number; max: number } {
  if (model.duo) {
    // Twee kasten plus de regaalkast ertussen
    const regaal = model.regaal ?? { min: 0, max: 0 }
    return {
      min: 2 * Math.min(...model.duo.map((d) => d.min)) * 10 + regaal.min,
      max: 2 * Math.max(...model.duo.map((d) => d.max)) * 10 + regaal.max,
    }
  }
  return {
    min: Math.min(...model.staffels.map((s) => s.min)) * 10,
    max: Math.max(...model.staffels.map((s) => s.max)) * 10,
  }
}

function findStaffel(model: MeubelModel, lengte: number): Staffel | null {
  const bereik = getLengteBereik(model)
  if (!Number.isInteger(lengte) || lengte < bereik.min || lengte > bereik.max) return null
  if (model.vasteLengtes && !model.vasteLengtes.includes(lengte)) return null
  // Staffels staan oplopend: de eerste waarvan de bovengrens niet wordt overschreden
  return model.staffels.find((s) => lengte <= s.max * 10) ?? null
}

/**
 * Aantal lades (kolommen) dat bij deze lengte te bestellen is: de combinaties
 * uit de prijslijst, zolang een lade bij gelijke verdeling 350 tot 1200 mm is.
 */
export function getLadeOpties(model: MeubelModel, lengte: number, regaalBreedte = 0): number[] {
  // Duo: altijd twee kasten met elk één lade
  if (model.duo) return [2]
  const staffel = findStaffel(model, lengte)
  if (!staffel) return []
  return Object.keys(staffel.prijzen)
    .map(Number)
    .filter((n) => ladeRuimte(model, lengte, regaalBreedte) / n >= LADE_MIN_MM && ladeRuimte(model, lengte, regaalBreedte) / n <= LADE_MAX_MM)
    .sort((a, b) => a - b)
}

/** Bereik van een kastbreedte in mm per reeks van een duo-model: [560, 800], [801, 1000]. */
export function getDuoReeksen(model: MeubelModel): { min: number; max: number; prijs: number }[] {
  return (model.duo ?? []).map((d, i, alle) => ({
    // Zelfde grensregel als bij de staffels: boven de bovengrens geldt de volgende reeks
    min: i === 0 ? d.min * 10 : alle[i - 1].max * 10 + 1,
    max: d.max * 10,
    prijs: d.prijs,
  }))
}

/** Netto prijs van een duo-model: beide kastbreedtes in dezelfde reeks, anders null. */
export function getDuoPrijs(model: MeubelModel, breedtes: LadeBreedtes | undefined): number | null {
  if (!model.duo || !breedtes || breedtes.length !== 2 || breedtes.some((b) => !Number.isInteger(b))) return null
  const reeks = getDuoReeksen(model).find((r) => breedtes.every((b) => b >= r.min && b <= r.max))
  return reeks?.prijs ?? null
}

/** Breedte die de lades samen innemen: de lengte min de rand aan beide zijden en min de regaalkast. */
export function ladeRuimte(model: MeubelModel, lengte: number, regaalBreedte = 0): number {
  return lengte - 2 * (model.rand ?? 0) - (model.regaal ? regaalBreedte : 0)
}

export const REGAAL_STANDAARD_MM = 400

/** Gekozen breedte van de regaalkast, of 0 bij een model zonder. Ongeldige waarden vallen terug op de standaard. */
export function getRegaalBreedte(model: MeubelModel, breedte?: number | null): number {
  if (!model.regaal) return 0
  return breedte != null && Number.isInteger(breedte) && breedte >= model.regaal.min && breedte <= model.regaal.max ? breedte : REGAAL_STANDAARD_MM
}

/** Houtkleuren die bij dit model te kiezen zijn. */
export function getHoutkleuren(model: MeubelModel): Houtkleur[] {
  return HOUTKLEUREN.filter((k) => !model.geenKleuren?.includes(k.id))
}

/** Gekozen hoogte, of de standaard van het model als de keuze niet (meer) bestaat. */
export function getMeubelHoogte(model: MeubelModel, hoogte?: number | null): number {
  return hoogte != null && model.hoogtes?.includes(hoogte) ? hoogte : model.hoogte
}

export function ladeLabel(model: MeubelModel, kolommen: number): string {
  if (model.rijen > 1) return `${kolommen} × ${model.rijen} lades`
  return kolommen === 1 ? '1 lade' : `${kolommen} lades`
}

export type WaskomVorm = 'ovaal' | 'vierkant'
export const WASKOM_VORMEN: { id: WaskomVorm; naam: string }[] = [
  { id: 'ovaal', naam: 'Ovaal' },
  { id: 'vierkant', naam: 'Vierkant' },
]

export function waskomTekst(o: { waskomVorm?: WaskomVorm | null; waskomAantal?: number | null }): string {
  const vorm = WASKOM_VORMEN.find((v) => v.id === o.waskomVorm)
  if (!vorm) return ''
  return `${o.waskomAantal === 2 ? '2 waskommen' : '1 waskom'}, ${vorm.naam.toLowerCase()} (plaats volgens maattekening)`
}

export interface MeubelInput {
  modelId: string
  lengte: number
  lades: number
  houtkleur: string
  uitsparingen?: number
  /** Groter dan de standaardmaten: geen tabelprijs, altijd op aanvraag */
  opAanvraag?: boolean
  /** Gekozen hoogte in mm bij modellen met meerdere hoogtes; geen invloed op de prijs */
  hoogte?: number
  /** Breedte van de regaalkast in mm (Regal-modellen); geen invloed op de prijs, wel op de ladeverdeling */
  regaalBreedte?: number
  /** Waskom in het Solid Surface blad: vorm en aantal, zonder prijsverschil */
  waskomVorm?: WaskomVorm
  waskomAantal?: number
  /** Kastbreedtes bij een duo-model (bepalen daar de prijs); bij andere modellen niet nodig voor de prijs */
  ladeBreedtes?: LadeBreedtes
  /** Kant van de regaalkast */
  regaalZijde?: 'links' | 'rechts' | 'midden'
}

/** Netto per stuk in centen, of null bij een ongeldige combinatie. Niet tonen buiten de bestelstap. */
export function calcMeubelNettoCents(input: MeubelInput): number | null {
  const model = getMeubelModel(input.modelId)
  if (!model || input.opAanvraag) return null
  const kleur = getHoutkleuren(model).find((k) => k.id === input.houtkleur)
  const uitsparingen = input.uitsparingen ?? 0
  if (!kleur || !Number.isInteger(uitsparingen) || uitsparingen < 0 || uitsparingen > UITSPARING_MAX) return null
  // Duo (Drawer Box Regal): prijs volgt uit de twee kastbreedtes, niet uit een lengtestaffel
  const basis = model.duo
    ? getDuoPrijs(model, input.ladeBreedtes)
    : getLadeOpties(model, input.lengte, getRegaalBreedte(model, input.regaalBreedte)).includes(input.lades)
      ? findStaffel(model, input.lengte)?.prijzen[input.lades] ?? null
      : null
  if (basis === null) return null
  return basis + kleur.meerprijs + uitsparingen * UITSPARING_NETTO_CENTS
}

export function parseMeubelFactor(v: unknown): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > MEUBEL_FACTOR_MAX) return MEUBEL_FACTOR_DEFAULT
  return Math.round(n * 100) / 100
}

/** Bruto per stuk in centen: de prijs die in beeld en op de offerte staat. */
export function calcMeubelBrutoCents(input: MeubelInput, factor: number): number | null {
  const netto = calcMeubelNettoCents(input)
  if (netto === null) return null
  return Math.round(netto * parseMeubelFactor(factor))
}

export function formatCents(cents: number): string {
  return `€ ${(cents / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface MeubelPrijsRegel {
  label: string
  cents: number
}

/**
 * Bruto prijsopbouw voor het prijspaneel. De regels tellen altijd exact op tot
 * het totaal: afronding door de factor komt in de basisregel terecht.
 */
export function getMeubelPrijsOpbouw(input: MeubelInput, factor: number): { regels: MeubelPrijsRegel[]; totaal: number } | null {
  const totaal = calcMeubelBrutoCents(input, factor)
  const model = getMeubelModel(input.modelId)
  const kleur = HOUTKLEUREN.find((k) => k.id === input.houtkleur)
  if (totaal === null || !model || !kleur) return null
  const f = parseMeubelFactor(factor)
  const extra: MeubelPrijsRegel[] = []
  if (kleur.meerprijs > 0) extra.push({ label: `Houtkleur · ${kleur.naam}`, cents: Math.round(kleur.meerprijs * f) })
  const uitsparingen = input.uitsparingen ?? 0
  if (uitsparingen > 0) extra.push({ label: `Uitsparing · ${uitsparingen}×`, cents: Math.round(uitsparingen * UITSPARING_NETTO_CENTS * f) })
  const basis = totaal - extra.reduce((som, r) => som + r.cents, 0)
  return {
    regels: [{ label: `${model.naam} ${input.lengte} mm · ${ladeLabel(model, input.lades)}`, cents: basis }, ...extra],
    totaal,
  }
}

// ─── Lade-indeling ──────────────────────────────────────────────────────────
// Standaard zijn de lades gelijk verdeeld (ladeBreedtes = null). Past de dealer
// de breedtes aan, dan zijn het hele millimeters van 350 tot 1200 mm die samen
// de lengte van het meubel vormen. Bij dubbele modellen gelden de breedtes
// voor beide rijen.

export type LadeBreedtes = number[] | null

/** Foutmelding bij een ongeldige indeling, anders null. */
export function valideerLadeBreedtes(breedtes: LadeBreedtes, lengte: number, lades: number): string | null {
  if (breedtes === null) return null
  if (!Array.isArray(breedtes) || breedtes.length !== lades) return 'Het aantal breedtes klopt niet met het aantal lades.'
  if (breedtes.some((b) => !Number.isInteger(b))) return 'Vul hele millimeters in.'
  if (breedtes.some((b) => b < LADE_MIN_MM || b > LADE_MAX_MM)) return `Elke lade moet tussen ${LADE_MIN_MM} en ${LADE_MAX_MM} mm breed zijn.`
  if (breedtes.reduce((som, b) => som + b, 0) !== lengte) return `De lades moeten samen ${lengte} mm zijn.`
  return null
}

/** Maat in mm voor weergave: hele mm, of één decimaal als het niet uitkomt (666,7). */
export function formatMm(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 1, useGrouping: false })
}

/**
 * Breedte per lade voor tekening en samenvatting. Gelijk verdeeld is echt
 * gelijk: komt de lengte niet uit, dan krijgt elke lade dezelfde maat achter
 * de komma (2000 mm over 3 lades: 666,7 per lade).
 */
export function getLadeBreedtes(breedtes: LadeBreedtes, lengte: number, lades: number): number[] {
  if (breedtes && valideerLadeBreedtes(breedtes, lengte, lades) === null) return breedtes
  return Array.from({ length: lades }, () => lengte / lades)
}

/**
 * Startpunt voor zelf aanpassen: hele mm die samen de lengte zijn. Komt het
 * niet uit, dan zijn de eerste lades 1 mm breder (2000 over 3: 667, 667, 666).
 */
export function startLadeBreedtes(lengte: number, lades: number): number[] {
  const basis = Math.floor(lengte / lades)
  const rest = lengte - basis * lades
  return Array.from({ length: lades }, (_, i) => basis + (i < rest ? 1 : 0))
}

/** Kan deze lengte met dit aantal lades handmatig worden ingedeeld (elke lade 350 tot 1200 mm)? */
export function kanLadesAanpassen(lengte: number, lades: number): boolean {
  return lades > 1 && lengte >= lades * LADE_MIN_MM && lengte <= lades * LADE_MAX_MM
}

export function ladeBreedtesTekst(breedtes: LadeBreedtes, lengte: number, lades: number): string {
  const b = getLadeBreedtes(breedtes, lengte, lades)
  return breedtes && b === breedtes ? `${b.join(' + ')} mm` : `Gelijk verdeeld, ${formatMm(lengte / lades)} mm per lade`
}

export const MEUBEL_AANTAL_MAX = 99

/** Alles wat van een meubel wordt opgeslagen; de server rekent de prijs zelf na. */
export interface MeubelConfig extends MeubelInput {
  ladeBreedtes: LadeBreedtes
  quantity: number
  /** Met LoooX-logo op het front; kost niets extra */
  logo?: boolean
}

/** Volledige controle van een configuratie (server en client). Foutmelding of null. */
export function valideerMeubelConfig(c: MeubelConfig): string | null {
  if (c.opAanvraag) {
    const model = getMeubelModel(c.modelId)
    if (!model || model.geenAanvraag || !getHoutkleuren(model).some((k) => k.id === c.houtkleur)) return 'Dit model of deze houtkleur bestaat niet.'
    const bereik = getAanvraagBereik(model)
    if (!Number.isInteger(c.lengte) || c.lengte < bereik.min || c.lengte > bereik.max) return `Op aanvraag kan van ${bereik.min} tot ${bereik.max} mm.`
    if (!getAanvraagLadeOpties(ladeRuimte(model, c.lengte, getRegaalBreedte(model, c.regaalBreedte))).includes(c.lades)) return 'Dit aantal lades past niet bij deze lengte.'
  } else {
    // Duo: eerst de eigen melding over de kastbreedtes, die zegt wat er wel kan
    const duoModel = getMeubelModel(c.modelId)
    if (duoModel?.duo && getDuoPrijs(duoModel, c.ladeBreedtes) === null) {
      return `Beide kasten moeten in dezelfde reeks vallen: ${getDuoReeksen(duoModel).map((r) => `${r.min} tot ${r.max} mm`).join(' of ')}.`
    }
    if (calcMeubelNettoCents(c) === null) return 'Deze combinatie van model, lengte, lades en houtkleur bestaat niet.'
  }
  const model = getMeubelModel(c.modelId)!
  if (model.regaal) {
    if (c.regaalBreedte == null || getRegaalBreedte(model, c.regaalBreedte) !== c.regaalBreedte) return `De regaalkast moet tussen ${model.regaal.min} en ${model.regaal.max} mm breed zijn.`
    if (!model.duo && c.regaalZijde !== 'links' && c.regaalZijde !== 'rechts') return 'Kies de kant van de regaalkast.'
  }
  if (model.duo) {
    if (c.lades !== 2 || c.lengte !== (c.ladeBreedtes as number[]).reduce((som, b) => som + b, 0) + (c.regaalBreedte ?? 0)) return 'De lengte klopt niet met de kasten en de regaalkast.'
  }
  if (model.waskom) {
    if (!WASKOM_VORMEN.some((v) => v.id === c.waskomVorm)) return 'Kies de vorm van de waskom.'
    if (c.waskomAantal !== 1 && c.waskomAantal !== 2) return 'Kies één of twee waskommen.'
  }
  const ladeFout = valideerLadeBreedtes(c.ladeBreedtes, ladeRuimte(model, c.lengte, getRegaalBreedte(model, c.regaalBreedte)), c.lades)
  if (ladeFout) return ladeFout
  if (c.hoogte != null && getMeubelHoogte(model, c.hoogte) !== c.hoogte) return 'Deze hoogte bestaat niet bij dit model.'
  const uitsparingen = c.uitsparingen ?? 0
  if (!Number.isInteger(uitsparingen) || uitsparingen < 0 || uitsparingen > UITSPARING_MAX) return `Uitsparingen: 0 tot ${UITSPARING_MAX}.`
  if (!Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > MEUBEL_AANTAL_MAX) return `Aantal moet tussen 1 en ${MEUBEL_AANTAL_MAX} liggen.`
  return null
}

// ─── Groter dan standaard: op aanvraag ──────────────────────────────────────
// De dealer kan bewust een lengte boven het bereik van het model kiezen. Zo'n
// meubel heeft geen tabelprijs en is altijd op aanvraag.

export const MEUBEL_AANVRAAG_MAX_MM = 3500
export const MEUBEL_AANVRAAG_LADES_MAX = 6

export function getAanvraagBereik(model: MeubelModel): { min: number; max: number } {
  return { min: getLengteBereik(model).max + 1, max: MEUBEL_AANVRAAG_MAX_MM }
}

/** Aantal lades naast elkaar waarbij elke lade bij gelijke verdeling 350 tot 1200 mm is. */
export function getAanvraagLadeOpties(lengte: number): number[] {
  const opties: number[] = []
  for (let n = 1; n <= MEUBEL_AANVRAAG_LADES_MAX; n++) {
    if (lengte / n >= LADE_MIN_MM && lengte / n <= LADE_MAX_MM) opties.push(n)
  }
  return opties
}

// ─── Prijsopbouw bij de bestelling ──────────────────────────────────────────
// Zelfde opbouw als bij spiegels: bruto, korting, netto. Bruto is netto × de
// factor van de offerte; de korting is het verschil. Netto blijft de tabelprijs.

export interface MeubelOrderOpbouw {
  brutoCents: number
  kortingCents: number
  /** Korting als percentage van bruto, op één decimaal */
  kortingPct: number
  nettoCents: number
}

export function getMeubelOrderOpbouw(nettoCents: number, factor: number): MeubelOrderOpbouw {
  const brutoCents = Math.round(nettoCents * parseMeubelFactor(factor))
  const kortingCents = brutoCents - nettoCents
  return {
    brutoCents,
    kortingCents,
    kortingPct: brutoCents > 0 ? Math.round((kortingCents / brutoCents) * 1000) / 10 : 0,
    nettoCents,
  }
}

export function formatPct(pct: number): string {
  return `${pct.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`
}

/** Afmeting in één regel, zelfde notatie als bij spiegels: "L 2000 × H 600 × D 460 mm". */
export function meubelAfmeting(model: MeubelModel, lengte: number): string {
  return `L ${lengte} × H ${model.hoogte} × D ${model.diepte} mm`
}

/** Opties uit de tabel "Opties meubels" in één regel, of een streepje als er geen zijn. */
export function meubelOptiesTekst(o: { logo?: boolean; uitsparingen?: number }): string {
  const delen = [
    o.logo ? 'Met logo' : '',
    o.uitsparingen ? `${o.uitsparingen} ${o.uitsparingen === 1 ? 'uitsparing' : 'uitsparingen'} (volgens maattekening)` : '',
  ].filter(Boolean)
  return delen.length > 0 ? delen.join(' · ') : 'Geen'
}
