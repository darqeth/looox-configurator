# Nieuwe vorm: Elips

**Datum:** 2026-08-19
**Status:** goedgekeurd (matrix + aanpak akkoord door Mark)
**Glasprijs:** €325/m² op de omhullende rechthoek (aangeleverd 2026-08-21).

## Doel
Een nieuwe spiegelvorm **Elips** (echte ellips) toevoegen aan de configurator,
naast de bestaande vormen. Onderscheiden van de bestaande **Ovaal** (piltvorm).

## 1. Vorm & rendering
- Nieuwe `ShapeSlug` `'elips'`, entry in `SHAPES` (naam "Elips"), shape-picker
  met een echte-ellips-icoon (`/public/icons/shapes/elips.svg`).
- **Echte ellips** (`rx = breedte/2`, `ry = hoogte/2`) in:
  - live preview `MirrorPreview` (price-panel) — eigen `elips`-tak
  - gedeelde PDF-preview `mirror-preview.tsx` — eigen `elips`-tak
  De bestaande Ovaal-render (piltvorm) blijft ongemoeid.

## 2. Maat — 1:2, vrije maat + oriëntatie
- Oriëntatie-toggle **Liggend / Staand** (bepaalt welke zijde de lange is; van
  belang omdat de tip-touch altijd onderaan zit).
- Eén vrij invoerveld voor de **lange zijde: 80–200 cm**. Korte zijde =
  automatisch de helft (40–100 cm). Zo geldt altijd: kortste ≥ 40, langste ≤ 200,
  verhouding 1:2. Toont live "B × H".
- Opgeslagen als `width` + `height` (echte cm-maten), net als rechthoek.
- Validatie: `isStep1Valid()` in de wizard blokkeert Volgende buiten bereik;
  server-vangnet in save/update/placeOrder (Elips: lange zijde 80–200, 1:2).

## 3. Prijs
- Glas: **€20/m² × omhullende rechthoek** (breedte × hoogte). Placeholder,
  ongeacht kleur. Constante `ELIPS_GLAS_PRIJS_M2 = 20`.
- Verder identiek aan de rechthoek/ovaal-rekentak, overgenomen uit de config:
  vaste toeslag €105, indirect-LED €99/strekm, bediening- en optieprijzen.
  **Geen** directe verlichting → **geen** zandstraalkosten.
- Implementatie: Elips krijgt een eigen tak (of parameter) in `calcBasePrice` /
  `calcTotalPrice` die de glasprijs op €20/m² zet en verder de bestaande
  rechthoek-logica volgt (LED indirect, bediening, opties).

## 4. Opties / matrix (shape-specifiek)
- **Glaskleur:** Helder, Brons (`smoke-brons`), Grijs (`smoke-zwart`). In
  Elips-context labels "Helder / Brons / Grijs" (geen nieuwe kleur).
- **Verlichting:** alleen **indirect, rondom**. Geen directe verlichting.
  - `DIRECT_LIGHT_POSITIONS['elips'] = []` (zoals sol/luna → directe sectie
    verborgen)
  - `INDIRECT_LIGHT_POSITIONS['elips'] = ['geen', 'rondom']`
- **Lichttypes:** 3000K, 4000K, CCT (**geen RGB**). In `step-verlichting`
  `lightTypes` shape-bewust maken: `elips → ['3000k','4000k','cct']`.
- **Bediening** (Elips-specifiek, want CCT krijgt Centraal erbij wat de basis
  niet heeft) — nieuwe map `ELIPS_CONTROLS_FOR_TYPE`:
  - `3000k` / `4000k` → Centraal (`externe-schakeling`), Touch (`tip-touch`)
  - `cct` → Centraal, Touch, Afstandsbediening (`afstandsbediening`)
  - geen Motion-sensor, geen Wip-schakelaar
  - Zowel `step-verlichting` (UI) als de prijs/validatie gebruiken de
    shape-bewuste bedieningslijst.
- **Overige opties:** alleen **Verwarming** en **Bluetooth-speaker**. `'elips'`
  toevoegen aan `shapes` van die twee opties; NIET aan make-up, digitale klok,
  frame, afgeronde/schuine zijden.

## 5. Tijdelijke prijsmelding
Zolang de placeholderprijs geldt: een kleine, duidelijke melding in de
Elips-flow (bij de prijs in het price-panel én de samenvatting) dat de prijs nog
definitief aangeleverd moet worden. Verwijderen zodra de echte prijs erin staat.

## 6. Plekken die geraakt worden
`configurator-config.ts` (slug, SHAPES, posities, lichttypes/bediening,
prijs, glas-m²), shape-picker + icoon, `step-afmeting` (nieuwe Elips-maat-UI),
`step-verlichting` (lichttypes + bediening shape-bewust), `price-panel`
(preview-tak + prijsmelding), `mirror-preview.tsx` (PDF-tak),
`step-samenvatting` (afmeting-samenvatting + melding), PDF `helpers.formatDimensions`,
wizard-validatie, server-validatie (`assert… ` in save/order), labels/badges waar
vormen worden getoond.

## Buiten scope / aannames
- Echte glasprijs (per kleur) komt later; blijft €20 placeholder tot dan.
- "Afstandsbediening alleen i.c.m. CCT" is verwerkt via de Elips-bedieningslijst.
- Bestaande vormen worden niet gewijzigd.

## Deploy
Alles op een **preview-branch** (`preview/elips`). Test door Mark. **Niet naar
main** tot de echte prijs bekend is.
