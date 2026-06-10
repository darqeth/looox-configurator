# Audit-rapport LoooX Configurator — 2026-06-10

**Team:** 4 specialist-agents (security, performance/database, frontend/UX/UI, backend/code-kwaliteit) + coördinator.
**Scope:** volledige codebase read-only, gefilterd tegen vault-context (bekende bugs, eerdere beslissingen, Fase 7-planning).
**Er is niets gewijzigd — dit is rapportage + plan van aanpak.**

---

## TL;DR

| Domein | Oordeel | Kernpunt |
|---|---|---|
| Snelheid | ⚠️ Veel winst mogelijk | Traagheid komt niet van trage SQL maar van **stapels HTTPS-roundtrips** (sidebar: 13 queries in 4 golven; middleware: auth-call op élke request) + mogelijke **Vercel/Supabase regio-mismatch** |
| Security | ⚠️ 1 kritiek punt | Autorisatie leunt op handmatig uitgevoerde SQL-migraties; als die niet live zijn kan een klant zichzelf admin maken |
| Prijscorrectheid | 🔴 2 actieve bugs | Luna-prijs wijkt af tussen client en server; kortingscode geeft 3 verschillende totalen (modal/e-mail/PDF) — raakt facturatie |
| Robuustheid | ⚠️ | Order-e-mails kunnen stil verloren gaan op Vercel; geen transactie rond bestellen; nul tests |
| UX/UI | ✅ basis sterk, ⚠️ randen | Skeletons en prijspaneel voorbeeldig; maar full-page reloads in tabs/paginatie, geen error.tsx, 8 handgerolde modals, wizard-state weg bij refresh |

**Goede nieuws:** prijsmanipulatie is server-side afgevangen, cron-secret klopt (timing-safe), skeletons zijn content-matched, react-query wordt netjes gebruikt, Nederlands is consequent, secrets zijn schoon (op één na, zie S2).

---

## Deel 1 — Snelheid & responsiveness (hoofdfocus)

### Architectuur-realiteit

De Drizzle/postgres-client in `src/db/index.ts` wordt **nergens geïmporteerd** — alle runtime-data loopt via Supabase PostgREST (HTTPS REST-calls). Elke `supabase.from(...)` = 1 netwerk-roundtrip (~30–100ms same-region, ~100–150ms cross-region). De "trage database" is dus eigenlijk: **aantal roundtrips × latency × sequentiële waterfalls**. De prijsberekening in de configurator is volledig client-side en is níet het probleem.

### Bevindingen

| # | Ernst | Bevinding | Locatie |
|---|---|---|---|
| P1 | KRITIEK | Geen `regions` in vercel.json → Vercel default us-east (iad1). Bij EU-Supabase kost ELKE query ~80–100ms extra | `vercel.json` |
| P2 | KRITIEK | `supabase.auth.getUser()` = HTTPS-call op élke request (navigaties, prefetches, server actions) | `src/middleware.ts:31` |
| P3 | KRITIEK | Sidebar-fetch: 13 queries in 4 sequentiële golven, blokkeert layout-render; admin-layout betaalt alles voor alleen een isAdmin-check | `src/lib/sidebar-data.ts:33-112`, layouts |
| P4 | HOOG | fetchConfigurations/fetchOrders: tot 5 sequentiële roundtrip-golven; router-cache voor dynamische routes staat op 0s dus élke herhaalnavigatie betaalt alles opnieuw | `src/lib/queries/fetch-configurations.ts`, `fetch-orders.ts` |
| P5 | HOOG | RLS-policies roepen `my_company_id()` / `i_am_manager()` (SECURITY DEFINER, niet inline-baar) + gecorreleerde subqueries **per rij** aan | `supabase/colleagues-migration.sql:177-200,249-267`, `rls-fix-migration.sql:42-51` |
| P6 | HOOG | Admin-pagina's: 500 rijen incl. zware JSONB ophalen, filteren/pagineren in JS | `admin/configuraties|gebruikers|bestellingen/page.tsx` |
| P7 | MIDDEL | Omzet = alle order-rijen fetchen en sommeren in JS; RPC `sum_order_revenue` bestaat al maar wordt alleen in sidebar gebruikt | `dashboard-sections.tsx:220,543`, `fetch-looox-circle.ts` |
| P8 | MIDDEL | Quasi-statische data (tooltips, rss, changelogs, downloads) zonder cache, elke pageload opnieuw | `configurator/nieuw/page.tsx:23-24`, `dashboard-sections.tsx` |
| P9 | MIDDEL | Ontbrekende indexes: `company_members(user_id)`, `profiles(approval_status)`, `configurations(updated_at DESC)` | `supabase/performance-indexes.sql` |
| P10 | MIDDEL | Fire-and-forget writes op serverless (login-streak, PDF, e-mails) zonder `waitUntil` — kunnen verloren gaan | `sidebar-data.ts:78-103`, `orders.ts:308-316,461-472` |
| P11 | HOOG (UX) | Member-tabs en paginatie gebruiken `<a href>` i.p.v. `<Link>` → volledige page-reload bij elke klik | `configuraties-content.tsx:56,78`, `bestellingen-content.tsx:53,72`, `admin-pagination.tsx:77-95` |
| P12 | MIDDEL (UX) | Geen `useOptimistic` in de codebase; lijst-mutaties wachten op server + refresh. Goed patroon bestaat al in `delete-button.tsx` maar wordt op de meeste plekken niet gebruikt | `config-actions-menu.tsx:43-52` e.a. |
| P13 | LAAG | `loading.tsx` ontbreekt voor admin/downloads, admin/instellingen, admin/producten | — |
| P14 | LAAG | Dode code verwart: drizzle-client, `dashboard-client.tsx`/`fetch-dashboard.ts` (incl. no-op `invalidateQueries(['dashboard'])`-calls), `sidebar-server.tsx` | — |

### Snappiness-plan (impact ÷ moeite)

| # | Ingreep | Moeite | Verwachte winst |
|---|---|---|---|
| 1 | Vercel-regio matchen met Supabase (`"regions": ["fra1"]` o.i.d.) | 5 min | Bij mismatch: −0,5 tot −2s per pagina. Grootste kandidaat-winst van alles |
| 2 | `experimental.staleTimes: { dynamic: 30 }` in next.config.ts | 5 min | Herhaalnavigaties instant i.p.v. volledige refetch |
| 3 | Middleware: `getClaims()` i.p.v. `getUser()` (JWT lokaal verifiëren; `approval_status` zit al in app_metadata) | ~1 uur | −50–150ms op élke navigatie én elke server action — de constante "stroperigheid" |
| 4 | Sidebar als 1 Postgres-RPC `get_sidebar_data(p_user_id)` | ~2–3 uur | −200–500ms op first load + elke sidebar-refresh; 13 roundtrips → 1 |
| 5 | `<a href>` → `<Link>`/`router.push` (tabs ×2, paginatie ×3) | ~halve dag | Geen full-page reloads meer in kernnavigatie — grootste *gevoelde* sprong |
| 6 | fetch-golven parallelliseren (5→2 waves) | ~1 uur | −100–300ms op /configuraties en /bestellingen |
| 7 | Statische data cachen via `unstable_cache` + `revalidateTag` | ~1 uur | −2–6 queries per pageload; configurator opent merkbaar sneller |
| 8 | Optimistic updates uitrollen (patroon van delete-button.tsx) | ~halve dag | Acties voelen instant |
| 9 | RLS-calls wrappen in `(SELECT ...)` + service-role client voor admin-lijsten | ~1–2 uur | Admin 2–10× sneller naarmate data groeit |
| 10 | Admin serverside paginatie/zoeken + indexes + omzet-RPC | ~2–3 uur | Blijvend snel bij groei |

Meet voor/na met het bestaande `perf-test.mjs`. Verwachting: punten 1–4 halveren de eerste navigatie, herhaalnavigaties → vrijwel 0.

---

## Deel 2 — Security

| # | Ernst | Bevinding | Locatie |
|---|---|---|---|
| S1 | KRITIEK | RLS UPDATE-policy op `profiles` staat eigen-rij updates toe; kolombescherming (`is_admin`, `korting`, `approval_status`) hangt volledig op de trigger uit `protect-profile-columns-migration.sql`. Die SQL-bestanden worden **handmatig** uitgevoerd. Niet live = klant kan zichzelf via de publieke anon-key admin maken | `supabase/protect-profile-columns-migration.sql`, `rls-fix-migration.sql:48` |
| S2 | KRITIEK | `perf-test.mjs` bevat een plaintext wachtwoord in de repo | `perf-test.mjs:8-9` |
| S3 | MIDDEL | SSRF: client-geleverde `attachmentUrl` wordt ongevalideerd opgeslagen en server-side gefetcht bij PDF-render | `configurator-helpers.ts:47`, `pdf/order-document.tsx:707`, `offerte-document.tsx:720` |
| S4 | MIDDEL | HTML-injectie in e-mails: `senderName`, `senderCompany`, `projectName`, `companyName`, `reden` ongeëscaped in templates naar LoooX-medewerkers | `src/lib/email/index.ts:99-104,179,304,495,582-585` |
| S5 | MIDDEL | `saveExtraOptionTooltip`/`saveControlTooltip`: alleen ingelogd-check, geen `isAdmin`; tabellen hebben ook geen RLS → elke klant kan tooltips voor iedereen overschrijven | `src/lib/actions/admin.ts:378-398` |
| S6 | MIDDEL | `company_invites` UPDATE-policy is `USING (true)` — elke ingelogde gebruiker kan elke invite-rij wijzigen (mits id bekend) | `supabase/colleagues-migration.sql` |
| S7 | MIDDEL | `placeOrderFromConfig` checkt ownership en `can_order` niet — alleen UI handhaaft het | `src/lib/actions/orders.ts:337-343` |
| S8 | LAAG | PostgREST-filterinjectie in zoek-endpoint (beperkt: blijft binnen eigen user_id) | `src/app/api/search/route.ts:33-51` |
| S9 | LAAG | Geen rate limiting op AI-intake (Anthropic-kosten) en password-reset (mail-bombing) | `ai-configurator.ts:132`, `auth.ts:198` |

**Al goed:** prijsmanipulatie afgevangen (server-side herberekening, kortingscodes uit DB gelezen, atomic claim), cron-secret timing-safe, IDOR grotendeels afgedekt, admin-checks consistent (op S5 na), geen hardcoded secrets in src/, geen raw SQL, geen `dangerouslySetInnerHTML`.

---

## Deel 3 — Prijscorrectheid & code-kwaliteit

| # | Ernst | Bevinding | Locatie |
|---|---|---|---|
| C1 | HOOG | **Luna-prijsbug:** server actions geven `lunaMeubelHoogte` niet mee aan `calcTotalPrice` → klant ziet €1039, opgeslagen wordt €1019. Zelfde klasse als de optionSubChoices-bug van 2026-05-27 | `orders.ts:192-207`, `configurator.ts:60-75,144-159` |
| C2 | HOOG | **Kortingsbug:** server rekent pct-korting over bruto, client-modal over netto, PDF mixt beide → 3 verschillende eindtotalen in modal/e-mail/PDF | `orders.ts:214-232,366-387` vs `order-button.tsx:122-132`, `order-document.tsx:488-495` |
| C3 | MIDDEL | Klant-e-mail toont brutoprijs waar modal netto toonde | `email/index.ts:148-154` |
| C4 | HOOG | Order-e-mails + PDF falen 100% stil (`.catch(() => {})`, geen logging) én worden niet ge-await → op Vercel kan een bestelling geplaatst worden zonder dat LoooX ooit een notificatie krijgt | `orders.ts:109-143,308-316,461-472` |
| C5 | HOOG | `placeOrder`: config-insert → order-insert → discount-claim zonder transactie → orphan-configs en "korting verrekend maar claim gefaald" mogelijk | `orders.ts:245-284,395-438` |
| C6 | HOOG | Geen runtime-validatie (geen zod): `quantity` niet geclamped (negatief = negatieve totaalprijs), afmetingen/shape/glasKleur alleen in UI gevalideerd | alle server actions |
| C7 | HOOG | Nul tests; `@playwright/test` geïnstalleerd maar geen config, geen specs. `calcTotalPrice` is puur en triviaal testbaar — had C1 gevangen | — |
| C8 | MIDDEL | Auth-boilerplate 54× gekopieerd, 3 verschillende foutvormen; admin-variant 15× | `src/lib/actions/*` |
| C9 | MIDDEL | Label-maps 4× gedefinieerd en uit elkaar gelopen: e-mail toont rauwe slugs (`rondom` mist), GLAS_LABELS verkeerde keys, ORGANIC_LABELS dode keys | `orders.ts:49-56`, `email/index.ts:14-26`, `pdf/helpers.ts:27-100` |
| C10 | MIDDEL | Kortingscode bij bestellen niet her-gevalideerd op `expires_at`/`user_id`/`used_at` | `orders.ts:219-234,374-389` |
| C11 | MIDDEL | Support-verzoek meldt succes terwijl mail stil kan falen | `support.ts:46-61` |
| C12 | MIDDEL | Drizzle-schema dood én stale (mist kolommen + hele tabellen); echte bron van waarheid = losse SQL-files in `supabase/` | `src/db/*` |
| C13 | MIDDEL | RSS-cron: delete-then-insert niet atomisch → bij insert-fout 24u leeg dashboard-blok | `api/cron/rss/route.ts:55-57` |
| C14 | MIDDEL | Ongebruikte deps: `rss-parser`, `shadcn` (CLI in runtime-deps), `drizzle-orm`+`postgres` runtime-dood | `package.json` |
| C15 | LAAG | Magic numbers (`+ 105`, `m * 99`) in line-items waar constanten bestaan | `price-panel.tsx:774-833` |
| C16 | LAAG | `deleteUser` delete-volgorde mogelijk in conflict met FK (configurations vóór orders) | `admin.ts:153-158` |
| C17 | LAAG | 11 bestanden >500 regels (price-panel 946, admin/producten 854, wizard 743, …) | — |

**Vault-context:** prijzen hardcoded in `configurator-config.ts` is bekend; "admin producten bewerkbaar" staat al in Fase 7 — koppel die aan een prijzen-naar-DB- of import-script-beslissing (`tools/` is nu leeg).

---

## Deel 4 — Frontend / UX / UI

| # | Ernst | Bevinding | Locatie |
|---|---|---|---|
| U1 | HOOG | Wizard-state alleen in `useState`: F5 of tab-sluiten halverwege = alles kwijt | `configurator-wizard.tsx:124-159` |
| U2 | HOOG | Bewerken Sol/Luna-config reset `solMeubelHoogte`/`luna*`-velden stil naar defaults → bij heropslaan kloppen prijs en configuratie niet meer | `configurator/[id]/page.tsx:27-43` |
| U3 | HOOG | "Wijzigen" naast Vorm in samenvatting → lege stap 0 | `step-samenvatting.tsx:133` |
| U4 | MIDDEL | Mobiele "Volgende" slaat verwarming-autoselectie over → mobiel andere (onjuiste) configuratie dan desktop | `configurator-wizard.tsx:736` vs `:680-684` |
| U5 | MIDDEL | Upload-fout faalt stil; verplichte bijlage kan ontbreken in DB | `configurator-wizard.tsx:249-264` |
| U6 | HOOG | Geen enkele `error.tsx`/`not-found.tsx`/`global-error.tsx` → kale Engelse Next-foutpagina bij elke server-fout | hele project |
| U7 | HOOG | shadcn/ui de facto afwezig: 8+ handgerolde modals zonder focus-trap/Escape/aria; Radix is al een dependency | `src/components/ui/` (alleen ongebruikte button.tsx) |
| U8 | MIDDEL | Geen toast-systeem; mix van inline banners, 2× `alert()`, 2× `confirm()`; stille rollbacks (order-status, config-delete) | `ai-intake.tsx:93,97`, `support-button.tsx:65`, `order-status-row.tsx:49-52` |
| U9 | MIDDEL | `organicSize` vs `organicSizeKey`: organic-afmetingen tonen nooit in lijsten | `configuraties-content.tsx:121` e.a. (4 plekken) |
| U10 | MIDDEL | Gedupliceerd: ShapeIcon 6×, STATUS_LABELS 3×, shapeLabel 3×, MemberTabs 2× | diverse |
| U11 | MIDDEL | A11y: geen `aria-pressed` op keuze-grids, labels zonder `htmlFor`, contrast onder 4.5:1 (muted `#9CA3AF`, sidebar white/32), klikbare div-rijen zonder toetsenbord, tooltips alleen op hover (touch ziet ze nooit) | diverse |
| U12 | MIDDEL | Projectspiegel: geen prijs op mobiel, geen foutafhandeling bij save | `projectspiegel/index.tsx:55-75,189` |
| U13 | MIDDEL | Dode order-flow in wizard (~250 regels onbereikbaar) | `step-samenvatting.tsx:100-102`, wizard:310-463 |
| U14 | LAAG | `design-system/MASTER.md` beschrijft een compleet ander design (navy/blauw/Rubik) dan de echte app (beige/groen/Inter) — misleidend voor elke toekomstige AI/dev | `design-system/looox-configurator/MASTER.md` |
| U15 | LAAG | Stappenindicator: vooruit-springen naar al bereikte stap kan niet; iOS zoomt in op <16px inputs; `prefers-reduced-motion` genegeerd; ai-intake gif zonder dimensies (CLS) | diverse |
| U16 | MIDDEL | Admin: geen bulk-goedkeuren pending users, geen kolomsortering, zoeken via full form-GET (focus weg) | `user-row.tsx`, admin pages |

**Al goed:** skeletons content-matched (geen layout shift), PricePanel met delta-animatie voorbeeldig, lege staten sterk, inline validatie in wizard goed, Nederlands consequent.

---

## Stappenplan (prioriteit op urgentie)

### Fase 0 — Vandaag/morgen (~halve dag) 🔴
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 0.1 | Verifieer in productie dat `rls-fix-migration.sql` + `protect-profile-columns-migration.sql` gedraaid zijn (check pg_policies + pg_trigger); zo niet: direct uitvoeren | S1 | 30 min |
| 0.2 | Wachtwoord uit `perf-test.mjs` halen (env var) + dat wachtwoord roteren | S2 | 15 min |
| 0.3 | Supabase-regio checken → `"regions": [...]` in vercel.json | P1 | 5 min + deploy |
| 0.4 | `staleTimes: { dynamic: 30 }` in next.config.ts | P4 | 5 min |
| 0.5 | `isAdmin`-check op beide tooltip-actions + RLS op die tabellen | S5 | 30 min |

### Fase 1 — Prijscorrectheid & security quick wins (~2–3 dagen) 🔴
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 1.1 | Eén `computeOrderTotals()` in `src/lib/` (bruto → dealerkorting → staffel → discountcode), gebruikt door modal, beide placeOrder-actions, PDF én e-mail. Fixt C1+C2+C3 in één keer. Mét unit-tests (fixture-tabel per shape × opties) | C1-C3, C7 | 1–1,5 dag |
| 1.2 | `lunaMeubelHoogte` + sol-params meegeven in alle server-side `calcTotalPrice`-calls (onderdeel 1.1) | C1 | — |
| 1.3 | Sol/Luna edit-reset fixen: ontbrekende velden in `initialConfig` | U2 | 1 uur |
| 1.4 | Gedeelde `goNext()` voor mobiel+desktop (verwarming-autoselect) | U4 | 30 min |
| 1.5 | Step-0 lege stap fixen | U3 | 30 min |
| 1.6 | `attachmentUrl` server-side valideren tegen Supabase-storage-prefix | S3 | 30 min |
| 1.7 | Centrale escape-helper voor alle user-strings in e-mailtemplates | S4 | 1 uur |
| 1.8 | Ownership + `can_order` check in `placeOrderFromConfig` | S7 | 30 min |
| 1.9 | `company_invites` UPDATE-policy dichtzetten | S6 | 30 min |

### Fase 2 — Snelheidssprint (~1 week) 🟠 ← jouw hoofdvraag
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 2.1 | Middleware: `getClaims()` i.p.v. `getUser()` (asymmetrische JWT keys aanzetten in Supabase) | P2 | 1 uur |
| 2.2 | `get_sidebar_data(p_user_id)` RPC: 13 queries → 1; admin-layout alleen isAdmin laten checken | P3 | 2–3 uur |
| 2.3 | Alle `<a href>` → `<Link>`/`router.push` (tabs, paginatie) | P11/U | halve dag |
| 2.4 | fetch-golven parallelliseren in fetch-configurations/fetch-orders + gedeelde `getTeamMembers()` helper | P4, C-dup | halve dag |
| 2.5 | `unstable_cache` op tooltips/rss/changelogs/downloads + `revalidateTag` | P8 | 1 uur |
| 2.6 | Optimistic updates uitrollen (patroon delete-button.tsx) naar config-actions-menu, user-row, order-approval — mét rollback + foutmelding | P12, U8 | halve dag |
| 2.7 | RLS-calls wrappen in `(SELECT ...)`; service-role client voor admin-lijsten | P5 | 1–2 uur |
| 2.8 | Indexes: `company_members(user_id)`, `profiles(approval_status)`, `configurations(updated_at DESC)` | P9 | 15 min |
| 2.9 | 3 ontbrekende admin loading.tsx skeletons | P13 | 1 uur |
| 2.10 | Voor/na meten met `perf-test.mjs`, resultaat vastleggen | — | 30 min |

### Fase 3 — Robuustheid bestelflow (~1 week) 🟠
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 3.1 | Order-plaatsing als transactionele Postgres-RPC (config + order + discount-claim atomisch; patroon bestaat al met `use_discount_code_atomic`) | C5 | 1 dag |
| 3.2 | E-mails/PDF: `waitUntil` (@vercel/functions) + `console.error`-logging in elke catch + nette gebruikersfeedback bij mailfout | C4, C11, P10 | halve dag |
| 3.3 | Kortingscode her-valideren (expires_at, user-binding, used_at) vóór order-insert | C10 | 1 uur |
| 3.4 | zod toevoegen: schemas voor PlaceOrderInput + SaveConfigInput (quantity clampen, afmetingen tegen constraints, enums) | C6 | 1 dag |
| 3.5 | `requireUser()`/`requireAdmin()` helpers, 54 plekken migreren | C8 | halve dag |
| 3.6 | `error.tsx` + `not-found.tsx` (root + per route-groep, in huisstijl met reset-knop) | U6 | halve dag |
| 3.7 | Wizard-state persist naar localStorage (debounced) + "Verder met vorige configuratie?"-banner | U1 | halve dag |
| 3.8 | Upload-fout: throw + saveError tonen | U5 | 30 min |
| 3.9 | Rate limiting op AI-intake + password-reset | S9 | halve dag |
| 3.10 | RSS-cron: upsert op url i.p.v. delete-then-insert | C13 | 30 min |

### Fase 4 — Consistentie & UX-polish (~1 week) 🟡
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 4.1 | Eén Radix `<Modal>`/`<ConfirmDialog>` → 8 handgerolde modals vervangen (gratis focus-trap/Escape/aria) | U7, U11 | 1–1,5 dag |
| 4.2 | Toast-systeem (sonner of mini-eigen) → alert()/confirm()/stille rollbacks vervangen | U8 | halve dag |
| 4.3 | Eén `lib/labels.ts` (shape/status/light/glas/organic) + gedeelde `<ShapeIcon>`/`<MemberTabs>` — fixt ook e-mail rauwe slugs | C9, U10 | halve dag |
| 4.4 | `organicSizeKey`-leesbug op 4 plekken | U9 | 30 min |
| 4.5 | A11y-ronde: `aria-pressed` op keuze-grids, `htmlFor`/`id` op forms, contrast (muted → `#6B7280`, sidebar → white/60), tooltips op focus/touch, inputs ≥16px mobiel | U11, U15 | 1 dag |
| 4.6 | Admin: serverside paginatie/zoeken/sortering (`.range()` + `.ilike()`), bulk-goedkeuren pending users | P6, U16 | 1–1,5 dag |
| 4.7 | Projectspiegel: mobiele prijsbalk + saveError | U12 | halve dag |
| 4.8 | Omzet overal via `sum_order_revenue` RPC | P7 | 30 min |

### Fase 5 — Opruimen & borging (~3 dagen, mag verspreid) 🟢
| Stap | Wat | Ref | Moeite |
|---|---|---|---|
| 5.1 | **Beslissing nodig:** Drizzle echt gebruiken (schema syncen) óf verwijderen + `supabase gen types`. Advies: verwijderen — praktijk gebruikt overal supabase-js | C12 | 1 dag |
| 5.2 | Dode code weg: dashboard-client/fetch-dashboard + no-op invalidations, sidebar-server.tsx, dode order-flow in wizard, ongebruikte deps (rss-parser, shadcn uit runtime) | P14, C14, U13 | halve dag |
| 5.3 | E2E-test (Playwright): login → configureren → opslaan → bestellen → order zichtbaar; + pending/rejected redirects | C7 | 1 dag |
| 5.4 | `design-system/MASTER.md` herschrijven op basis van echte lx-tokens uit globals.css | U14 | 2 uur |
| 5.5 | deleteUser FK-volgorde verifiëren/fixen; magic numbers → constanten; zoek-endpoint escaping | C16, C15, S8 | halve dag |
| 5.6 | Grote bestanden opknippen (MirrorPreview uit price-panel als eerste), opportunistisch bij ander werk | C17 | doorlopend |

**Koppeling Fase 7 (vault):** "admin producten bewerkbaar" → combineer met C-bevinding prijzen-pipeline: óf prijzen naar DB + admin-CRUD, óf `tools/import-prijzen.ts` dat de xlsx parsed en de constants genereert (diff reviewbaar).

---

## Eigen suggesties van het team (buiten de gevraagde scope)

1. **Error-monitoring (bv. Sentry, gratis tier):** C4/C11 laten zien dat fouten nu onzichtbaar verdwijnen. Zonder monitoring weet je nooit of fase 3-fixes werken.
2. **Structureel patroon-probleem:** dit is de 2e bug (optionSubChoices 2026-05-27, nu lunaMeubelHoogte) door het handmatig doorsluizen van losse state-velden naar `calcTotalPrice`. Overweeg één `ConfiguratorState`-object dat integraal wordt doorgegeven — dan kán dit type bug niet meer.
3. **perf-test.mjs als vaste meetlat:** voor/na elke perf-wijziging draaien en resultaten loggen (vault), anders is "voelt sneller" niet verifieerbaar.
4. **Regio's documenteren:** Vercel- en Supabase-regio vastleggen in README zodat dit nooit meer onbewust mismatcht.

## Open vragen (beslissingen voor Mark)

1. **Welke regio draait je Supabase-project?** (Dashboard → Settings → General). Bepalend voor stap 0.3 — mogelijk de grootste snelheidswinst van de hele audit.
2. **Drizzle: houden of verwijderen?** (stap 5.1) Vault-beslissing was Drizzle, maar de praktijk gebruikt overal supabase-js en het schema is stale. Advies: verwijderen.
3. **Mag ik in productie checken of de RLS/trigger-migraties live zijn?** (stap 0.1) Dit is het enige kritieke security-punt en het is alleen verifieerbaar tegen de echte database.
