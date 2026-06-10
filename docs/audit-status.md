# Audit-status — bijgewerkt 2026-06-10 (eind van dag 1)

Volledig rapport: [audit-rapport-2026-06-10.md](audit-rapport-2026-06-10.md)

## Branches & deploystatus

| Branch | Inhoud | Status |
|---|---|---|
| `preview/snelheidssprint` | Fase 0 + 2 | Gepusht, preview getest tegen rls-test branch |
| `preview/prijscorrectheid` | Fase 1 (gestackt) | Gepusht, E2E-bewezen |
| `preview/robuustheid` | Fase 3 (gestackt) | Gepusht, E2E + rollback-bewezen |
| Prod DB | sidebar-RPC + indexes + profiles-REVOKE | ✅ al live (additief/noodgreep) |
| Supabase branch `rls-test` | dataclone + alle migraties | Testomgeving, na deploy verwijderen |

## ✅ Gedaan (dag 1)

### Fase 0 — Acuut
| Stap | Status |
|---|---|
| RLS-verificatie prod | ✅ Lek gevonden + acuut gedicht (REVOKE anon/DELETE) |
| Wachtwoord uit perf-test.mjs | ✅ Code — ⚠️ **roteren moet Mark nog doen** |
| Vercel-regio dub1, router-cache 30s | ✅ In branch |
| Tooltip admin-check | ✅ |

### Fase 1 — Prijscorrectheid (alles ✅)
computeOrderTotals() als enige bron van waarheid · Luna-prijsbug (C1) · kortingscode bruto→netto (C2) · e-mail prijsopbouw (C3) · code-hervalidatie (C10) · SSRF attachmentUrl (S3) · e-mail escaping (S4) · ownership/can_order (S7) · Sol/Luna edit-reset (U2) · lege stap 0 (U3) · mobiele verwarming-autoselect (U4) · invites-policy-script klaar (S6)

### Fase 2 — Snelheid (~90%)
getClaims() lokaal i.p.v. auth-roundtrip · sidebar 13 queries → 1 RPC · `<Link>` i.p.v. full reloads · query-golven parallel · statische data gecached · indexes · admin-skeletons · **meting: 1e navigatie 1188→487ms (−59%), herhaal 898→31ms (−97%)**

### Fase 3 — Robuustheid (~95%)
create_order_atomic() transactie (rollback bewezen) · waitUntil+logging e-mails · zod-validatie · error.tsx/404 in huisstijl · wizard-drafts in localStorage + herstel-banner · upload-fout zichtbaar · support-mail await · RSS-cron upsert · rate limits AI/pwreset · 14 unit-tests + testrunner (`npm test`)

## 🌙 Vanavond (runbook, ~15 min)

1. Migraties op prod in volgorde: `profiles-rls-enable-migration.sql` → `company-invites-policy-fix.sql` → `order-transaction-migration.sql`
   ⚠️ #3 moet vóór de merge van robuustheid, anders faalt bestellen
2. RLS-testsuite tegen prod draaien (verificatie)
3. Merge naar main (robuustheid bevat alles) → Vercel deployt live
4. Prod smoke-test + perf-meting (regiowinst nu zichtbaar)
5. Opruimen: rls-test branch verwijderen, Vercel branch-env-vars weg
6. Mark: wachtwoord mark@rmsanitair.nl roteren

## 📋 Nog open (prioriteit voor dag 2+)

### P1 — Klantzichtbare bugs/slordigheden (~1 dag)
| Item | Ref | Moeite |
|---|---|---|
| Labels-module: e-mails tonen rauwe slugs (`rondom` mist, GLAS_LABELS verkeerde keys, ORGANIC dode keys) | C9 | halve dag |
| organicSizeKey-leesbug: organic-afmetingen tonen nergens in lijsten | U9 | 30 min |
| Optimistic updates uitrollen (delete/goedkeuren/status) + toast-systeem (vervangt alert/confirm + stille rollbacks) | 2.6, U8 | 1 dag samen |

### P2 — Admin & schaal (~1-1,5 dag)
| Item | Ref | Moeite |
|---|---|---|
| Admin serverside paginatie/zoeken/sorteren (3× limit(500) + TODO's) + bulk-goedkeuren pending | P6, U16 | 1-1,5 dag |
| Service-role client voor admin-lijsten (RLS-overhead weg) | P5-rest | 1 uur |
| Omzet via sum_order_revenue RPC in dashboard-sections | P7 | 30 min |

### P3 — Consistentie & toegankelijkheid (~2 dagen)
| Item | Ref | Moeite |
|---|---|---|
| Eén Radix Modal/ConfirmDialog → 8 handgerolde modals (gratis focus-trap/Escape/aria) | U7, U11 | 1-1,5 dag |
| A11y-ronde: aria-pressed, htmlFor, contrast, touch-tooltips, iOS-zoom, reduced-motion | U11, U15 | 1 dag |
| Projectspiegel: mobiele prijsbalk + save-foutafhandeling | U12 | halve dag |

### P4 — Opruimen & borging (~2 dagen, mag verspreid)
| Item | Ref |
|---|---|
| Drizzle eruit (besloten) + DATABASE_URL placeholder weg | C12 |
| Dode code: dashboard-client/fetch-dashboard + no-op invalidations, sidebar-server, dode wizard-orderflow (~250 regels), rss-parser/shadcn deps | P14, C14, U13 |
| `requireUser()`/`requireAdmin()` helpers — 54× boilerplate | C8 |
| E2E bestelflow-test vastleggen in tests/ (basis-runner staat er al) | C7 |
| design-system MASTER.md herschrijven naar echte lx-tokens | U14 |
| deleteUser FK-volgorde, magic numbers price-panel, zoek-endpoint escaping | C16, C15, S8 |
| Vault/README: regio's + migratieproces documenteren | — |

### Gekoppeld aan Fase 7 (eigen roadmap)
- Admin producten bewerkbaar → combineren met prijzen-pipeline-beslissing (DB of xlsx-importscript)
