# Projectspiegel Configurator — Design Spec

**Datum:** 2026-04-29  
**Status:** Concept, ter review

---

## Context

LoooX levert naast verlichte badkamerspiegels ook "projectspiegels" aan groothandelaren: simpele spiegels zonder LED, in maatwerk afmetingen, met staffelprijzen. Deze klanten hebben een eigen workflow (geen vormselectie, geen verlichting, wel glasdikte + ophanging + verpakking + quantity) en mogen geen toegang hebben tot de reguliere configurator.

---

## Beslissingen

| Punt | Beslissing |
|------|-----------|
| Integratie | Aparte mini-flow, zelfde URL `/configurator/nieuw` |
| Milestones | Geen (zelfde behandeling als `is_international`) |
| Toegang reguliere configurator | Nee — alleen projectspiegels |
| Toegang toekennen | `is_groothandel` toggle in admin goedkeuringspaneel |
| Staffelprijzen beheer | Hardcoded voor nu, later admin-paneel |
| Verpakking >1.6m² ophanging | TBD — voorlopig €6,18 aanhouden (zelfde als ≤1.6m²) |

---

## Architectuur

```
/configurator/nieuw (bestaande route)
  └─ detecteer is_groothandel op server
      ├─ true  → <ProjectspiegelConfigurator />
      └─ false → bestaande <NieuwConfigurator />
```

Data blijft in de bestaande `configurations` tabel met `shape = 'projectspiegel'`.  
Admin, dashboard, configuraties-overzicht werken ongewijzigd.

---

## Database

### Migratie: profiles
```sql
ALTER TABLE profiles ADD COLUMN is_groothandel boolean NOT NULL DEFAULT false;
```

### Opslag in configurations
`selected_options` JSONB bevat:
```json
{
  "glasdikte": "5",
  "ophanging": true,
  "voormonteren": false,
  "verpakkingPerStuk": true,
  "quantity": 8
}
```
`width` = lengte (cm), `height` = hoogte (cm), `shape` = `'projectspiegel'`

> **Noot:** `voormonteren` heeft momenteel geen prijsimpact — alleen informationeel voor productie.

---

## Prijsberekening

### Kostprijscomponenten (netto, ex. BTW)

| Component | Tarief |
|-----------|--------|
| Glas 4mm | €30,78 / m² |
| Glas 5mm | €34,68 / m² |
| Glas 6mm | €36,36 / m² |
| Kanten polijsten | €4,55 / lopende meter (altijd, omtrek = 2×(L+H)) |
| Ophanging ≤0,8 m² | €3,80 |
| Ophanging >0,8 m² | €6,18 |
| Ophanging >1,6 m² | €6,18 (**TBD** — opzoeken juiste tarief) |
| Verpakking per stuk (folie/hoekjes) | €9,16 / stuk |

### Formule per stuk (vóór staffel)
```
oppervlakte = (lengte / 100) × (hoogte / 100)   [m²]
omtrek      = 2 × ((lengte + hoogte) / 100)      [m]

basisprijs  = oppervlakte × glasPrijsPerM2
            + omtrek × 4.55
            + (ophanging ? ophangPrijs(oppervlakte) : 0)
            + (verpakkingPerStuk ? 9.16 : 0)
```

### Staffelkortingen

| Vanaf | Korting |
|-------|---------|
| 1 stuk | — |
| 10+ | −21,3% |
| 20+ | −28,3% |
| 50+ | −35% |
| 100+ | −40% |
| 250+ | −43% |
| 500+ | −45% |

```
stuksprijs = basisprijs × (1 − staffelKorting)
totaal     = stuksprijs × quantity
```

### Verpakking per stuk — regellogica

- `quantity < 25`: altijd `verpakkingPerStuk = true`, geen toggle getoond
- `quantity ≥ 25`: toggle "Niet per stuk verpakken" getoond in samenvatting-stap, default = uit (= wél per stuk)

### Staffel-tip

Toon een tip wanneer het aantal vlak onder de volgende staffelgrens zit:

| Volgende grens | Toon tip als afstand ≤ |
|----------------|------------------------|
| 10 | 3 |
| 20 | 5 |
| 50 | 10 |
| 100 | 15 |
| 250 | 30 |
| 500 | 50 |

Tip-tekst: _"Bestel er nog **X** meer (totaal **Y** stuks) en betaal **€Z** per stuk in plaats van **€W** — bespaar **€X** per stuk."_

---

## Componenten

### Nieuwe bestanden
```
src/lib/projectspiegel-config.ts          — prijsconstanten + calcfuncties
src/app/configurator/nieuw/projectspiegel/
  index.tsx                               — root (state management, steps)
  step-afmeting.tsx                       — stap 1: lengte, hoogte, glasdikte
  step-opties.tsx                         — stap 2: ophanging + voormonteren
  step-samenvatting.tsx                   — stap 3: overzicht, qty, prijs, opslaan
```

### Gewijzigde bestanden
```
src/app/configurator/nieuw/page.tsx       — detecteer is_groothandel, render juiste flow
src/app/admin/gebruikers/[id]/page.tsx    — is_groothandel toggle toevoegen
src/lib/sidebar-data.ts                   — is_groothandel → skip milestones (zoals is_international)
src/components/layout/sidebar.tsx        — hide LoooX Circle als is_groothandel
src/app/(main)/dashboard/dashboard-content.tsx — hide milestone-widget als is_groothandel
```

### Nieuw admin-paneel
```
src/app/admin/producten-prijzen/page.tsx  — read-only overzicht staffelprijzen projectspiegels
```

---

## Flow — stap voor stap

### Stap 1: Afmeting
- Lengte (cm) — input met +/− knoppen, min 20, max 300
- Hoogte (cm) — input met +/− knoppen, min 20, max 300
- Glasdikte — 3 knoppen: 4mm / 5mm / 6mm (default: 5mm)

### Stap 2: Opties
- **Ophanging** — Ja / Nee (default: Ja)
- **Voormonteren** — Ja / Nee, alleen zichtbaar als ophanging = Ja (default: Nee)

### Stap 3: Samenvatting
- Configuratie-overzicht (afmeting, glasdikte, opties) met wijzigknoppen
- Staffelprijzen-tabel (altijd zichtbaar)
- Staffel-tip banner (conditioneel)
- Aantal-selector (+/−, min 1)
- Verpakking toggle "Niet per stuk verpakken" (alleen als quantity ≥ 25)
- Prijsweergave: basisprijs per stuk → staffelprijs per stuk → totaal netto ex. BTW
- Projectnaam-veld (verplicht)
- Knop "Opslaan als offerte"

---

## Admin: Producten & Prijzen

Nieuwe pagina onder `/admin/producten-prijzen`:
- Leesbaar overzicht van projectspiegel staffelprijzen en componentenprijzen
- Hardcoded data (geen edit-functionaliteit in v1)
- Later uit te breiden met beheerbare tarieven

Navigatie-item "Producten & Prijzen" toevoegen aan admin sidebar.

---

## Sidebar / Milestones voor groothandelaren

Zelfde behandeling als `is_international`:
- `sidebar-data.ts`: als `is_groothandel`, skip milestone-queries (`Promise.resolve(...)`)
- `sidebar.tsx`: LoooX Circle nav-item verborgen
- `dashboard-content.tsx`: LoooX Circle widget verborgen

Gebruik hiervoor `is_groothandel || is_international` zodat de logica samenkomt.

---

## Verificatie

1. Registreer/goedkeur een testgebruiker met `is_groothandel = true`
2. Log in → check: geen LoooX Circle in sidebar, geen milestone widget op dashboard
3. Ga naar `/configurator/nieuw` → ziet projectspiegel mini-flow (3 stappen, geen vormkeuze)
4. Configureer 120×80, 5mm, ophanging ja → check prijsberekening: ~€57,67/stuk
5. Stel qty=8 in → check staffel-tip (2 meer voor 10-staffel)
6. Stel qty=25 in → check verpakking-toggle verschijnt
7. Sla op als offerte → verschijnt in configuraties-overzicht
8. Log in als reguliere gebruiker → `/configurator/nieuw` toont normale flow
9. Admin: check `is_groothandel` toggle in gebruikersbeheer
10. Admin: check `/admin/producten-prijzen` toont staffelprijs-overzicht
