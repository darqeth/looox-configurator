# Tekenmodule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De dealer zet gaten (sifon, kraan) en Solid Surface kommen op het bovenaanzicht van een Tailor-Made meubel; prijs en PDF volgen uit die tekening.

**Architecture:** Gaten zijn gegevens in `selected_options.meubel.gaten`. Eén zuivere module (`src/lib/meubel-gaten.ts`) kent maten, snappunten, validatie en telling; scherm (SVG), PDF (react-pdf SVG) en server gebruiken dezelfde functies. Geen databasewijziging.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4 (`lx-`tokens), @react-pdf/renderer, zod, Playwright (`npx playwright test tests/<bestand>`).

**Spec:** `docs/superpowers/specs/2026-11-13-teken-module-design.md`

## Global Constraints

- Maten in mm. X vanaf links, Y vanaf de achterkant, naar het hart van het gat.
- Hout en planken: rand gat minstens 30 mm van elke bladrand en 30 mm van een ander gat.
- Diameters: sifon 30 tot 100 (standaard 45), kraan hout 20 tot 60 (standaard 35), kraan bij kom 20 tot 40 (standaard 34).
- Kraangat bij kom: Y vast 45,5; X van hart kom tot 50 mm voorbij de rand van de kom; rand gat minstens 30 mm van de zijkanten.
- Kommen (zichtmaat): rechthoekig 500 x 298 en 850 x 298, radius 52; ovaal voorlopig 500 x 298; hart 240 uit de achterkant; afvoer Ø50. Lade minstens 150 mm breder dan de kom.
- Maximaal 10 betaalde uitsparingen (`UITSPARING_MAX`). Een kom is niet betaald.
- Bestaande configuraties zonder `tekenwijze` gelden als `'upload'` en blijven ongewijzigd werken.
- UI-teksten Nederlands, zonder koppelstreep (geen em-dash).
- Niet pushen zonder sein van Mark. Commit-berichten eindigen met `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Geen echte bestelling plaatsen bij testen (verstuurt mail). Testgegevens opruimen.

## Review Focus

1. Lengte of aantal lades wijzigen nadat gaten zijn gezet: gaten die niet meer passen vervallen met een melding; er blijft nooit een ongeldig gat opgeslagen. (Taak 1: `herzieGaten`; taak 5.)
2. Oude configuratie openen (geüploade tekening, teller 2, geen `tekenwijze`): teller, prijs en bijlage blijven gelijk. (Taak 2.)
3. Client stuurt bij `tekenwijze: 'module'` een eigen `uitsparingen`: de server negeert die en telt zelf. (Taak 2.)
4. Solid Surface met 2 kommen gekozen en 1 geplaatst: bestellen geblokkeerd, opslaan mag. (Taak 2 en 5.)
5. Getypte waarde buiten de grenzen (Ø 500, X buiten het blad, leeg veld): wordt binnen de grenzen gehouden, geen NaN in de opslag. (Taak 1: `klemGat`; taak 4.)

---

### Task 1: Rekenmodule voor gaten

**Files:**
- Create: `src/lib/meubel-gaten.ts`
- Test: `tests/meubel-gaten.spec.ts`

**Interfaces (Produces):**

```ts
export type Gat =
  | { soort: 'sifon'; vak: number; y: number; d: number }
  | { soort: 'kraan'; x: number; y: number; d: number }
  | { soort: 'kom'; vak: number }
  | { soort: 'kraan-kom'; vak: number; dx: number; d: number }
export type Tekenwijze = 'module' | 'upload'
export type GatenSoort = 'hout' | 'solid'
export type KomMaat = 500 | 850
export const GAT = { rand: 30, tussen: 30, sifon: { min: 30, max: 100, std: 45 }, kraan: { min: 20, max: 60, std: 35 },
  komKraan: { min: 20, max: 40, std: 34, y: 45.5, voorbij: 50 }, komMarge: 150 } as const
export interface Kom { b: number; d: number; cy: number; radius: number; afvoer: number; ovaal: boolean }
export function getKom(vorm: WaskomVorm, maat?: KomMaat | null): Kom
/** Blad in mm met de snapvakken van links naar rechts (alleen lades; regaal telt niet). */
export interface Blad { lengte: number; diepte: number; vakken: { x0: number; x1: number }[] }
export function gatenSoort(model: MeubelModel): GatenSoort | null
export function maakBlad(o: { model: MeubelModel; lengte: number; diepte: number; breedtes: number[];
  regaal?: { breedte: number; zijde: 'links' | 'rechts' | 'midden' } | null }): Blad
/** Snappunten: hart X per vak. Met `kom`: alleen vakken waar die kom past. */
export function snappunten(blad: Blad, kom?: Kom | null): { vak: number; x: number }[]
/** Hoeveel kommen van deze maat passen (0, 1 of 2). */
export function komMax(blad: Blad, kom: Kom): 0 | 1 | 2
export interface GatenContext { soort: GatenSoort; blad: Blad; kom: Kom | null; komAantal: number }
/** Absolute plaats; null als het vak niet (meer) bestaat. */
export function plaatsGat(g: Gat, c: GatenContext): { x: number; y: number; d: number; b?: number; h?: number } | null
/** Houdt maat en plaats van één gat binnen de grenzen (afronden op hele mm, 45,5 blijft). */
export function klemGat(g: Gat, c: GatenContext): Gat
export function valideerGaten(gaten: Gat[], c: GatenContext): string | null
export function herzieGaten(gaten: Gat[], c: GatenContext): { gaten: Gat[]; vervallen: number }
export function betaaldeGaten(gaten: Gat[]): number
export function kommenCompleet(gaten: Gat[], c: GatenContext): boolean
export function startGaten(c: GatenContext): Gat[]
```

Regels die de tests niet vanzelf vastleggen:
- `gatenSoort`: `'solid'` als `model.waskom`; `null` voor `artikel`, ids `facet-deco`, `block`, `niche-shelf`, `wall-shelf-free`, `cover`, en elke `kast` zonder `kast.uitsparing`; anders `'hout'`.
- `maakBlad`: vakken uit `breedtes` binnen `model.rand`, regaal op zijn zijde overgeslagen. Geen lades (`zonderLades`, plank, kast): één vak over de hele lengte; vanaf 1200 mm lengte bij `'hout'` drie vakken (derden); bij Solid Washbasin Solo twee vakken (helften) als `komMax` dat toelaat, anders één.
- `valideerGaten`: weigert onbekende soort voor de context (kom bij hout, sifon bij solid), dubbel vak, `kraan-kom` zonder kom in dat vak, meer kommen dan `komAantal`, meer dan 10 betaalde gaten, en elke schending van de Global Constraints.
- `herzieGaten`: laat geldige gaten staan, klemt Y en diameter, verwijdert de rest en telt die.
- `startGaten`: solid met precies één snappunt en `komAantal` 1 geeft `[{ soort: 'kom', vak: 0 }]`, anders `[]`.

- [ ] **Step 1: Schrijf de falende tests** in `tests/meubel-gaten.spec.ts` (zelfde stijl als `tests/meubel-pricing.spec.ts`):

```ts
const facet = getMeubelModel('facet')!, solid = getMeubelModel('solid-facet')!
const hout = (lengte: number, breedtes: number[]): GatenContext =>
  ({ soort: 'hout', blad: maakBlad({ model: facet, lengte, diepte: facet.diepte, breedtes }), kom: null, komAantal: 0 })

test('snappunten: hart van elke lade', () => {
  expect(snappunten(hout(1800, [600, 600, 600]).blad).map((s) => s.x)).toEqual([300, 900, 1500])
})
test('sifon te dicht op de achterrand wordt geweigerd', () => {
  expect(valideerGaten([{ soort: 'sifon', vak: 0, y: 40, d: 45 }], hout(1200, [600, 600]))).not.toBeNull()
})
test('rand precies 30 mm is goed', () => {
  expect(valideerGaten([{ soort: 'kraan', x: 50, y: 50, d: 40 }], hout(1200, [600, 600]))).toBeNull()
})
test('twee gaten dichter dan 30 mm op elkaar', () => {
  expect(valideerGaten([{ soort: 'kraan', x: 300, y: 100, d: 35 }, { soort: 'kraan', x: 360, y: 100, d: 35 }], hout(1200, [600, 600]))).not.toBeNull()
})
test('klemGat houdt diameter en plaats binnen de grenzen', () => {
  const g = klemGat({ soort: 'kraan', x: -50, y: 9999, d: 500 }, hout(1200, [600, 600]))
  expect(g).toEqual({ soort: 'kraan', x: 60, y: facet.diepte - 60, d: 60 })
  expect(klemGat({ soort: 'kraan', x: NaN, y: NaN, d: NaN }, hout(1200, [600, 600]))).toEqual({ soort: 'kraan', x: 600, y: Math.round(facet.diepte / 2), d: 35 })
})
test('kom 500 past boven een lade van 650, niet van 640', () => {
  const kom = getKom('vierkant', 500)
  expect(komMax(maakBlad({ model: solid, lengte: 1300, diepte: 460, breedtes: [650, 650] }), kom)).toBe(2)
  expect(komMax(maakBlad({ model: solid, lengte: 1280, diepte: 460, breedtes: [640, 640] }), kom)).toBe(0)
})
test('kom 850 vraagt een lade van 1000', () => {
  expect(komMax(maakBlad({ model: solid, lengte: 1000, diepte: 460, breedtes: [1000] }), getKom('vierkant', 850))).toBe(1)
})
test('kraangat bij kom: vaste Y, X tot 50 mm voorbij de kom', () => {
  const c: GatenContext = { soort: 'solid', blad: maakBlad({ model: solid, lengte: 800, diepte: 460, breedtes: [800] }), kom: getKom('vierkant', 500), komAantal: 1 }
  expect(plaatsGat({ soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, c)).toEqual({ x: 400, y: 45.5, d: 34 })
  expect(klemGat({ soort: 'kraan-kom', vak: 0, dx: 900, d: 80 }, c)).toEqual({ soort: 'kraan-kom', vak: 0, dx: 300, d: 40 })
  expect(valideerGaten([{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }], c)).toBeNull()
})
test('herzieGaten: gat in vervallen vak verdwijnt, de rest blijft', () => {
  const r = herzieGaten([{ soort: 'sifon', vak: 0, y: 240, d: 45 }, { soort: 'sifon', vak: 2, y: 240, d: 45 }], hout(1200, [600, 600]))
  expect(r).toEqual({ gaten: [{ soort: 'sifon', vak: 0, y: 240, d: 45 }], vervallen: 1 })
})
test('kom telt niet als betaalde uitsparing', () => {
  expect(betaaldeGaten([{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }, { soort: 'sifon', vak: 0, y: 200, d: 45 }])).toBe(2)
})
test('kommenCompleet: 2 gekozen, 1 geplaatst is niet compleet', () => {
  const c: GatenContext = { soort: 'solid', blad: maakBlad({ model: solid, lengte: 1400, diepte: 460, breedtes: [700, 700] }), kom: getKom('vierkant', 500), komAantal: 2 }
  expect(kommenCompleet([{ soort: 'kom', vak: 0 }], c)).toBe(false)
  expect(kommenCompleet([{ soort: 'kom', vak: 0 }, { soort: 'kom', vak: 1 }], c)).toBe(true)
})
test('gatenSoort per model', () => {
  expect(gatenSoort(getMeubelModel('facet-deco')!)).toBeNull()
  expect(gatenSoort(getMeubelModel('solid-base-drawer-box')!)).toBe('hout')
  expect(gatenSoort(getMeubelModel('mini-base-shelf')!)).toBe('hout')
  expect(gatenSoort(getMeubelModel('niche-shelf')!)).toBeNull()
  expect(gatenSoort(getMeubelModel('mirror-cabinet')!)).toBeNull()
  expect(gatenSoort(solid)).toBe('solid')
})
```

Controleer bij het schrijven de werkelijke `rand` en `diepte` van `facet` en `solid-facet` in `meubel-config.ts` en pas de verwachte X-waarden daarop aan (de test gaat uit van rand 0).

- [ ] **Step 2:** `npx playwright test tests/meubel-gaten.spec.ts` → FAIL (module bestaat niet).
- [ ] **Step 3:** Implementeer `src/lib/meubel-gaten.ts` volgens het Interfaces-blok.
- [ ] **Step 4:** Zelfde commando → PASS. `npx tsc --noEmit` schoon.
- [ ] **Step 5:** Commit `feat: rekenmodule voor gaten in het blad`.

### Task 2: Opslag, prijs en serverregels

**Files:**
- Modify: `src/lib/meubel-config.ts` (`MeubelInput`, `MeubelConfig`, `tekeningVerplicht`, `calcMeubelNettoCents`, `getMeubelPrijsOpbouw`, `valideerMeubelConfig`, `meubelOptiesTekst`, `waskomTekst`, opmerking Mini Base Shelf)
- Modify: `src/lib/meubel-opslag.ts` (`OpgeslagenMeubel`, `leesMeubel`, `meubelConfigVan`-achtige helper op regel 129)
- Modify: `src/lib/actions/meubel.ts` (schema, `bouwRij`, nieuwe actie)
- Test: `tests/meubel-pricing.spec.ts`

**Interfaces:**
- Consumes: alles uit taak 1.
- Produces:
  - `MeubelInput` krijgt `gaten?: Gat[]`, `tekenwijze?: Tekenwijze`, `waskomMaat?: KomMaat`, `handdoekUitsparing?: boolean`.
  - `export function gatenContext(c: MeubelInput & { ladeBreedtes?: LadeBreedtes; regaalZijde?: ... }): GatenContext | null` in `meubel-config.ts` (null als `gatenSoort` null is).
  - `export function telUitsparingen(c: MeubelInput): number`: bij `tekenwijze === 'module'` `betaaldeGaten(gaten)`, anders `c.uitsparingen ?? 0`; plus 1 als `handdoekUitsparing` en het model `mini-base-shelf` is. Alle prijsfuncties gebruiken dit in plaats van `input.uitsparingen`.
  - `tekeningVerplicht(model, o: { tekenwijze?: Tekenwijze; uitsparingen: number; kommenCompleet: boolean }): boolean`: module en solid → `!kommenCompleet`; module en hout → `false`; upload → huidige regel, behalve dat hout zonder uitsparingen niet meer verplicht is (`uitsparingen > 0`), en solid altijd.
  - `OpgeslagenMeubel` krijgt `gaten: Gat[]`, `tekenwijze: Tekenwijze`, `waskomMaat: KomMaat | null`, `handdoekUitsparing: boolean`; `uitsparingen` is daar het getelde aantal. `tekeningOntbreekt` volgt de nieuwe `tekeningVerplicht`.
  - `export async function setMeubelGaten(configId: string, gaten: Gat[]): Promise<{ error?: string }>` in `actions/meubel.ts`: zelfde toegangs- en statuscontroles als `setMeubelTekening`, valideert met `valideerGaten`, zet `tekenwijze: 'module'`, `gaten`, verwijdert `attachmentUrl`, herberekent de prijsvelden zoals `bouwRij` doet.
- Zod: `gaten` als discriminated union met `.max(20)`, getallen `z.number().finite()`; `tekenwijze` enum; `waskomMaat` `z.union([z.literal(500), z.literal(850)])`; `handdoekUitsparing` boolean.
- `valideerMeubelConfig`: bij `tekenwijze === 'module'` → `valideerGaten`; `waskomMaat` 850 alleen bij `waskomVorm === 'vierkant'`; `komMax` moet minstens `waskomAantal` zijn; `handdoekUitsparing` alleen bij `mini-base-shelf`.
- `bouwRij`: bij module `uitsparingen` overschrijven met `betaaldeGaten`, `attachmentUrl` leeg; bij upload `gaten` weglaten.
- Teksten: `meubelOptiesTekst` → `"2 uitsparingen (volgens tekening)"`; `waskomTekst` → `"1 waskom, rechthoekig 850"` en bij upload de toevoeging `(plaats volgens maattekening)`; weergavenaam van `vierkant` wordt `Rechthoekig` (id blijft). Opmerking Mini Base Shelf: `"Een handdoekuitsparing is 18 × 3 cm en zit in de voorkant. Is de gewenste diepte groter dan 28 cm, kies dan de Base Shelf."`

- [ ] **Step 1: Falende tests** toevoegen aan `tests/meubel-pricing.spec.ts`:

```ts
test('module: prijs telt de getekende gaten, niet de meegestuurde teller', () => {
  const basis = { modelId: 'facet', lengte: 1200, lades: 2, houtkleur: 'black' }
  const met = calcMeubelNettoCents({ ...basis, tekenwijze: 'module', uitsparingen: 9,
    gaten: [{ soort: 'sifon', vak: 0, y: 240, d: 45 }, { soort: 'kraan', x: 300, y: 80, d: 35 }] })!
  expect(met - calcMeubelNettoCents(basis)!).toBe(2 * UITSPARING_NETTO_CENTS)
})
test('upload zonder tekenwijze: teller telt zoals voorheen', () => {
  const basis = { modelId: 'facet', lengte: 1200, lades: 2, houtkleur: 'black' }
  expect(calcMeubelNettoCents({ ...basis, uitsparingen: 2 })! - calcMeubelNettoCents(basis)!).toBe(2 * UITSPARING_NETTO_CENTS)
})
test('kom kost niets, kraangat bij de kom wel', () => {
  const basis = { modelId: 'solid-facet', lengte: 800, lades: 1, houtkleur: 'black', waskomVorm: 'vierkant' as const, waskomAantal: 1, tekenwijze: 'module' as const }
  const kom = calcMeubelNettoCents({ ...basis, gaten: [{ soort: 'kom', vak: 0 }] })!
  const metKraan = calcMeubelNettoCents({ ...basis, gaten: [{ soort: 'kom', vak: 0 }, { soort: 'kraan-kom', vak: 0, dx: 0, d: 34 }] })!
  expect(metKraan - kom).toBe(UITSPARING_NETTO_CENTS)
})
test('handdoekuitsparing telt als één uitsparing, alleen bij de Mini Base Shelf', () => { /* prijsverschil 1 × UITSPARING_NETTO_CENTS; valideerMeubelConfig weigert hem bij facet */ })
test('tekeningVerplicht', () => {
  const hout = getMeubelModel('facet')!, solid = getMeubelModel('solid-facet')!
  expect(tekeningVerplicht(hout, { tekenwijze: 'module', uitsparingen: 2, kommenCompleet: true })).toBe(false)
  expect(tekeningVerplicht(hout, { uitsparingen: 0, kommenCompleet: true })).toBe(false)
  expect(tekeningVerplicht(hout, { uitsparingen: 1, kommenCompleet: true })).toBe(true)
  expect(tekeningVerplicht(solid, { tekenwijze: 'module', uitsparingen: 0, kommenCompleet: false })).toBe(true)
  expect(tekeningVerplicht(solid, { tekenwijze: 'module', uitsparingen: 0, kommenCompleet: true })).toBe(false)
  expect(tekeningVerplicht(solid, { uitsparingen: 0, kommenCompleet: false })).toBe(true)
})
test('850 alleen rechthoekig en alleen als hij past', () => { /* valideerMeubelConfig: ovaal+850 fout; vierkant 850 op lengte 900 fout; op 1000 met 1 lade goed */ })
test('leesMeubel: oude configuratie blijft upload met eigen teller', () => { /* selected_options zonder tekenwijze, uitsparingen 2, attachmentUrl gezet → tekenwijze 'upload', uitsparingen 2, tekeningOntbreekt false */ })
```

Pas de bestaande tests aan die `tekeningVerplicht(model, n)` met de oude signatuur aanroepen. Let op: een houten meubel zonder uitsparingen had vroeger een verplichte tekening; die verwachting verandert bewust.

- [ ] **Step 2:** `npx playwright test tests/meubel-pricing.spec.ts tests/meubel-gaten.spec.ts` → nieuwe tests FAIL.
- [ ] **Step 3:** Implementeer. Werk alle aanroepers van `tekeningVerplicht`, `waskomTekst` en `meubelOptiesTekst` bij (`grep -rn` in `src`).
- [ ] **Step 4:** Tests PASS, `npx tsc --noEmit` schoon, `npx playwright test tests/project.spec.ts tests/order-pricing.spec.ts` blijft groen.
- [ ] **Step 5:** Commit `feat: gaten in opslag, prijs en serverregels`.

### Task 3: Bovenaanzicht op scherm en in de PDF

**Files:**
- Modify: `src/lib/meubel-tekening.ts` (vervang `tekenWaskommen`)
- Modify: `src/app/(main)/configurator/meubel/meubel-tekening.tsx`
- Modify: `src/lib/pdf/meubel-document.tsx`
- Modify: `src/lib/pdf/render-order.ts`, `src/lib/pdf/render-offerte.ts` (bijlage alleen bij upload)
- Test: `tests/meubel-gaten.spec.ts`

**Interfaces:**
- Consumes: `GatenContext`, `plaatsGat`, `getKom`, `snappunten`.
- Produces in `meubel-tekening.ts`:

```ts
export interface TekenGat { soort: Gat['soort']; index: number; x: number; y: number; d: number; b?: number; h?: number; radius?: number; ovaal?: boolean; afvoer?: number }
/** Alle gaten met absolute maten in mm, klaar om te tekenen; kommen eerst. */
export function tekenGaten(gaten: Gat[], c: GatenContext): TekenGat[]
/** Kommen "plaats indicatief" voor de uploadroute: gelijk verdeeld, zoals de oude tekenWaskommen. */
export function tekenKommenIndicatief(c: GatenContext): TekenGat[]
/** Regels voor de tabel: soort als tekst, X, Y en maat. */
export function gatenTabel(gaten: Gat[], c: GatenContext): { soort: string; x: string; y: string; maat: string }[]
```

- Bovenaanzicht tonen als `gatenSoort(model)` niet null is (nu: alleen `categorie === 'solid-surface'`). Achterkant boven. Ladevakken als stippellijnen.
- Maatlijnen: per gat X (vanaf links) onder het blad en Y (vanaf de achterkant) rechts; bij meer dan 4 gaten alleen nummers in de tekening en de maten in de tabel.
- Onderschrift: module → `Bovenaanzicht`; upload bij solid → `Bovenaanzicht, plaats waskom indicatief`.
- PDF: tabel `Uitsparingen` (kolommen Nr, Soort, X, Y, Maat) onder de tekening als er gaten zijn. Bijlagepagina en `haalPdfBijlage` alleen als `tekenwijze === 'upload'`. Geen "tekening ontbreekt" bij module.
- Soortnamen: `Sifongat`, `Kraangat`, `Waskom rechthoekig 500`, `Waskom ovaal`. Maat: `Ø 45` of `500 × 298`.

- [ ] **Step 1: Falende test:**

```ts
test('gatenTabel geeft maten in mm', () => {
  const c = hout(1200, [600, 600])
  expect(gatenTabel([{ soort: 'sifon', vak: 1, y: 240, d: 45 }], c)).toEqual([{ soort: 'Sifongat', x: '900', y: '240', maat: 'Ø 45' }])
})
test('tekenKommenIndicatief verdeelt twee kommen over de lengte', () => { /* x = lengte/4 en 3·lengte/4 */ })
```

- [ ] **Step 2:** FAIL. **Step 3:** Implementeer lib, schermtekening en PDF. **Step 4:** tests PASS, tsc schoon.
- [ ] **Step 5:** Render een voorbeeld-PDF zonder bestelling: script `.tmp/gaten-pdf.ts` dat `renderOfferteBuffer` of het `MeubelDocument` aanroept met een verzonnen meubel (hout met 3 gaten, solid met 2 kommen en kraangaten), schrijft naar `$OUT_DIR`, en bekijk de PNG of PDF. Verwacht: gaten op de juiste plek, maatlijnen leesbaar, tabel klopt, geen bijlagepagina.
- [ ] **Step 6:** Commit `feat: bovenaanzicht met gaten op scherm en in de PDF`.

### Task 4: Tekenvenster

**Files:**
- Create: `src/app/(main)/configurator/meubel/gaten-editor.tsx` (client)

**Interfaces:**
- Consumes: taak 1 volledig, `tekenGaten`.
- Produces: `export default function GatenEditor(p: { context: GatenContext; gaten: Gat[]; onChange: (g: Gat[]) => void; onSluiten: () => void; titel: string; prijsPerStuk: string | null }): JSX.Element` als modal in dezelfde stijl als de bestaande modals in `meubel-configurator.tsx`.

Gedrag:
- Legenda links (mobiel: boven): hout `Sifongat`, `Kraangat`; solid `Waskom`, `Kraangat`. Eén soort is actief.
- SVG op schaal, `viewBox` in mm, achterkant boven met label `Achterkant` en `Voorkant`.
- Lege snappunten als bolletje (`r` 14 mm, aanraakvlak minstens 44 px). Klik plaatst het actieve soort: sifon met `GAT.sifon.std` en Y op `kom.cy` (240) of binnen de randregel; kom op dat vak. Solid kraangat: klik op een geplaatste kom voegt `kraan-kom` toe met `dx: 0`.
- Hout kraangat: klik op het blad plaatst het daar (via `klemGat`).
- Elke wijziging gaat door `klemGat`; een plaatsing die `valideerGaten` afkeurt wordt niet doorgevoerd en toont de melding onder de tekening (`role="alert"`).
- Slepen met pointer events (`setPointerCapture`); sifon alleen in Y, `kraan-kom` alleen in X, kom versleep je niet (klik op een ander snappunt verplaatst hem).
- Velden onder de tekening voor het geselecteerde gat: `Diameter`, `X vanaf links`, `Y vanaf achterkant` waar vrij; `inputMode="numeric"`; toepassen bij blur en Enter. Knop `Verwijderen`.
- Toetsenbord: gat focusbaar (`tabIndex=0`, `aria-label` met soort en maten), pijltjes 1 mm, met Shift 10 mm, Delete verwijdert.
- Voet: `2 uitsparingen · € … per stuk` (of zonder prijs bij op aanvraag), bij solid `1 van 2 waskommen geplaatst`. Knop `Klaar`.
- Teksten zonder koppelstreep.

- [ ] **Step 1:** Bouw het component.
- [ ] **Step 2:** `npx tsc --noEmit` en `npx eslint` op het bestand schoon.
- [ ] **Step 3:** Commit `feat: tekenvenster voor gaten`. (Gedrag wordt in taak 5 in de browser getest; los is het component niet bereikbaar.)

### Task 5: Configurator

**Files:**
- Modify: `src/app/(main)/configurator/meubel/meubel-configurator.tsx`
- Modify: `src/app/(main)/configurator/[id]/page.tsx` (startwaarden doorgeven)
- Create: `.tmp/gaten-e2e.mjs`

**Interfaces:**
- Consumes: `GatenEditor`, `gatenContext`, `herzieGaten`, `startGaten`, `komMax`, `kommenCompleet`, `telUitsparingen`.
- `MeubelInitialConfig` krijgt `gaten`, `tekenwijze`, `waskomMaat`, `handdoekUitsparing`.

Gedrag:
- State `gaten`, `tekenwijze` (nieuw meubel: `'module'` als `gatenSoort` niet null is, anders `'upload'`; bestaand: uit de opslag), `waskomMaat`, `handdoekUitsparing`.
- Het blok op regel 1046 tot 1110 (opties en maattekening): bij een model met tekenmodule twee keuzeknoppen `Zelf tekenen` en `Eigen tekening uploaden`.
  - Zelf tekenen: knop `Gaten tekenen` of `Tekening aanpassen` opent `GatenEditor`; eronder een samenvatting (`2 uitsparingen`, bij solid `2 van 2 waskommen geplaatst`). Geen teller.
  - Uploaden: de huidige teller en het uploadveld.
  - Wisselen terwijl de andere route gevuld is: bevestiging `Je tekening vervalt als je een eigen tekening uploadt. Doorgaan?` en omgekeerd.
- Modellen zonder tekenmodule: ongewijzigd.
- Solid: naast vorm en aantal een keuze `Maat` (`500`, `850`) als de vorm rechthoekig is. Opties die niet passen (`komMax`) zijn disabled met de uitleg `Past niet boven deze lades. De lade moet minstens 15 cm breder zijn dan de waskom.` Past de huidige keuze niet meer na een maatwijziging, val terug op wat wel past.
- Mini Base Shelf: schakelaar `Handdoekuitsparing` bij de opties, met de prijs per stuk.
- Na elke wijziging van lengte, diepte, lades, ladebreedtes, regaal, waskomvorm, maat of aantal: `herzieGaten`; bij `vervallen > 0` toast `1 gat paste niet meer en is verwijderd.` (meervoud: `2 gaten pasten niet meer en zijn verwijderd.`). Bij solid daarna `startGaten` als er geen kom staat.
- Prijsopbouw en samenvatting gebruiken `telUitsparingen`.
- `tekeningOntbreekt` volgt de nieuwe `tekeningVerplicht`; de melding bij solid in modulemodus is `Plaats eerst de waskom in de tekening.`
- De tekening in de configurator (`MeubelTekening`) krijgt de gaten mee.
- Payload naar `saveMeubelConfiguration` en `updateMeubelConfiguration` bevat de vier nieuwe velden.

- [ ] **Step 1:** Implementeer.
- [ ] **Step 2:** tsc en eslint schoon; `npx playwright test tests/meubel-pricing.spec.ts tests/meubel-gaten.spec.ts` groen.
- [ ] **Step 3:** E2E `.tmp/gaten-e2e.mjs` (patroon van `.tmp/ai-hulpje-e2e.mjs`, dev-server `looox-dev`, testaccount uit `.tmp/testuser.txt`, projectnaam begint met `E2E gaten`):
  1. Facet 1800 mm, 3 lades: open tekenvenster, plaats sifongat op snappunt 2, plaats kraangat, typ X 300 en Y 80, controleer dat de prijsregel `Uitsparing · 2×` toont; sla op; heropen; gaten staan er nog.
  2. Wijzig naar 2 lades: toast over vervallen gat verschijnt als het sifongat in vak 3 stond.
  3. Solid Facet 1400 mm, 2 lades, 2 kommen rechthoekig 500: bestelknop geblokkeerd tot beide kommen staan; 850 is disabled.
  4. Wissel naar uploaden: bevestiging, teller verschijnt.
  5. Schermafbeeldingen naar `$OUT_DIR`, bekijk ze. Geen bestelling plaatsen.
  6. Opruimen: configuraties met naam `E2E gaten%` van het testaccount verwijderen (patroon `.tmp/ai-hulpje-opruimen.mjs`).
- [ ] **Step 4:** Commit `feat: tekenen of uploaden in de meubelconfigurator`.

### Task 6: Later een tekening aanleveren

**Files:**
- Modify: `src/components/tekening-upload.tsx`
- Modify: `src/app/(main)/configuraties/configuraties-content.tsx`, `src/app/(main)/configuraties/meubel-order-button.tsx`, `src/app/(main)/projecten/[id]/page.tsx` (alleen de props)

**Interfaces:**
- Consumes: `setMeubelGaten`, `GatenEditor`, `gatenContext`, `leesMeubel`.
- `TekeningUpload` krijgt een extra prop `meubel?: { context: GatenContext; gaten: Gat[]; titel: string } | null`. Met `meubel`: twee knoppen `Zelf tekenen` en `Uploaden`. Zelf tekenen opent `GatenEditor`; `Klaar` roept `setMeubelGaten` aan, toont `Tekening opgeslagen.` en ververst (`router.refresh()` plus `invalidateQueries(['configurations'])`). Zonder `meubel`: gedrag zoals nu.
- De projectpagina is een servercomponent: bereken de context daar en geef hem als prop door (alleen serialiseerbare gegevens, wat `GatenContext` is).
- Een fout uit `setMeubelGaten` komt als `{ error }` terug en wordt als toast getoond.

- [ ] **Step 1:** Implementeer. **Step 2:** tsc en eslint schoon.
- [ ] **Step 3:** Breid `.tmp/gaten-e2e.mjs` uit: Solid Facet opslaan zonder geplaatste kom (bij 2 lades), in de lijst `Zelf tekenen`, kom plaatsen, `Klaar`; de melding dat de tekening ontbreekt is weg. Opruimen.
- [ ] **Step 4:** Commit `feat: later aanleveren met tekenen of uploaden`.

### Task 7: Hulpje

**Files:**
- Modify: `src/lib/meubel-ai.ts`, `src/lib/actions/meubel-ai.ts` (alleen als de prompttekst de maattekening noemt)
- Test: `tests/meubel-pricing.spec.ts` of het bestand waar `maakMeubelVoorstel` nu getest wordt

Gedrag in `maakMeubelVoorstel`:
- Model met tekenmodule en `ruw.uitsparingen > 0` bij hout: `tekenwijze: 'module'`, sifongaten op de snappunten van links naar rechts, hoogstens zoveel als er snappunten zijn, Y 240 of binnen de randregel, Ø 45; geen kraangaten. `uitsparingen` niet meer los zetten. Notitie: `Sifongat boven lade 1 en 2 gezet. Controleer de plaats en voeg zo nodig een kraangat toe.`
- Solid: `tekenwijze: 'module'`, kommen op de eerste passende snappunten, `waskomMaat` 500 tenzij 850 genoemd is en past. Notitie: `Waskom boven lade 1 gezet. Controleer de plaats.`
- Model zonder tekenmodule: zoals nu.

- [ ] **Step 1: Falende test:**

```ts
test('hulpje zet sifongaten op de snappunten', () => {
  const v = maakMeubelVoorstel({ model: 'facet', lengte: 1800, lades: 3, houtkleur: 'black', uitsparingen: 2 })
  expect(v.config.tekenwijze).toBe('module')
  expect(v.config.gaten).toEqual([{ soort: 'sifon', vak: 0, y: 240, d: 45 }, { soort: 'sifon', vak: 1, y: 240, d: 45 }])
})
```

Controleer de werkelijke vorm van `MeubelAiRuw` en van het resultaat en pas de test daarop aan.

- [ ] **Step 2:** FAIL. **Step 3:** Implementeer. **Step 4:** PASS, tsc schoon. **Step 5:** Commit `feat: hulpje zet gaten op de snappunten`.

### Task 8: Afronden

- [ ] `npx playwright test tests/meubel-pricing.spec.ts tests/meubel-gaten.spec.ts tests/project.spec.ts tests/order-pricing.spec.ts tests/configurator-pricing.spec.ts` groen; `npx tsc --noEmit` en `npx eslint src` zonder fouten.
- [ ] `grep -rn "maattekening" src` nalopen: teksten die nu niet meer kloppen (verplichte tekening bij hout, "plaats volgens maattekening" in modulemodus) bijwerken.
- [ ] Dev-server gestopt, testgegevens opgeruimd.
- [ ] Vault bijwerken: `voortgang/2026-11-13.md`, `next-steps.md` (open: echte maat ovale kom, diepte en hart van de 850), `beslissingen/` met een korte notitie over de tekenmodule.
- [ ] Melden aan Mark wat klaar is en wat niet getest is; wachten op "push".
