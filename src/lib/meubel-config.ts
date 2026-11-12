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
  /** Alleen een blad, zonder lades (Solid Washbasin Solo): de staffel heeft één prijs onder 0 lades */
  zonderLades?: boolean
  /** Geen hout aan dit product: geen houtkleur en geen logo (Solid Washbasin Solo) */
  geenHout?: boolean
  /** Afmeting als tekst, ingevuld bij een gekozen vast artikel (de maat hoort bij de uitvoering) */
  afmetingTekst?: string
  /** Plank: lengte, diepte en dikte in plaats van lades; `staffels` blijft leeg */
  plank?: PlankOpbouw
  /** Vast artikel met artikelnummer (waskommen, accessoires): de dealer kiest alleen een uitvoering */
  artikel?: ArtikelOpbouw
  /** Valt onder "Opties accessoires": lagere meerprijs voor de houtkleur (toiletmeubels) */
  accessoireKleur?: boolean
  /** Kast in plaats van ladenmeubel: breedte, hoogte en diepte uit vaste keuzes; `staffels` blijft leeg */
  kast?: KastOpbouw
  staffels: Staffel[]
}

/**
 * Een kast heeft geen lengte met lades. De dealer kiest breedte en diepte uit een lijst
 * en de hoogte uit een lijst of vrij binnen de hoogtestaffel. In de opslag staat de
 * breedte in `lengte` en het aantal deuren in `lades` (0 = open kast of geen keuze).
 */
/**
 * Een plank heeft een vrije lengte, een diepte (lijst of vrij) en een dikte. De prijs komt uit
 * een tabel: de eerste rij waar lengte en diepte in passen, en daarbinnen de kolom van de
 * diepte of de dikte. In de opslag staat de dikte in `hoogte`.
 */
export interface PlankOpbouw {
  lengte: { min: number; max: number }
  /** Dieptes in mm om uit te kiezen, of een vrij bereik */
  dieptes?: number[]
  diepteBereik?: { min: number; max: number }
  /** Diktes in mm */
  diktes: number[]
  /** Rijen oplopend: grootste lengte en (bij prijs op oppervlakte) grootste diepte in mm */
  rijen: { maxL: number; maxD?: number; prijzen: number[] }[]
  /** Wat de kolom bepaalt: niets, de diepte (bovengrens per kolom) of de dikte */
  kolom?: { op: 'diepte' | 'dikte'; grenzen: number[] }
  /** Handdoekhouders onder de plank (Base Shelf Solo): prijs per stuk, en de diepte die daarbij minimaal nodig is */
  handdoekhouder?: { prijs: number; minDiepte: number }
  /** Rail, Roll of Towel holder onder de plank, zonder meerprijs */
  extras?: boolean
}

export interface ArtikelVariant {
  /** Artikelnummer uit de prijslijst */
  id: string
  naam: string
  afmeting: string
  prijs: number
}

export interface ArtikelOpbouw {
  varianten: ArtikelVariant[]
}

export const PLANK_EXTRAS = [
  { id: 'rail', naam: 'Rail' },
  { id: 'rail-curved', naam: 'Rail curved' },
  { id: 'towel-holder-curved', naam: 'Towel holder curved' },
  { id: 'roll', naam: 'Roll' },
  { id: 'roll-curved', naam: 'Roll curved' },
] as const
export type PlankExtra = typeof PLANK_EXTRAS[number]['id']

export const HANDDOEKHOUDER_TYPES = ['A', 'B'] as const
export type HanddoekType = typeof HANDDOEKHOUDER_TYPES[number]

export interface KastOpbouw {
  /** Breedtes in mm; één waarde is een vaste maat */
  breedtes: number[]
  /** Dieptes in mm */
  dieptes: number[]
  /** Vaste hoogtes in mm; leeg bij een vrije hoogte binnen `hoogteStaffels` */
  hoogtes?: number[]
  /** Vrije hoogte: staffels in cm zoals in de prijslijst, met de prijs in centen */
  hoogteStaffels?: { min: number; max: number; prijs: number }[]
  /** Prijs per breedte of per hoogte in mm, bij vaste maten */
  prijsPerBreedte?: Record<number, number>
  prijsPerHoogte?: Record<number, number>
  /** Eén vaste prijs */
  prijs?: number
  /** Vast aantal deuren (Stripes: altijd 2). Kiezen kan de dealer niet. */
  deuren?: number
  /**
   * Eén of twee deuren, afhankelijk van de hoogte: LoooX bepaalt dit, de dealer kiest niet.
   * De grens is nog niet bekend (Mark zoekt het uit); tot die tijd tonen we alleen de tekst.
   */
  deurenNaarHoogte?: boolean
  /** In deze kast kan een uitsparing (alleen de toiletmeubels) */
  uitsparing?: boolean
  /** Hoe de voorkant getekend wordt */
  front: 'deuren' | 'open' | 'spiegel'
  /** Valt onder "Opties accessoires": lagere meerprijs voor de houtkleur */
  accessoire?: boolean
}

// Vaste artikelen uit de prijslijst: [artikelnummer, uitvoering, afmeting, netto in centen]
type ArtikelRij = [string, string, string, number]
const ARTIKEL_GROEPEN: { id: string; categorie: MeubelCategorieId; naam: string; omschrijving: string; afbeelding?: string; hout?: boolean; opmerking?: string; varianten: ArtikelRij[] }[] = [
  { id: 'waskom-ceramic', categorie: 'waskommen', naam: 'Ceramic', omschrijving: 'Keramische opzetwaskommen, rond, vierkant of rechthoekig.', varianten: [
    ['WTMWK30W', 'Round Gloss White', 'Ø 30 cm, hoogte 13 cm', 8216],
    ['WTMWK30MW', 'Round Matt White', 'Ø 30 cm, hoogte 13 cm', 13936],
    ['WTMWK30MZ', 'Round Matt Black', 'Ø 30 cm, hoogte 13 cm', 14976],
    ['WTMWK40W', 'Round Gloss White', 'Ø 40 cm, hoogte 15 cm', 9776],
    ['WTMWK40MW', 'Round Matt White', 'Ø 40 cm, hoogte 15 cm', 13416],
    ['WTMWK40MZ', 'Round Matt Black', 'Ø 40 cm, hoogte 15 cm', 14456],
    ['WTMWKQ41W', 'Square Gloss White', '41 × 41 cm, hoogte 14,5 cm', 9776],
    ['WTMWK4940W', 'Rectangle Gloss White', '49 × 40 cm, hoogte 14,5 cm', 11336],
    ['WTMWK4532MW', 'Rectangle Matt White', '45 × 32,5 cm, hoogte 13,5 cm', 12376],
    ['WTMWK4532MZ', 'Rectangle Matt Black', '45 × 32,5 cm, hoogte 13,5 cm', 12376],
    ['WTMWK36MW', 'Waves Round Matt White', 'Ø 36 cm, hoogte 16,5 cm', 18616],
    ['WTMWK36MZ', 'Waves Round Matt Black', 'Ø 36 cm, hoogte 16,5 cm', 18616],
  ] },
  { id: 'waskom-ceramic-raw', categorie: 'waskommen', naam: 'Ceramic Raw', omschrijving: 'Keramische waskommen met een ruwe afwerking.', varianten: [
    ['WTMWK40RO', 'Round Rust', 'Ø 40 cm, hoogte 15 cm', 31096],
    ['WTMWK40LG', 'Round Light Grey', 'Ø 40 cm, hoogte 15 cm', 31096],
    ['WTMWK40DG', 'Round Dark Grey', 'Ø 40 cm, hoogte 15 cm', 31096],
    ['WTMWK40ZW', 'Round Black', 'Ø 40 cm, hoogte 15 cm', 31096],
    ['WTMWK40CA', 'Round Calacatta', 'Ø 40 cm, hoogte 15 cm', 31096],
    ['WTMWKQ41DG', 'Square Dark Grey', '41 × 41 cm, hoogte 15 cm', 31096],
    ['WTMWKQ41LG', 'Square Light Grey', '41 × 41 cm, hoogte 15 cm', 31096],
    ['WTMWK4940DG', 'Rectangle Dark Grey', '49 × 40 cm, hoogte 15 cm', 33176],
    ['WTMWK4940LG', 'Rectangle Light Grey', '49 × 40 cm, hoogte 15 cm', 33176],
  ] },
  { id: 'waskom-ceramic-terrazzo', categorie: 'waskommen', naam: 'Ceramic Terrazzo', omschrijving: 'Ronde keramische waskommen met terrazzo-uitstraling.', varianten: [
    ['WTMWK40TB', 'Terrazzo Beige', 'Ø 40 cm, hoogte 15 cm', 29536],
    ['WTMWK40TG', 'Terrazzo Grey', 'Ø 40 cm, hoogte 15 cm', 29536],
    ['WTMWK40TZW', 'Terrazzo Black', 'Ø 40 cm, hoogte 15 cm', 29536],
  ] },
  { id: 'waskom-ceramic-small', categorie: 'waskommen', naam: 'Ceramic Small', omschrijving: 'Kleine ronde waskommen, Ø 23 cm.', varianten: [
    ['WTMWKS23RO', 'Raw Rust', 'Ø 23 cm, hoogte 13 cm', 23296],
    ['WTMWKS23LG', 'Raw Light Grey', 'Ø 23 cm, hoogte 13 cm', 23296],
    ['WTMWKS23DG', 'Raw Dark Grey', 'Ø 23 cm, hoogte 13 cm', 23296],
    ['WTMWKS23ZW', 'Raw Black', 'Ø 23 cm, hoogte 13 cm', 23296],
    ['WTMWKS23TB', 'Terrazzo Beige', 'Ø 23 cm, hoogte 13 cm', 17576],
    ['WTMWKS23TG', 'Terrazzo Grey', 'Ø 23 cm, hoogte 13 cm', 17576],
    ['WTMWKS23TZW', 'Terrazzo Black', 'Ø 23 cm, hoogte 13 cm', 17576],
    ['WTMWKS23CA', 'Calacatta', 'Ø 23 cm, hoogte 13 cm', 23296],
    ['WTMWKS23MW', 'Matt White', 'Ø 23 cm, hoogte 13 cm', 7696],
    ['WTMWKS23MZ', 'Matt Black', 'Ø 23 cm, hoogte 13 cm', 8216],
    ['WTMWKS23W', 'Gloss White', 'Ø 23 cm, hoogte 13 cm', 5096],
  ] },
  { id: 'waskom-ceramic-high', categorie: 'waskommen', naam: 'Ceramic High', omschrijving: 'Hoge keramische waskom, Ø 41 cm.', varianten: [
    ['WTMWK4129W', 'Gloss White', 'Ø 41 cm, hoogte 29,5 cm', 22776],
    ['WTMWK4129MW', 'Matt White', 'Ø 41 cm, hoogte 29,5 cm', 27976],
    ['WTMWK4129MZ', 'Matt Black', 'Ø 41 cm, hoogte 29,5 cm', 27976],
  ] },
  { id: 'waskom-bronze', categorie: 'waskommen', naam: 'Bronze', omschrijving: 'Metalen waskommen in Bronze of Gun Metal.', varianten: [
    ['WTMWK38BR', 'Bronze', 'Ø 38 cm, hoogte 12 cm', 35256],
    ['WTMWK38GM', 'Gun Metal', 'Ø 38 cm, hoogte 12 cm', 35256],
    ['WTMWK5538BR', 'Bronze', '55 × 38 cm, hoogte 12 cm', 41496],
    ['WTMWK5538GM', 'Gun Metal', '55 × 38 cm, hoogte 12 cm', 41496],
  ] },
  { id: 'waskom-basin-free', categorie: 'waskommen', naam: 'Basin Free', omschrijving: 'Solid Surface waskommen.', varianten: [
    ['TMSWTFR35W', 'Rectangle', '47,5 × 42 cm, hoogte 35 cm', 58136],
    ['TMSMBS425W', 'Rectangle Mini', '42,5 × 22,5 cm, hoogte 8,5 cm', 13416],
  ] },
  { id: 'waskom-mineral-pillar', categorie: 'waskommen', naam: 'Mineral Pillar', omschrijving: 'Vrijstaande zuil, rond of vierkant, 90 cm hoog.', varianten: [
    ['TMMPROUNDGW', 'Round, buiten Gloss White, binnen Gloss White', 'Ø 40 cm, hoogte 90 cm', 37336],
    ['TMMPROUNDMW', 'Round, buiten Matt White, binnen Matt White', 'Ø 40 cm, hoogte 90 cm', 35256],
    ['TMMPROUNDGWLG', 'Round, buiten Matt Light Grey, binnen Gloss White', 'Ø 40 cm, hoogte 90 cm', 41496],
    ['TMMPSQUAREGW', 'Square, buiten Matt White, binnen Matt White', '40 × 40 cm, hoogte 90 cm', 40456],
    ['TMMPSQUAREMW', 'Square, buiten Gloss White, binnen Gloss White', '40 × 40 cm, hoogte 90 cm', 38376],
    ['TMMPSQUAREGWLG', 'Square, buiten Matt Light Grey, binnen Gloss White', '40 × 40 cm, hoogte 90 cm', 44616],
  ] },
  { id: 'organizer', categorie: 'accessoires', naam: 'Organizer', omschrijving: 'Organizer voor in de lade, met magnetische bevestiging.', opmerking: 'Elke Organizer wordt geleverd met 1 Divider.', varianten: [
    ['organizer-m', 'M', 'Maat M', 5096],
    ['organizer-l', 'L', 'Maat L', 5616],
  ] },
  { id: 'divider', categorie: 'accessoires', naam: 'Divider', omschrijving: 'Losse verdeler voor in de Organizer.', varianten: [
    ['divider-m', 'M', 'Maat M', 936],
    ['divider-l', 'L', 'Maat L', 936],
  ] },
  { id: 'wooden-box-facet', categorie: 'accessoires', naam: 'Wooden Box Facet', omschrijving: 'Open houten box, mooi naast de Mirror Cabinet.', hout: true, opmerking: 'De Wooden Box Facet kan alleen besteld worden in de standaardmaat.', varianten: [
    ['wooden-box-facet-20', 'Standaard', 'Breedte 20 cm', 21736],
  ] },
]

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
  {
    id: 'solid-washbasin-solo',
    categorie: 'solid-surface',
    naam: 'Solid Washbasin Solo',
    omschrijving: 'Los Solid Surface blad met ingebouwde waskom, zonder lades.',
    afbeelding: '/images/meubels/model-solid-washbasin-solo.webp',
    diepte: 460,
    hoogte: 90,
    rijen: 1,
    waskom: true,
    zonderLades: true,
    geenHout: true,
    staffels: [
      { min: 71, max: 120, prijzen: { 0: 114296 } },
      { min: 121, max: 140, prijzen: { 0: 138216 } },
      { min: 141, max: 180, prijzen: { 0: 146536 } },
      { min: 181, max: 210, prijzen: { 0: 166296 } },
      { min: 211, max: 260, prijzen: { 0: 180336 } },
    ],
  },
  // ─── Kasten ───────────────────────────────────────────────────────────────
  {
    id: 'mirror-cabinet',
    categorie: 'kasten',
    naam: 'Mirror Cabinet',
    omschrijving: 'Spiegelkast met houten korpus. Verlichting is apart verkrijgbaar.',
    afbeelding: '/images/meubels/model-mirror-cabinet.webp',
    diepte: 140,
    hoogte: 600,
    rijen: 1,
    geenAanvraag: true,
    opmerking: 'De Mirror Cabinet kan alleen besteld worden in de standaardmaten.',
    kast: {
      breedtes: [400, 500, 600, 700, 800], dieptes: [140], hoogtes: [600], front: 'spiegel',
      prijsPerBreedte: { 400: 47736, 500: 49816, 600: 50856, 700: 52936, 800: 59176 },
    },
    staffels: [],
  },
  ...([
    { id: 'cabinet', naam: 'Cabinet', omschrijving: 'Hoge kast met deuren.', front: 'deuren', naarHoogte: true, laag: 130936, hoog: 144456 },
    { id: 'cabinet-regaal', naam: 'Cabinet Regaal', omschrijving: 'Hoge open kast met legplanken.', front: 'open', laag: 109096, hoog: 117416 },
    { id: 'cabinet-facet', naam: 'Cabinet Facet', omschrijving: 'Hoge kast met deuren en facetrand.', front: 'deuren', naarHoogte: true, laag: 140296, hoog: 145496 },
    { id: 'cabinet-facet-regaal', naam: 'Cabinet Facet Regaal', omschrijving: 'Hoge open kast met facetrand en legplanken.', front: 'open', laag: 121576, hoog: 129896 },
    { id: 'cabinet-facet-stripes', naam: 'Cabinet Facet Stripes', omschrijving: 'Hoge kast met gefreesde Stripes-deuren.', front: 'deuren', deuren: 2, laag: 150696, hoog: 168896, geenKleuren: ['white'], opmerking: 'De Cabinet Facet Stripes is alleen met 2 deuren beschikbaar.' },
  ] as const).map((k): MeubelModel => ({
    id: k.id,
    categorie: 'kasten',
    naam: k.naam,
    omschrijving: k.omschrijving,
    afbeelding: `/images/meubels/model-${k.id}.webp`,
    diepte: 300,
    hoogte: 1800,
    rijen: 1,
    geenAanvraag: true,
    ...('geenKleuren' in k && { geenKleuren: [...k.geenKleuren] }),
    opmerking: 'opmerking' in k ? k.opmerking : 'naarHoogte' in k ? 'Deze kast heeft één of twee deuren, afhankelijk van de hoogte. Dat bepaalt LoooX.' : undefined,
    kast: {
      breedtes: [350, 400], dieptes: [250, 300, 350], front: k.front,
      ...('deuren' in k && { deuren: k.deuren }),
      ...('naarHoogte' in k && { deurenNaarHoogte: true }),
      hoogteStaffels: [{ min: 136, max: 175, prijs: k.laag }, { min: 176, max: 225, prijs: k.hoog }],
    },
    staffels: [],
  })),
  {
    id: 'basic-cube-mini',
    categorie: 'toiletmeubels',
    naam: 'Basic Cube Mini',
    omschrijving: 'Compact kastje met open vak aan de zijkant.',
    afbeelding: '/images/meubels/model-basic-cube-mini.webp',
    diepte: 230,
    hoogte: 300,
    rijen: 1,
    geenAanvraag: true,
    opmerking: 'De Basic Cube Mini kan alleen besteld worden in de standaardmaten.',
    kast: {
      breedtes: [395], dieptes: [230], hoogtes: [300, 600], front: 'deuren', accessoire: true, uitsparing: true,
      prijsPerHoogte: { 300: 19656, 600: 26936 },
    },
    staffels: [],
  },
  ...([
    { id: 'cabinet-facet-mini', naam: 'Cabinet Facet Mini', omschrijving: 'Klein hangkastje met facetrand.', prijs: 33696 },
    { id: 'cabinet-facet-stripes-mini', naam: 'Cabinet Facet Stripes Mini', omschrijving: 'Klein hangkastje met gefreesde Stripes-deur.', prijs: 36296, geenKleuren: ['white'] },
  ] as const).map((k): MeubelModel => ({
    id: k.id,
    categorie: 'toiletmeubels',
    naam: k.naam,
    omschrijving: k.omschrijving,
    afbeelding: `/images/meubels/model-${k.id}.webp`,
    // Maten uit de montagehandleiding (425 × 600 × 225); staan niet in de prijslijst
    diepte: 225,
    hoogte: 600,
    rijen: 1,
    geenAanvraag: true,
    ...('geenKleuren' in k && { geenKleuren: [...k.geenKleuren] }),
    opmerking: `De ${k.naam} kan alleen besteld worden in de standaardmaat.`,
    kast: { breedtes: [425], dieptes: [225], hoogtes: [600], front: 'deuren', accessoire: true, uitsparing: true, prijs: k.prijs },
    staffels: [],
  })),
  // ─── Toiletmeubels: plank ─────────────────────────────────────────────────
  {
    id: 'mini-base-shelf',
    categorie: 'toiletmeubels',
    naam: 'Mini Base Shelf',
    omschrijving: 'Smalle plank voor het toilet, met optionele handdoekuitsparing.',
    afbeelding: '/images/meubels/model-mini-base-shelf.webp',
    diepte: 230,
    hoogte: 70,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    accessoireKleur: true,
    opmerking: 'Een handdoekuitsparing is 18 × 3 cm en telt als uitsparing. Is de gewenste diepte groter dan 28 cm, kies dan de Base Shelf.',
    plank: {
      lengte: { min: 300, max: 1250 }, dieptes: [200, 230, 250, 280], diktes: [70], extras: true,
      rijen: [{ maxL: 600, prijzen: [19136] }, { maxL: 1000, prijzen: [25376] }, { maxL: 1250, prijzen: [26936] }],
    },
    staffels: [],
  },
  // ─── Planken ──────────────────────────────────────────────────────────────
  {
    id: 'base-shelf-solo',
    categorie: 'planken',
    naam: 'Base Shelf Solo',
    omschrijving: 'Wastafelplank, met of zonder handdoekhouder.',
    afbeelding: '/images/meubels/model-base-shelf-solo.webp',
    diepte: 460,
    hoogte: 70,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    opmerking: 'Standaard 46 cm diep. Zonder handdoekhouder kan de diepte op maat van 30 tot 50 cm.',
    plank: {
      lengte: { min: 500, max: 2700 }, diepteBereik: { min: 300, max: 500 }, diktes: [70], extras: true,
      handdoekhouder: { prijs: 2600, minDiepte: 460 },
      rijen: [{ maxL: 800, prijzen: [51896] }, { maxL: 1200, prijzen: [54496] }, { maxL: 1600, prijzen: [61256] }, { maxL: 2100, prijzen: [74776] }, { maxL: 2700, prijzen: [86216] }],
    },
    staffels: [],
  },
  {
    id: 'base-shelf-deco',
    categorie: 'planken',
    naam: 'Base Shelf Deco',
    omschrijving: 'Decoratieve plank zonder handdoekhouder.',
    afbeelding: '/images/meubels/model-base-shelf-deco.webp',
    diepte: 410,
    hoogte: 70,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    plank: {
      lengte: { min: 500, max: 2700 }, dieptes: [410], diktes: [70],
      rijen: [{ maxL: 800, prijzen: [50856] }, { maxL: 1200, prijzen: [53456] }, { maxL: 1600, prijzen: [60216] }, { maxL: 2100, prijzen: [73736] }, { maxL: 2700, prijzen: [85176] }],
    },
    staffels: [],
  },
  {
    id: 'niche-shelf',
    categorie: 'planken',
    naam: 'Niche Shelf',
    omschrijving: 'Plank op maat voor in een nis.',
    afbeelding: '/images/meubels/model-niche-shelf.webp',
    diepte: 300,
    hoogte: 30,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    plank: {
      lengte: { min: 100, max: 600 }, diepteBereik: { min: 100, max: 600 }, diktes: [30, 40, 50],
      kolom: { op: 'dikte', grenzen: [30, 40, 50] },
      rijen: [{ maxL: 400, maxD: 400, prijzen: [14456, 15496, 16536] }, { maxL: 600, maxD: 600, prijzen: [19656, 25896, 27976] }],
    },
    staffels: [],
  },
  {
    id: 'wall-shelf-free',
    categorie: 'planken',
    naam: 'Wall Shelf Free',
    omschrijving: 'Zwevende wandplank op maat.',
    afbeelding: '/images/meubels/model-wall-shelf-free.webp',
    diepte: 150,
    hoogte: 30,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    plank: {
      lengte: { min: 200, max: 1600 }, diepteBereik: { min: 100, max: 250 }, diktes: [30, 40],
      kolom: { op: 'diepte', grenzen: [150, 200, 250] },
      rijen: [{ maxL: 800, prijzen: [11856, 12896, 14456] }, { maxL: 1200, prijzen: [15496, 16536, 18096] }, { maxL: 1600, prijzen: [21216, 24856, 28496] }],
    },
    staffels: [],
  },
  {
    id: 'cover',
    categorie: 'planken',
    naam: 'Cover',
    omschrijving: 'Afdekplank op maat, bijvoorbeeld over een inbouwreservoir.',
    afbeelding: '/images/meubels/model-cover.webp',
    diepte: 230,
    hoogte: 40,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    plank: {
      lengte: { min: 200, max: 2250 }, diepteBereik: { min: 100, max: 350 }, diktes: [40, 50, 70],
      rijen: [{ maxL: 1300, maxD: 230, prijzen: [22256] }, { maxL: 2250, maxD: 350, prijzen: [35256] }],
    },
    staffels: [],
  },
  // ─── Waskommen en accessoires: vaste artikelen ────────────────────────────
  ...ARTIKEL_GROEPEN.map((g): MeubelModel => ({
    id: g.id,
    categorie: g.categorie,
    naam: g.naam,
    omschrijving: g.omschrijving,
    afbeelding: `/images/meubels/model-${g.afbeelding ?? g.id}.webp`,
    diepte: 0,
    hoogte: 0,
    rijen: 1,
    zonderLades: true,
    geenAanvraag: true,
    geenHout: !g.hout,
    accessoireKleur: true,
    opmerking: g.opmerking,
    artikel: { varianten: g.varianten.map(([id, naam, afmeting, prijs]) => ({ id, naam, afmeting, prijs })) },
    staffels: [],
  })),
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
  if (model.kast) return { min: Math.min(...model.kast.breedtes), max: Math.max(...model.kast.breedtes) }
  if (model.plank) return model.plank.lengte
  if (model.artikel) return { min: 0, max: 0 }
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
  if (model.kast) return [model.kast.deuren ?? 0]
  if (model.plank || model.artikel) return [0]
  const staffel = findStaffel(model, lengte)
  if (!staffel) return []
  if (model.zonderLades) return [0]
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

/** Houtkleuren die bij dit model te kiezen zijn. Zonder hout blijft alleen de standaard over, zonder meerprijs. */
export function getHoutkleuren(model: MeubelModel): Houtkleur[] {
  if (model.geenHout) return HOUTKLEUREN.filter((k) => k.id === HOUTKLEUR_DEFAULT)
  return HOUTKLEUREN.filter((k) => !model.geenKleuren?.includes(k.id))
}

export const KLEUR_MEERPRIJS_ACCESSOIRE = 2080

/** Meerprijs van de houtkleur in centen netto: accessoires hebben een lagere meerprijs dan meubels. */
export function kleurMeerprijs(model: MeubelModel, kleur: Houtkleur): number {
  return kleur.meerprijs > 0 && (model.kast?.accessoire || model.accessoireKleur) ? KLEUR_MEERPRIJS_ACCESSOIRE : kleur.meerprijs
}

/** Bereik van een vrije kasthoogte in mm, of null bij vaste hoogtes. */
export function getKastHoogteBereik(model: MeubelModel): { min: number; max: number } | null {
  const st = model.kast?.hoogteStaffels
  if (!st || st.length === 0) return null
  return { min: st[0].min * 10, max: st[st.length - 1].max * 10 }
}

/** Gekozen hoogte, of de standaard van het model als de keuze niet (meer) bestaat. */
export function getMeubelHoogte(model: MeubelModel, hoogte?: number | null): number {
  if (hoogte == null || !Number.isInteger(hoogte)) return model.hoogte
  if (model.kast) {
    const bereik = getKastHoogteBereik(model)
    const ok = model.kast.hoogtes?.includes(hoogte) || (bereik !== null && hoogte >= bereik.min && hoogte <= bereik.max)
    return ok ? hoogte : model.hoogte
  }
  if (model.plank) return model.plank.diktes.includes(hoogte) ? hoogte : model.hoogte
  return model.hoogtes?.includes(hoogte) ? hoogte : model.hoogte
}

/** Gekozen diepte bij een kast met meerdere dieptes, anders de diepte van het model. */
export function getMeubelDiepte(model: MeubelModel, diepte?: number | null): number {
  if (diepte == null || !Number.isInteger(diepte)) return model.diepte
  if (model.plank) {
    const b = model.plank.diepteBereik
    return model.plank.dieptes?.includes(diepte) || (b && diepte >= b.min && diepte <= b.max) ? diepte : model.diepte
  }
  return model.kast?.dieptes.includes(diepte) ? diepte : model.diepte
}

/** Netto basisprijs van een plank in centen, of null als de maten niet bestaan. */
export function getPlankPrijs(model: MeubelModel, input: { lengte: number; hoogte?: number; diepte?: number }): number | null {
  const p = model.plank
  if (!p) return null
  const dikte = input.hoogte ?? model.hoogte
  const diepte = input.diepte ?? model.diepte
  if (!Number.isInteger(input.lengte) || input.lengte < p.lengte.min || input.lengte > p.lengte.max) return null
  if (getMeubelDiepte(model, diepte) !== diepte || !p.diktes.includes(dikte)) return null
  // Eerste rij waar lengte en diepte in passen; boven een grens geldt de volgende rij
  const rij = p.rijen.find((r) => input.lengte <= r.maxL && (r.maxD === undefined || diepte <= r.maxD))
  if (!rij) return null
  if (!p.kolom) return rij.prijzen[0] ?? null
  const kolom = p.kolom.op === 'dikte' ? p.kolom.grenzen.indexOf(dikte) : p.kolom.grenzen.findIndex((g) => diepte <= g)
  return kolom < 0 ? null : rij.prijzen[kolom] ?? null
}

/** Artikelnummer uit de prijslijst, of null bij een artikel zonder nummer (Organizer, Divider). */
export function artikelNummer(v: ArtikelVariant): string | null {
  return /^[A-Z0-9]+$/.test(v.id) ? v.id : null
}

export function getArtikelVariant(model: MeubelModel, id?: string | null): ArtikelVariant | null {
  return model.artikel?.varianten.find((v) => v.id === id) ?? null
}

/** Uitvoering van een plank in één regel: handdoekhouders en wat eronder hangt. */
export function plankTekst(o: { handdoekhouders?: number | null; handdoekType?: string | null; extra?: string | null }): string {
  const delen = [
    o.handdoekhouders ? `${o.handdoekhouders} ${o.handdoekhouders === 1 ? 'handdoekhouder' : 'handdoekhouders'} type ${o.handdoekType ?? 'A'}` : '',
    PLANK_EXTRAS.find((e) => e.id === o.extra)?.naam ?? '',
  ].filter(Boolean)
  return delen.length > 0 ? delen.join(' · ') : 'Zonder handdoekhouder'
}

/** Netto basisprijs van een kast in centen, of null als de maten niet bestaan. */
export function getKastPrijs(model: MeubelModel, input: { lengte: number; lades: number; hoogte?: number; diepte?: number }): number | null {
  const k = model.kast
  if (!k) return null
  const hoogte = input.hoogte ?? model.hoogte
  const diepte = input.diepte ?? model.diepte
  if (!k.breedtes.includes(input.lengte) || !k.dieptes.includes(diepte)) return null
  if (getMeubelHoogte(model, hoogte) !== hoogte) return null
  if ((k.deuren ?? 0) !== input.lades) return null
  if (k.prijsPerBreedte) return k.prijsPerBreedte[input.lengte] ?? null
  if (k.prijsPerHoogte) return k.prijsPerHoogte[hoogte] ?? null
  // Zelfde grensregel als bij de lengtestaffels: boven de bovengrens geldt de volgende staffel
  if (k.hoogteStaffels) return k.hoogteStaffels.find((s) => hoogte <= s.max * 10)?.prijs ?? null
  return k.prijs ?? null
}

/** Label van de kleurregel: een los Solid Surface blad heeft geen houtkleur. */
export function kleurLabel(model: MeubelModel): string {
  return model.geenHout && !model.artikel ? 'Materiaal' : 'Houtkleur'
}

/** Wat er in plaats van "Lades" boven de indeling staat. */
export function indelingLabel(model: MeubelModel): string {
  return model.kast || model.plank || model.artikel ? 'Uitvoering' : 'Lades'
}

/** Keuzes die alleen bij een plank of vast artikel horen. */
export interface UitvoeringKeuzes {
  handdoekhouders?: number | null
  handdoekType?: string | null
  extra?: string | null
  variant?: string | null
}

/**
 * Indeling in één regel voor samenvatting, PDF en mail: lades met hun breedtes,
 * of bij een kast het aantal deuren.
 */
export function indelingTekst(model: MeubelModel, lades: number, breedtes: LadeBreedtes, ruimte: number, keuzes: UitvoeringKeuzes = {}): string {
  if (model.artikel) {
    const v = getArtikelVariant(model, keuzes.variant)
    if (!v) return 'Onbekend'
    return artikelNummer(v) ? `${v.naam} · art. ${v.id}` : v.naam
  }
  if (model.plank) return model.plank.handdoekhouder || model.plank.extras ? plankTekst(keuzes) : 'Standaard'
  if (model.kast || model.zonderLades) return ladeLabel(model, lades)
  return `${ladeLabel(model, lades)} · ${ladeBreedtesTekst(breedtes, ruimte, lades)}`
}

/** Kan er een uitsparing of boorgat in dit model? In de hoge kasten en de Mirror Cabinet niet. */
export function kanUitsparing(model: MeubelModel): boolean {
  if (model.artikel) return false
  return !model.kast || model.kast.uitsparing === true
}

/** Is een maattekening nodig om te bestellen? Bij een kast alleen als er uitsparingen in moeten. */
export function tekeningVerplicht(model: MeubelModel, uitsparingen = 0): boolean {
  if (model.artikel) return false
  return !(model.kast || model.plank) || uitsparingen > 0
}

export function ladeLabel(model: MeubelModel, kolommen: number): string {
  if (model.kast) {
    if (model.kast.front === 'open') return 'Open kast'
    if (model.kast.front === 'spiegel') return 'Spiegeldeuren'
    if (model.kast.deurenNaarHoogte) return '1 of 2 deuren, afhankelijk van de hoogte'
    return kolommen === 2 ? '2 deuren' : kolommen === 1 ? '1 deur' : 'Standaard uitvoering'
  }
  if (model.zonderLades) return 'Zonder lades'
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
  /** Gekozen hoogte in mm: bij meubels zonder invloed op de prijs, bij een kast bepaalt hij de staffel */
  hoogte?: number
  /** Gekozen diepte in mm bij een kast met meerdere dieptes; geen invloed op de prijs */
  diepte?: number
  /** Breedte van de regaalkast in mm (Regal-modellen); geen invloed op de prijs, wel op de ladeverdeling */
  regaalBreedte?: number
  /** Waskom in het Solid Surface blad: vorm en aantal, zonder prijsverschil */
  waskomVorm?: WaskomVorm
  waskomAantal?: number
  /** Kastbreedtes bij een duo-model (bepalen daar de prijs); bij andere modellen niet nodig voor de prijs */
  ladeBreedtes?: LadeBreedtes
  /** Plank: aantal handdoekhouders (0 tot 2), het type, en wat eronder hangt */
  handdoekhouders?: number
  handdoekType?: HanddoekType
  extra?: PlankExtra | null
  /** Vast artikel: het artikelnummer van de gekozen uitvoering */
  variant?: string
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
  if (uitsparingen > 0 && !kanUitsparing(model)) return null
  const houders = input.handdoekhouders ?? 0
  if (houders !== 0) {
    const h = model.plank?.handdoekhouder
    // Met een handdoekhouder moet de plank diep genoeg zijn
    if (!h || !Number.isInteger(houders) || houders < 0 || houders > 2 || (input.diepte ?? model.diepte) < h.minDiepte) return null
  }
  if (input.extra != null && (!model.plank?.extras || !PLANK_EXTRAS.some((e) => e.id === input.extra))) return null
  const basis = model.artikel
    ? getArtikelVariant(model, input.variant)?.prijs ?? null
    : model.plank
    ? getPlankPrijs(model, input)
    : model.kast
    ? getKastPrijs(model, input)
    : model.duo
    ? getDuoPrijs(model, input.ladeBreedtes)
    : getLadeOpties(model, input.lengte, getRegaalBreedte(model, input.regaalBreedte)).includes(input.lades)
      ? findStaffel(model, input.lengte)?.prijzen[input.lades] ?? null
      : null
  if (basis === null) return null
  return basis + kleurMeerprijs(model, kleur) + uitsparingen * UITSPARING_NETTO_CENTS + houders * (model.plank?.handdoekhouder?.prijs ?? 0)
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
  if (kleurMeerprijs(model, kleur) > 0) extra.push({ label: `Houtkleur · ${kleur.naam}`, cents: Math.round(kleurMeerprijs(model, kleur) * f) })
  const uitsparingen = input.uitsparingen ?? 0
  if (uitsparingen > 0) extra.push({ label: `Uitsparing · ${uitsparingen}×`, cents: Math.round(uitsparingen * UITSPARING_NETTO_CENTS * f) })
  const houders = input.handdoekhouders ?? 0
  if (houders > 0) extra.push({ label: `Handdoekhouder · ${houders}×`, cents: Math.round(houders * (model.plank?.handdoekhouder?.prijs ?? 0) * f) })
  const basis = totaal - extra.reduce((som, r) => som + r.cents, 0)
  return {
    regels: [{
      label: model.artikel
        ? `${model.naam} · ${getArtikelVariant(model, input.variant)?.naam ?? ''}`
        : model.plank
        ? `${model.naam} · ${input.lengte} × ${getMeubelDiepte(model, input.diepte)} mm`
        : model.kast
        ? `${model.naam} · B ${input.lengte} × H ${getMeubelHoogte(model, input.hoogte)} mm`
        : `${model.naam} ${input.lengte} mm · ${ladeLabel(model, input.lades)}`,
      cents: basis,
    }, ...extra],
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
  if (lades < 1) return []
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
  const kastModel = getMeubelModel(c.modelId)
  if (kastModel?.kast || kastModel?.plank || kastModel?.artikel) {
    // Geen lades, lengtestaffel of aanvraag: alleen de maten en uitvoeringen uit de prijslijst
    if (c.opAanvraag || c.ladeBreedtes !== null) return 'Dit product bestaat alleen in de maten uit de prijslijst.'
    const h = kastModel.plank?.handdoekhouder
    if (h && (c.handdoekhouders ?? 0) > 0 && (c.diepte ?? kastModel.diepte) < h.minDiepte) return `Met een handdoekhouder is de plank minimaal ${h.minDiepte} mm diep.`
    if (calcMeubelNettoCents(c) === null) return 'Deze combinatie van maten, uitvoering en houtkleur bestaat niet.'
    const u = c.uitsparingen ?? 0
    if (u > 0 && !kanUitsparing(kastModel)) return 'In dit product kan geen uitsparing.'
    if (!Number.isInteger(u) || u < 0 || u > UITSPARING_MAX) return `Uitsparingen: 0 tot ${UITSPARING_MAX}.`
    if (!Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > MEUBEL_AANTAL_MAX) return `Aantal moet tussen 1 en ${MEUBEL_AANTAL_MAX} liggen.`
    return null
  }
  if (c.opAanvraag) {
    const model = getMeubelModel(c.modelId)
    if (!model || model.geenAanvraag || !getHoutkleuren(model).some((k) => k.id === c.houtkleur)) return 'Dit model of deze houtkleur bestaat niet.'
    const bereik = getAanvraagBereik(model)
    if (!Number.isInteger(c.lengte) || c.lengte < bereik.min || c.lengte > bereik.max) return `Op aanvraag kan van ${bereik.min} tot ${bereik.max} mm.`
    if (model.zonderLades ? c.lades !== 0 : !getAanvraagLadeOpties(ladeRuimte(model, c.lengte, getRegaalBreedte(model, c.regaalBreedte))).includes(c.lades)) return 'Dit aantal lades past niet bij deze lengte.'
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
  if (model.zonderLades && c.ladeBreedtes !== null) return 'Dit model heeft geen lades.'
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
  if (model.artikel) return model.afmetingTekst ?? ''
  if (model.kast) return `B ${lengte} × H ${model.hoogte} × D ${model.diepte} mm`
  if (model.plank) return `L ${lengte} × D ${model.diepte} × dikte ${model.hoogte} mm`
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
