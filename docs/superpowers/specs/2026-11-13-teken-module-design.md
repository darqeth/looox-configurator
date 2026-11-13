# Tekenmodule voor gaten in het blad (Tailor-Made)

Datum: 2026-11-13. Branch: `configurator-2.0`. Status: ontwerp, wacht op akkoord van Mark.

## Waarom

Een dealer moet nu bij elk meubel zelf een maattekening maken en uploaden om de plaats van waskom, kraan en afvoer door te geven. Dat is een drempel en levert onduidelijke tekeningen op. De configurator kent het meubel al (lengte, diepte, ladevakken). De dealer moet de gaten daarom direct op het bovenaanzicht kunnen zetten. De tekening gaat mee in de PDF, en het verzoek om een tekening vervalt.

## Doelen

- Bovenaanzicht bij elk meubel met een blad en bij planken, niet alleen bij Solid Surface.
- Gaten plaatsen op het bovenaanzicht, op plekken die te maken zijn.
- Aantal en prijs van de uitsparingen komen uit de tekening.
- De tekening staat met maatlijnen in de offerte- en order-PDF.
- Later een tekening aanleveren biedt twee keuzes: zelf tekenen of uploaden.

## Niet in deze versie

- Andere vormen dan ronde gaten (bijvoorbeeld een rechthoekige uitsparing voor leidingen). Daarvoor blijft uploaden.
- Zij- en vooraanzicht met gaten.
- Een vrij tekenprogramma.

## Wat fout zou zijn, ook als het werkt

- Prijs en tekening die elkaar tegenspreken.
- Een gat dat de werkplaats niet kan maken (te dicht op de rand, sifon niet boven een lade).
- Een dealer die vastloopt omdat zijn wens niet in de module past: uploaden moet altijd kunnen.
- Bestaande configuraties met een geüploade tekening die stukgaan.

## Aanpakken

1. **Gaten als gegevens (gekozen).** Elk gat is soort, plaats en diameter in mm, opgeslagen bij de configuratie. Scherm (SVG) en PDF (react-pdf SVG) tekenen uit dezelfde gegevens via gedeelde rekenfuncties, zoals het vooraanzicht nu al werkt (`src/lib/meubel-tekening.ts`). Prijs en regels komen uit dezelfde gegevens.
2. **Vrij tekenprogramma, opgeslagen als plaatje.** Flexibel, maar de configurator weet niet wat er getekend is: geen prijs, geen controle, geen maten. Afgevallen.
3. **Gegevens plus opgeslagen plaatje als bijlage.** Dubbel, en het plaatje kan achterlopen. Afgevallen.

Mark laat de bouwwijze aan de bouwer; keuze 1 is de keuze van de bouwer.

## Gedrag

### Voor welke producten

Met tekenmodule en bovenaanzicht:

- Wastafelmeubels, behalve Facet Deco en Block (daar kan geen waskom op).
- Solid Surface met ingebouwde kom (`waskom: true`): kom en kraangat.
- Solid Base Drawer Box en Double (Solid Surface blad zonder kom): als hout.
- Toiletmeubels Basic Cube Mini, Cabinet Facet Mini en Stripes Mini: als hout, het is een klein meubel met de uitsparing in de bovenkant.
- Base shelves: Mini Base Shelf, Base Shelf Solo, Base Shelf Deco: als hout.

Zonder tekenmodule (door Mark bepaald): Facet Deco, Block, hoge kasten en spiegelkast, Niche Shelf, Wall Shelf Free, Cover en losse artikelen. Waar deze nu een teller en upload hebben, blijft dat zoals het is (keuze van de bouwer).

De handdoekuitsparing van de Mini Base Shelf (18 x 3 cm) zit in de kopse voorkant en staat los van de tekening. Die krijgt een eigen keuze "Handdoekuitsparing" bij de opties van deze plank (0 tot 2, keuze van de bouwer) en telt als betaalde uitsparing bovenop de getekende gaten.

### Soorten gaten

| Soort | Waar | Plaats X | Plaats Y | Diameter | Prijs |
|---|---|---|---|---|---|
| Sifongat | hout en planken | snapt op het midden van een ladevak | vrij te schuiven binnen de randregel | vrij, standaard 45 mm | uitsparing |
| Kraangat | hout en planken | vrij | vrij | vrij, standaard 35 mm | uitsparing |
| Kom | Solid Surface | snapt op het midden van een ladevak | vast | vaste maat per vorm | geen |
| Kraangat | Solid Surface, hoort bij een kom | van midden kom tot 50 mm voorbij de rand van de kom, links of rechts | vast 45,5 mm uit de achterkant | 20 tot 40 mm, standaard 34 | uitsparing |

Maten zijn in mm. X vanaf de linkerkant van het blad, Y vanaf de achterkant, steeds naar het hart van het gat.

### Regels

- Hout en planken: de rand van een gat blijft minstens 30 mm van elke rand van het blad (door Mark opgegeven), en minstens 30 mm van de rand van een ander gat (keuze van de bouwer, instelbaar).
- Solid Surface: kom en kraangat staan op vaste, door de fabrikant bepaalde plekken en vallen buiten de 30 mm regels (het kraangat zit op 45,5 mm, dus dichter op de achterkant en de kom). Wel geldt: de kom ligt minstens 30 mm binnen de zijkanten van het blad, en de rand van het kraangat blijft minstens 30 mm van de zijkanten. Keuze van de bouwer.
- Diametergrenzen bij hout en planken (keuze van de bouwer, instelbaar): sifongat 30 tot 100 mm, kraangat 20 tot 60 mm. Zo kan een gat geen grote uitsparing worden voor de prijs van één.
- Sifongat en kom alleen recht boven een lade. Geen snappunt boven een regaalkast. Bij een model met twee laderijen boven elkaar telt de kolom. Bij een plank of een meubel zonder lades: één snappunt in het midden, plus bij lengtes vanaf 1200 mm ook op een derde en twee derde (keuze van de bouwer).
- Eén sifongat of kom per snappunt.
- Hout: niets is verplicht. Zonder gaten bestellen mag; de klant maakt ze dan zelf.
- Solid Surface: aantal, vorm en maat van de kommen kiest de dealer in de configurator (1 of 2, ovaal of rechthoekig, 500 of 850). In de tekening kiest hij boven welke lade. Zolang niet alle kommen geplaatst zijn, kan er niet besteld worden. Het kraangat per kom is optioneel (wandkraan).
- Bij één lade en één kom staat de kom er meteen; er valt niets te kiezen.
- Maximaal 10 betaalde uitsparingen (`UITSPARING_MAX`).
- Verandert de lengte, diepte, het aantal lades of de regaalkast, dan worden gaten opnieuw getoetst. Sifongaten en kommen verhuizen mee naar het snappunt met hetzelfde volgnummer als dat nog bestaat; anders vervallen ze. Vrije kraangaten buiten het blad of binnen de randzone vervallen. De dealer krijgt een melding welke gaten zijn vervallen.

### Kommen Solid Surface

Er zijn twee maten, 500 en 850, elk ovaal of rechthoekig. De dealer kiest in de configurator vorm, maat en aantal (1 of 2). Bij 2 kommen zijn beide dezelfde maat en vorm.

Vaste maten, op één plek in de code zodat ze later aan te passen zijn:

| Kom | Buitenmaat | Hart uit achterkant | Bron |
|---|---|---|---|
| 500 rechthoekig | 473 x 298, radius 52, afvoer Ø50 in het midden | 240 | tekening Marlan 206646 |
| 500 ovaal | voorlopig 473 x 298 | 240 | opgevraagd |
| 850 rechthoekig | voorlopig 823 x 298 | 240 | opgevraagd |
| 850 ovaal | voorlopig 823 x 298 | 240 | opgevraagd |

Passen:

- Een kom past boven een lade als de lade minstens 150 mm breder is dan de kom (75 mm aan elke kant). Gerekend met de buitenmaat uit de tabel (keuze van de bouwer; met de naammaat 500 of 850 zou het 27 mm strenger zijn).
- Solid Washbasin Solo heeft geen lades: daar geldt dezelfde 150 mm tegen de bladlengte, met de kom in het midden; bij 2 kommen op een kwart en driekwart als elke helft minstens 150 mm breder is dan de kom.
- Een maat is alleen te kiezen als hij boven minstens één lade past; "2 kommen" alleen als de maat boven minstens twee lades past. Wat niet past, is uitgeschakeld met een korte uitleg.
- Eén kom per lade.

### Scherm

Op de plek van het huidige uploadblok in de configurator komt een keuze: **Zelf tekenen** of **Eigen tekening uploaden**. Standaard staat Zelf tekenen aan.

Zelf tekenen opent een venster met:

- Links een legenda met de soorten die bij het meubel horen. Aanklikken kiest de soort.
- Het bovenaanzicht op schaal, achterkant boven, met de ladevakken als dunne lijnen en labels.
- Lege snappunten als bolletjes. Klikken plaatst het gekozen gat of de kom. Een kraangat bij hout plaats je door op het blad te klikken; daarna slepen of maten typen.
- Onder de tekening de velden van het geselecteerde gat: diameter, X en Y waar die vrij zijn, en Verwijderen. Typen en slepen leveren hetzelfde op; waarden worden op hele mm afgerond en binnen de regels gehouden.
- Een regel met het aantal uitsparingen en dat de prijs meetelt.
- Werkt met muis, vinger en toetsenbord (pijltjes verschuiven het geselecteerde gat, Delete verwijdert).

In het configuratorscherm zelf staat het bovenaanzicht met de geplaatste gaten boven het vooraanzicht, zoals nu bij Solid Surface.

### Uploaden blijft

- Kiest de dealer Eigen tekening uploaden, dan verschijnt de teller "aantal uitsparingen" zoals nu, en het uploadveld (afbeelding of PDF).
- De twee manieren sluiten elkaar uit: wie overstapt, krijgt de vraag of de andere mag vervallen.
- Bij Solid Surface met een geüploade tekening blijven de kommen "plaats indicatief" getekend, zoals nu.

### Later aanleveren

Op de plekken waar nu `TekeningUpload` staat (lijst met configuraties, bestelvenster, projectpagina) komt dezelfde keuze: Zelf tekenen opent hetzelfde venster en slaat op bij de configuratie; Uploaden werkt zoals nu.

### Wanneer is een tekening nog nodig om te bestellen

- Hout, planken, kasten: nooit meer verplicht. Uitzondering: is de teller bij uploaden groter dan 0, dan moet de geüploade tekening er zijn (zoals nu).
- Solid Surface: alle kommen geplaatst in de module, of een geüploade tekening.

### PDF

- Offerte- en order-PDF tonen het bovenaanzicht met gaten en maatlijnen: per gat X en Y naar het hart en de diameter; bij een kom de maat en de plaats.
- Een tabel "Uitsparingen" met per gat: soort, X, Y, diameter.
- Is er getekend, dan geen bijlagepagina "Maattekening" en geen melding dat de tekening ontbreekt. Is er geüpload, dan blijft de bijlage zoals nu (afbeelding als pagina, PDF als extra pagina's).
- De regel "Opties" zegt "volgens tekening" in plaats van "volgens maattekening" met het aantal.

### Hulpje

Leest het hulpje gaten uit een schets, dan zet het sifongaten of kommen op de snappunten van links naar rechts met standaardmaten, en geen kraangaten bij hout (plaats onbekend). De regel blijft "Nog nalopen". Een notitie meldt dat de plaats gecontroleerd moet worden.

## Gegevens

In `configurations.selected_options.meubel` (geen databasewijziging):

```ts
gaten?: Array<
  | { soort: 'sifon'; vak: number; y: number; d: number }      // hout: vak = volgnummer snappunt
  | { soort: 'kraan'; x: number; y: number; d: number }        // hout: vrij
  | { soort: 'kom'; vak: number }                              // solid surface
  | { soort: 'kraan-kom'; vak: number; dx: number; d: number } // solid: dx = afstand tot hart kom, min is links
>
tekenwijze?: 'module' | 'upload'
waskomMaat?: 500 | 850          // naast de bestaande waskomVorm en waskomAantal; ontbreekt = 500
handdoekUitsparingen?: number   // alleen Mini Base Shelf
```

- `vak` verwijst naar het volgnummer van het snappunt, niet naar een mm-maat: zo schuift een gat mee als de lengte verandert. De absolute X wordt berekend.
- `uitsparingen` blijft bestaan als het getal waarmee de prijs rekent. Bij `tekenwijze: 'module'` zet de server het zelf op het aantal betaalde gaten; wat de client stuurt telt dan niet. Bij `'upload'` is het de teller van de dealer.
- Bestaande configuraties hebben geen `gaten` en geen `tekenwijze`: die gelden als `'upload'` en werken ongewijzigd.
- De server valideert elk gat tegen dezelfde regels als het scherm (gedeelde functie) en weigert een opslag met een ongeldig gat.

## Onderdelen

- `src/lib/meubel-gaten.ts` (nieuw): types, vaste maten (kommen, marges, standaarddiameters), snappunten uit de ladevakken, absolute plaats per gat, validatie, hertoetsen na een maatwijziging, tellen van betaalde gaten. Zuivere functies, getest in `tests/`.
- `src/lib/meubel-tekening.ts`: bovenaanzicht algemeen maken (nu alleen Solid Surface), maatlijnen.
- Tekenvenster (nieuw, client): legenda, SVG, slepen, velden.
- `meubel-tekening.tsx` en `pdf/meubel-document.tsx`: bovenaanzicht met gaten voor alle modellen met een blad.
- `meubel-configurator.tsx`: keuze tekenen of uploaden, teller alleen bij uploaden.
- `tekening-upload.tsx` en de drie plekken die het gebruiken: keuze toevoegen.
- `actions/meubel.ts`, `meubel-opslag.ts`, `meubel-config.ts` (`tekeningVerplicht`, prijsopbouw, optietekst), `meubel-ai.ts`.

## Aan de bouwer

- Vormgeving van het venster binnen de bestaande huisstijl (`lx-`tokens).
- Hoe slepen technisch werkt (pointer events), en de precieze toetsenbordbediening.
- Volgorde van bouwen en de opdeling in commits.
- Exacte teksten, binnen de regel: geen koppelstreep in UI-teksten.

## Open, volgt van Mark

- Echte maten van de ovale kom en van de kom 850 (beide vormen).
- Of de kom 850 een andere prijs heeft dan de 500. Tot dat bekend is: zelfde prijs.
