# Sol/Luna — 150 cm-maatgrens + afmetingen in de visualisatie

**Datum:** 2026-08-14
**Status:** goedgekeurd (secties + mockup akkoord door Mark)
**Scope:** alleen Sol en Luna. Andere vormen wellicht later.

## Doel

1. Een **maximale maat** afdwingen: het grootste overblijvende glasdeel (de
   restmaat / het bovendeel) mag niet in béíde richtingen groter dan 150 cm zijn.
2. De **afmetingen visueel** tonen in de configurator-preview (en in de PDF's),
   zodat ook een leek de maten begrijpt.

## Deel 1 — De 150 cm-grens

### Regel (bevestigd)
- De spiegel wordt uit een glasplaat gesneden die in één richting max 150 cm is;
  het deel kan gedraaid worden. Dus: de **kortste zijde** van het hoofdstuk moet
  ≤ 150 cm. Pas als **beide** zijden (breedte én hoogte) > 150 cm zijn, is het
  niet meer te maken.
- Alleen het **grootste deel** (het bovendeel) telt. Losse delen (extra deel /
  uitsteek) worden apart geproduceerd en tellen niet mee.
- Het is **niet de diameter** maar de **restmaat** na alle keuzes. Meubel hoger /
  lager plaatsen verandert de restmaat. Onder rule A blijkt geen enkele huidige
  diameter ooit onmogelijk (de hoogte zakt bij hoog meubel altijd < 150), dus er
  vervallen géén maatopties — puur disable + melding.

### Restmaat berekenen (nieuwe helpers, bestaande math hergebruikt)
In `src/lib/configurator-config.ts`, naast de bestaande
`computeSolRestmaten` / `computeLunaRestmaten`:

- `hoogte` = `bovendeelHoogte` = `diameter − (meubelHoogte + onderkant)`
  (bestaat al).
- `breedte` = de breedste koorde van het bovendeel:
  - `meubelTop = onderkant + meubelHoogte`, `r = diameter/2`
  - als `meubelTop ≤ r` (meubellijn op/onder het midden) → breedte = `diameter`
    (breedste punt, het midden, zit in het bovendeel)
  - anders → breedte = koorde op de meubellijn (`meubelVlakBreedte`)
  - **Luna:** trek de wandafsnede eraf: `breedte = halveKoorde + min(halveKoorde,
    r − afstand)` (komt bij meubel onder het midden neer op `diameter − afstand`,
    de bestaande "zichtbare breedte").

Nieuwe functies `computeSolMainPiece(...)` / `computeLunaMainPiece(...)` geven
`{ breedte, hoogte, meubelBreedte }` (cm), gebruikt door zowel de check als de
weergave. Constante `SOL_LUNA_MAX_ZIJDE = 150`.

### Afdwingen
- **UI:** in `isStep1Valid()` (configurator-wizard) voor sol/luna → `false` als
  `min(breedte, hoogte) > 150`. Daardoor wordt de "Volgende"-knop grijs/disabled
  (bestaand mechanisme).
- **Melding:** onder de knop een nette melding, bijv.: "De spiegel is te groot om
  te produceren: zowel de breedte (X cm) als de hoogte (Y cm) is groter dan 150
  cm. Plaats het meubel hoger of kies een kleinere maat zodat de hoogte of
  breedte onder 150 cm komt."
- **Server (vangnet):** dezelfde check in `saveConfiguration` /
  `updateConfiguration` / `placeOrder*` voor sol/luna, zodat het niet te omzeilen
  is. Gooit een nette fout als beide zijden > 150.

## Deel 2 — Afmetingen in de visualisatie (optie A, goedgekeurd)

Weergave = **overlay** bovenop de bestaande tekening. **De bestaande
visualisatie (berekening + opbouw) verandert niet** — alleen stippellijnen +
maatlabels erbij, exact zoals de goedgekeurde mockup:

- **⌀ diametermaat** bovenaan, stippellijnen doorgetrokken tot de breedste punten.
  (Luna: de zichtbare breedte i.p.v. ⌀.)
- **Breedte op meubel** eronder (de waarde die al meegroeit —
  `meubelVlakBreedte`), lijnen tot de meubelrand.
- **Hoogte** (bovendeel) rechts, lijnen tot de boven- en meubelrand.

Stijl: dunne stippellijnen (geen pijltjes), maatlabel met achtergrond in de
paneelkleur en wat lucht eromheen (onderbreking in de lijn). Netjes en niet druk.

### Toggle "Geef afmetingen weer"
- Staat **standaard aan**, alleen zichtbaar bij Sol/Luna.
- Stuurt **alleen de live configurator-preview** (lokale UI-state, niet opgeslagen).
- In de **PDF** staan de maten **altijd** (klant- én order-PDF).

### Waar bouwen
- **Live preview:** `MirrorPreview` in
  `src/app/configurator/nieuw/price-panel.tsx` (sol/luna-tak). Overlay-groep die
  aan/uit gaat met de toggle. Coördinaten uit de al berekende geometrie (cx, cy,
  r, meubellijn) — niets aan de vorm-opbouw wijzigen.
- **PDF:** gedeelde `PdfMirrorPreview` in `src/lib/pdf/mirror-preview.tsx`
  (sol/luna-tak), overlay altijd aan. Zelfde maatwaarden via de nieuwe helpers.
- Maatwaarden (cm) komen uit `computeSol/LunaMainPiece` + `meubelVlakBreedte`,
  zodat live en PDF identiek zijn.

### Toggle-plaatsing
Schakelaar bij de preview (price-panel), label "Afmetingen weergeven",
default aan. Alleen renderen als shape ∈ {sol, luna}.

## Buiten scope / aannames
- Alleen Sol en Luna. Andere vormen krijgen (nu) geen maatoverlay en geen 150-check.
- De vorm-/prijsberekening en de bestaande preview-opbouw blijven exact gelijk.
- Toggle wordt niet opgeslagen; PDF toont maten altijd.

## Deploy
Alles eerst naar een **preview-branch** (`preview/…`) zodat Mark test; pas na
akkoord mergen naar main/live. Geen DB-wijziging nodig (toggle niet opgeslagen,
constraint is client + server-actie-logica).
