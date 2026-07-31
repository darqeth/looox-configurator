# Offerteaanvraag scheiden van bestelling — ontwerp

**Datum:** 2026-07-31
**Status:** goedgekeurd (secties akkoord door Mark)

## Probleem

Een spiegel "op aanvraag" is een **offerteaanvraag**, geen bestelling — de klant
wacht op een prijsopgave. De app behandelt dit nu inconsistent:

- PDF en wizard noemen het al een offerte ("Offertenummer", "Offerte aanvraag") ✓
- Maar het **nummer is ORD-**, de **e-mails** (intern + klant) zeggen "bestelling",
  en in **/bestellingen** en **/admin/bestellingen** is er geen onderscheid met
  echte orders.

Risico: intern wordt een offerteaanvraag aangezien voor een bestelling.

## Oplossing

### 1. Apart offertenummer `OFF-JJJJ-NNNN`
- Nieuwe DB-sequence `offerte_number_seq` + functie `next_offerte_number()`
  (spiegelt `next_order_number()`).
- `create_order_atomic` krijgt parameter `p_is_offerte boolean DEFAULT false`;
  bij `true` wordt een OFF-nummer getrokken i.p.v. ORD-.
- `createOrderAtomic` (JS-wrapper) + beide callers (`placeOrder`,
  `placeOrderFromConfig`) geven `isOfferte = shape === 'op-aanvraag'` door.
- OFF-teller loopt onafhankelijk van ORD.
- **Additief / non-breaking:** bestaande orders en de bestaande RPC-aanroepen
  blijven werken (default op de nieuwe param). Bestaande op-aanvraag-orders
  houden hun ORD-nummer; alleen nieuwe krijgen OFF.
- Oude 9-argument-signature wordt gedropt en vervangen door de 10-argument-versie
  om PostgREST-overload-ambiguïteit te voorkomen.

### 2. E-mails offerte-taal bij op-aanvraag (intern + klant)
`OrderEmailDetails.shape` is beschikbaar → per mail vertakken op `op-aanvraag`.

- **Intern** (`sendInternalOrderEmail`):
  - Onderwerp: `Nieuwe offerteaanvraag — <nr> (<klant>)`
  - Titel: `Nieuwe offerteaanvraag!`
  - Intro: "Hoi Collega, er is zojuist een offerteaanvraag binnengekomen via de
    configurator. **Let op: dit is nog géén bestelling — de klant wacht op een
    prijsopgave.** In de bijlage vind je de aanvraag en hieronder een kort
    overzicht:"
  - Sectielabel "Bestelling" → "Aanvraag"
- **Klant** (`sendOrderConfirmationEmail`):
  - Onderwerp: `Offerteaanvraag ontvangen — <nr>`
  - Titel: `Offerteaanvraag ontvangen!`
  - Intro: "Hoi <naam>, je offerteaanvraag is succesvol ingediend. We stellen zo
    snel mogelijk een offerte op en nemen contact met je op."
  - PDF-bijlage-naam: `LoooX-Offerteaanvraag-<nr>.pdf`

Echte bestellingen houden de huidige copy.

### 3. Badge "Offerteaanvraag" in de lijsten
- `/bestellingen` (klant) en `/admin/bestellingen`: bij `shape === 'op-aanvraag'`
  een label/badge **"Offerteaanvraag"** zodat de regel visueel geen bestelling is.

### 4. PDF/wizard — kleine consistentiefix
- Al grotendeels goed; het OFF-nummer stroomt vanzelf mee.
- Spelling "Offerte aanvraag" → "Offerteaanvraag" in de order-PDF.

## Buiten scope / aannames
- Offerteaanvragen blijven in de bestellingenlijst (niet naar aparte pagina).
- Geen in-app "offerte → order"-conversie: als de klant akkoord gaat op de prijs
  gebeurt dat (voorlopig) handmatig buiten de app.
- Bestaande ORD-op-aanvraag-orders worden niet omgenummerd.

## Aanvullende wijzigingen (2e ronde, PDF + configurator)

### 5. Offerte-/ordernummer naar het groene "Project"-vak in de PDF
- Nu staat het nummer in de header onder de titel
  ([order-document.tsx:523](../../../src/lib/pdf/order-document.tsx)).
- Verplaatsen naar het groene `sectionBox` "Project" (bij Artikelnummer/Aantal).
- **Scope: alle order-PDF's** (offerte-aanvraag én gewone orderbevestiging).

### 6. Nieuw logo in alle PDF's
- Huidig logo is een hardgecodeerde vector
  ([looox-bathrooms-logo.tsx](../../../src/lib/pdf/looox-bathrooms-logo.tsx)),
  gebruikt in order- en offerte-PDF; milestone-PDF heeft een eigen `LoooXLogo`.
- Nieuw logo als **transparante PNG**, aangeleverd op `assets/pdf-logo.png`.
- Aanpak: PNG base64-embedden in een TS-module en via react-pdf `<Image>` tonen
  in **alle** PDF's (offerte, orderbevestiging, milestone). Geen netwerk-fetch
  tijdens renderen.

### 7. Dubbele bedieningsregel in de prijsopbouw
- Er is één bediening voor beide verlichtingen, maar de prijsopbouw naast de
  preview toont "Bediening · <naam>" **twee keer** — één keer in het direct-blok
  en één keer in het indirect-blok
  ([price-panel.tsx:780-791, 825-836, 869-878](../../../src/app/configurator/nieuw/price-panel.tsx)).
  (Bevestigd via screenshot: regel staat dubbel in de opbouw.)
- Het **bruto totaal telt de bediening al maar één keer** (display-bug, geen
  prijsbug). Fix is dus puur cosmetisch: de "Bediening · …"-regel maximaal één
  keer tonen. Aanpak: per shape-tak een `bedieningAdded`-vlag; de indirect-push
  alleen uitvoeren als de direct-push de regel nog niet toevoegde.
- Geldt voor alle drie de shape-takken (rechthoek-groep, rond, organic/aanvraag).

### 8. Weergavebug orderbevestiging vs klantofferte
- Klantofferte tekent verlichting positie-specifiek
  ([offerte-document.tsx:65-84](../../../src/lib/pdf/offerte-document.tsx));
  orderbevestiging tekent directe verlichting altijd als rand rondom
  ([order-document.tsx:253](../../../src/lib/pdf/order-document.tsx)) → "boven"
  oogt als "rondom".
- Fix: de positie-specifieke `PdfMirrorPreview` uit `offerte-document` naar een
  **gedeeld component** (`src/lib/pdf/mirror-preview.tsx`) tillen en in beide
  PDF's gebruiken. Verwijdert meteen de duplicatie.

## Deploy
Migratie is additief. **Alles eerst naar de preview-branch** zodat Mark daar
test; pas na akkoord naar live. Direct na live een smoke-test (nieuwe
op-aanvraag → OFF-nummer, echte order → ORD-nummer ongewijzigd, PDF's renderen).
