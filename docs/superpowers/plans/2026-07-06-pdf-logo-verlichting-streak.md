# PDF Logo + Verlichting Refactor + Weekdag Streak — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drie onafhankelijke verbeteringen: LoooX-logo gecentreerd in beide PDF's, gedeelde lichttype/bediening voor direct+indirect verlichting, en login-streak telt alleen werkdagen (di–za).

**Architecture:** Taken zijn onafhankelijk en kunnen in volgorde worden uitgerold. Task 1 wacht op het logo-bestand van de gebruiker maar kan alvast de layout klaarzetten. Task 2 is de zwaarste: database-migratie + wizard-state + 8+ consumers. Task 3 is een pure logica-wijziging in de streak-update.

**Tech Stack:** Next.js 15 App Router, React, @react-pdf/renderer, Supabase (JSONB), TypeScript

## Global Constraints

- Branch: altijd `preview/...` tenzij uitdrukkelijk anders gevraagd
- Geen prijswijzigingen anders dan de bediening die nu 1× in plaats van 2× telt
- Bestaande configuraties in de DB moeten na de migratie nog correct renderen
- Geen nieuwe npm-packages installeren
- Geen comments tenzij de WHY niet-voor-de-hand-liggend is
- Stijl: caveman/telegram in PR-descriptions; code in bestaande codebase-stijl

---

## Task 1 — LoooX Logo gecentreerd in beide PDF's

**Context:** Logo staat nu links in de header naast "Spiegel op maat". Klanten (groothandel) moeten direct zien dat het een LoooX-document is. Beide PDF's krijgen het logo groot en gecentreerd bovenaan.

**Files:**
- Modify: `src/lib/pdf/order-document.tsx` (header-sectie ~lines 524–536, LoooXLogo component ~lines 31–41)
- Modify: `src/lib/pdf/offerte-document.tsx` (zelfde header-sectie)
- Add (wacht op aanlevering): `public/looox-logo.png` of `public/looox-logo.svg`

**Aanpak terwijl logo nog niet aangeleverd is:** gebruik de bestaande `LoooXLogo` SVG-component maar zet hem gecentreerd boven de rest van de header.

**Interfaces:**
- Consumes: bestaande `LoooXLogo` component (SVG, props: `width`)
- Produces: gecentreerde logo-rij bovenaan beide PDF-documenten; rest van header ongewijzigd

- [ ] **Stap 1: Pas header-layout aan in order-document.tsx**

Huidige header (regel ~524):
```tsx
<View style={styles.header}>
  <View>
    <LoooXLogo width={110} />
    <Text style={[styles.headerMeta, { marginTop: 4 }]}>Spiegel op maat</Text>
  </View>
  <View style={styles.headerRight}>
    <Text style={styles.docTitle}>{docTitle}</Text>
    ...
  </View>
</View>
```

Nieuwe structuur — logo gecentreerd, daarna de bestaande info-rij eronder:
```tsx
{/* Logo — gecentreerd boven de header */}
<View style={{ alignItems: 'center', marginBottom: 10 }}>
  <LoooXLogo width={130} />
</View>

{/* Header info */}
<View style={styles.header}>
  <View>
    <Text style={[styles.headerMeta, { marginTop: 0 }]}>Spiegel op maat</Text>
  </View>
  <View style={styles.headerRight}>
    <Text style={styles.docTitle}>{docTitle}</Text>
    <Text style={styles.headerMeta}>{nummerLabel}: {orderNumber}</Text>
    <Text style={styles.headerMeta}>Datum: {formatDate(orderDate)}</Text>
    <Text style={styles.headerMeta}>Status: {STATUS_NL[status] ?? status}</Text>
  </View>
</View>
```

- [ ] **Stap 2: Zelfde wijziging in offerte-document.tsx**

Zoek de header-sectie in `offerte-document.tsx` (vergelijkbare structuur als order-document). Breng dezelfde logo-gecentreerd aanpak aan.

- [ ] **Stap 3: Lokaal visueel checken**

Start dev server (`npm run dev`), open een configuratie, genereer een PDF-preview. Controleer:
- Logo staat gecentreerd bovenaan
- Header-info (ordernummer, datum, etc.) staat eronder op normale hoogte
- Geen overflow of clipping

- [ ] **Stap 4: Commit**

```bash
git add src/lib/pdf/order-document.tsx src/lib/pdf/offerte-document.tsx
git commit -m "feat: LoooX logo gecentreerd bovenaan beide PDF documenten"
```

**Swap wanneer logo aangeleverd wordt:**
Vervang `<LoooXLogo width={130} />` door:
```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<Image src="/looox-logo.png" style={{ width: 130, height: 'auto' }} />
```
(of SVG via `<Svg>` als het een vector is)

---

## Task 2 — Gedeelde lichttype + bediening voor direct/indirect verlichting

### Achtergrond & scope

**Huidig model:**
```
directLight:   { position, type, control }
indirectLight: { position, type, control }
```
Beide lichten hebben elk hun eigen type en bediening → klant betaalt bediening 2×.

**Nieuw model:**
```
directLight:   { position }
indirectLight: { position }
lightType:     LightType | null    ← gedeeld
lightControl:  string | null       ← gedeeld, 1× prijs
```

**Prijsimpact:** `CONTROL_PRICES[lightControl]` wordt maar 1× opgeteld, ongeacht of 1 of 2 lichten actief zijn.

**Bestaande DB-records:** SQL-migratie transformeert bestaande JSONB inline (zie Task 2e).

### Files geïmpacteerd

| File | Wat verandert |
|---|---|
| `src/lib/pdf/helpers.ts` | `ConfigOptions` type: voeg `lightType`/`lightControl` toe, maak `directLight.type/control` optioneel |
| `src/lib/configurator-config.ts` | `calcTotalPrice`: nieuwe params `lightType`/`lightControl`, control-prijs 1× |
| `src/app/configurator/nieuw/configurator-wizard.tsx` | State: voeg `lightType`/`lightControl` toe, verwijder type/control uit `directLight`/`indirectLight` |
| `src/app/configurator/nieuw/step-verlichting.tsx` | UI: positie per sectie, daarna 1× type + 1× bediening |
| `src/lib/actions/configurator.ts` | Save-action: schrijf nieuwe structuur |
| `src/lib/actions/configurator-helpers.ts` | DB-read: zet `lightType`/`lightControl` door |
| `src/lib/actions/ai-configurator.ts` | AI-prompt + output-normalisatie: nieuw schema |
| `src/app/configurator/nieuw/ai-intake.tsx` | Labels voor `lightControl` display |
| `src/app/(main)/configuraties/configuraties-content.tsx` | Leest `directLight.type/control` → aanpassen |
| `src/app/(main)/configuraties/order-button.tsx` | Idem |
| `src/app/(main)/dashboard/dashboard-sections.tsx` | Idem |
| `src/app/admin/configuraties/config-detail-modal.tsx` | Idem |
| `src/lib/pdf/order-document.tsx` | `formatLight()` helper |
| `src/lib/pdf/offerte-document.tsx` | Idem |

---

### Task 2a — Types & helpers.ts

**Files:**
- Modify: `src/lib/pdf/helpers.ts`

- [ ] **Stap 1: Pas ConfigOptions aan**

```typescript
export type ConfigOptions = {
  shape: string
  diameter?: number | null
  organicSizeKey?: string | null
  glasKleur?: string
  directLight?: { position?: string; type?: string | null; control?: string | null }   // type/control optioneel voor backward compat
  indirectLight?: { position?: string; type?: string | null; control?: string | null } // idem
  lightType?: string | null       // nieuw: gedeeld lichttype
  lightControl?: string | null    // nieuw: gedeelde bediening
  extras?: string[]
  optionSubChoices?: Record<string, string>
  reference?: string
  description?: string
  quantity?: number
  attachmentUrl?: string | null
  discountType?: 'pct' | 'fixed' | null
  discountValue?: number | null
  discountAmount?: number | null
  solMeubelHoogte?: number | null
  solOnderkant?: number | null
  lunaMeubelHoogte?: number | null
  lunaOnderkant?: number | null
  lunaAfstand?: number | null
  lunaMuurZijde?: string | null
}
```

- [ ] **Stap 2: Pas `formatLight`-helper aan (staat ook in helpers.ts)**

Zoek de `CONTROL_LABELS` map en de `formatLight`-functie. De bediening wordt nu uit `opts.lightControl` gelezen i.p.v. per light-object. Pas de formatteerfunctie aan zodat:
- Positie nog steeds per licht getoond wordt
- Type en bediening komen uit `opts.lightType` / `opts.lightControl` (met fallback op `opts.directLight?.type` voor backward compat met oude records)

```typescript
// Lees type/control: nieuw veld heeft prioriteit, fallback op oud per-light veld
const sharedType = opts.lightType ?? opts.directLight?.type ?? opts.indirectLight?.type ?? null
const sharedControl = opts.lightControl ?? opts.directLight?.control ?? opts.indirectLight?.control ?? null
```

- [ ] **Stap 3: Commit**

```bash
git add src/lib/pdf/helpers.ts
git commit -m "refactor: ConfigOptions en formatLight voor gedeeld lightType/lightControl"
```

---

### Task 2b — Prijsberekening (configurator-config.ts)

**Files:**
- Modify: `src/lib/configurator-config.ts` (functie `calcTotalPrice`, ~lines 467–624)

- [ ] **Stap 1: Pas `calcTotalPrice` signatuur aan**

Huidige params (relevante deel):
```typescript
directControl?: string | null
indirectControl?: string | null
```

Nieuw — verwijder per-light control, voeg gedeelde toe:
```typescript
lightControl?: string | null   // gedeeld; vervang directControl + indirectControl
```

Volledig nieuwe state-type voor de functie:
```typescript
export function calcTotalPrice(state: {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur?: GlasKleur | null
  directPosition: string
  directType: LightType | null      // blijft voor LED-meter berekening
  indirectPosition: string
  indirectType: LightType | null    // idem
  lightControl?: string | null      // NIEUW: gedeeld
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
}): number
```

- [ ] **Stap 2: Pas de control-prijs-berekening aan**

Huidig (regels ~528, 534):
```typescript
if (state.directControl) price += CONTROL_PRICES[state.directControl] ?? 0
// ...
if (state.indirectControl) price += CONTROL_PRICES[state.indirectControl] ?? 0
```

Nieuw — control-prijs 1× als er tenminste 1 actief licht is én er een control gekozen is:
```typescript
const hasAnyLight =
  (state.directPosition !== 'geen' && state.directType != null) ||
  (state.indirectPosition !== 'geen' && state.indirectType != null)
if (hasAnyLight && state.lightControl) {
  price += CONTROL_PRICES[state.lightControl] ?? 0
}
```

- [ ] **Stap 3: Zoek alle aanroepen van `calcTotalPrice` en pas de call-sites aan**

```bash
grep -rn "calcTotalPrice" src/ --include="*.ts" --include="*.tsx"
```

Op elke call-site: verwijder `directControl`/`indirectControl`, voeg `lightControl` toe.

- [ ] **Stap 4: Commit**

```bash
git add src/lib/configurator-config.ts
git commit -m "refactor: calcTotalPrice gebruikt gedeeld lightControl (1× prijs)"
```

---

### Task 2c — Wizard state (configurator-wizard.tsx)

**Files:**
- Modify: `src/app/configurator/nieuw/configurator-wizard.tsx`

**Huidig:** `directLight: LightConfig` en `indirectLight: LightConfig` waar `LightConfig = { position, type, control }`.

**Nieuw:** `directLight: { position: string }`, `indirectLight: { position: string }`, plus `lightType: LightType | null`, `lightControl: string | null`.

- [ ] **Stap 1: Pas `LightConfig` type aan in de wizard**

Bovenaan het bestand, of in een lokaal type:
```typescript
type PositionConfig = { position: string }
```

- [ ] **Stap 2: Pas state-initialisaties aan**

```typescript
// Oud:
const [directLight, setDirectLight] = useState<LightConfig>(initialConfig?.directLight ?? DEFAULT_LIGHT)
const [indirectLight, setIndirectLight] = useState<LightConfig>(initialConfig?.indirectLight ?? DEFAULT_LIGHT)

// Nieuw:
const DEFAULT_POSITION = { position: 'geen' }
const [directLight, setDirectLight]   = useState<PositionConfig>(
  initialConfig?.directLight ? { position: initialConfig.directLight.position ?? 'geen' } : DEFAULT_POSITION
)
const [indirectLight, setIndirectLight] = useState<PositionConfig>(
  initialConfig?.indirectLight ? { position: initialConfig.indirectLight.position ?? 'geen' } : DEFAULT_POSITION
)
const [lightType, setLightType]       = useState<LightType | null>(
  (initialConfig?.lightType as LightType | null)
  ?? initialConfig?.directLight?.type as LightType | null
  ?? initialConfig?.indirectLight?.type as LightType | null
  ?? null
)
const [lightControl, setLightControl] = useState<string | null>(
  initialConfig?.lightControl
  ?? initialConfig?.directLight?.control
  ?? initialConfig?.indirectLight?.control
  ?? null
)
```

- [ ] **Stap 3: Pas validatie aan (regel ~239–242)**

```typescript
// Oud:
if (directLight.position !== 'geen' && !directLight.type) return false
if (indirectLight.position !== 'geen' && !indirectLight.type) return false
if (directLight.position !== 'geen' && directLight.type && !directLight.control) return false
if (indirectLight.position !== 'geen' && indirectLight.type && !indirectLight.control) return false

// Nieuw:
const anyLightActive = directLight.position !== 'geen' || indirectLight.position !== 'geen'
if (anyLightActive && !lightType) return false
if (anyLightActive && lightType && !lightControl && lightType !== 'rgbw') return false
// rgbw: afstandsbediening is automatisch, geen aparte keuze nodig → geldig zonder control
```

- [ ] **Stap 4: Pas de calcTotalPrice-aanroepen in de wizard aan**

In de wizard worden `directLight.type/control` doorgegeven aan `calcTotalPrice`. Vervang door:
```typescript
directType: lightType,
indirectType: lightType,  // zelfde type voor beide
lightControl,
```
(verwijder `directControl` en `indirectControl` uit de call)

- [ ] **Stap 5: Pas de `onDirectChange`/`onIndirectChange` callbacks aan**

De callbacks stellen nu alleen `position` in; type en control gaan naar `setLightType`/`setLightControl`.

- [ ] **Stap 6: Pas de save-payload aan**

In `handleSave`/`handleOrder` (de useCallback functies), zorg dat:
```typescript
directLight: { position: directLight.position },
indirectLight: { position: indirectLight.position },
lightType,
lightControl,
```
worden meegestuurd naar de action (i.p.v. de oude structuur met type/control per licht).

- [ ] **Stap 7: Commit**

```bash
git add src/app/configurator/nieuw/configurator-wizard.tsx
git commit -m "refactor: wizard-state naar gedeeld lightType/lightControl"
```

---

### Task 2d — Verlichting-stap UI (step-verlichting.tsx)

**Files:**
- Modify: `src/app/configurator/nieuw/step-verlichting.tsx`

**Huidig:** `LightSection` component rendert positie + type + bediening per sectie (direct en indirect elk apart). Twee instanties in de stap.

**Nieuw:** Twee positie-kiezers (direct en indirect), daarna — als tenminste 1 positie ≠ 'geen' — 1× type-kiezer en 1× bediening-kiezer gedeeld.

- [ ] **Stap 1: Pas de props van de stap aan**

```typescript
interface StepVerlichtingProps {
  shape: ShapeSlug
  width: number
  height: number
  directPosition: string
  indirectPosition: string
  lightType: LightType | null
  lightControl: string | null
  onDirectPositionChange: (pos: string) => void
  onIndirectPositionChange: (pos: string) => void
  onLightTypeChange: (type: LightType) => void
  onLightControlChange: (control: string) => void
  isInternational?: boolean
  controlTooltips?: Record<string, string>
}
```

- [ ] **Stap 2: Verwijder de `LightSection` component (of vereenvoudig tot alleen positiekiezer)**

Maak een `PositionPicker` component:
```typescript
const PositionPicker = memo(function PositionPicker({ title, positions, selected, onChange }: {
  title: string
  positions: string[]
  selected: string
  onChange: (pos: string) => void
}) {
  if (positions.length === 0) return null
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-lx-text-primary">{title}</p>
      <div className="flex flex-wrap gap-2">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => onChange(pos)}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
              selected === pos
                ? 'bg-lx-cta text-white border-lx-cta'
                : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
            }`}
          >
            {POSITION_LABELS[pos]}
          </button>
        ))}
      </div>
    </div>
  )
})
```

- [ ] **Stap 3: Schrijf de hoofd-render van de stap**

```typescript
export default function StepVerlichting({
  shape, width, height,
  directPosition, indirectPosition,
  lightType, lightControl,
  onDirectPositionChange, onIndirectPositionChange,
  onLightTypeChange, onLightControlChange,
  isInternational = false,
  controlTooltips,
}: StepVerlichtingProps) {
  const mult = isInternational ? 1.05 : 1
  const lightTypes: LightType[] = (shape === 'sol' || shape === 'luna') ? ['3000k', '4000k'] : ['3000k', '4000k', 'rgbw', 'cct']
  const anyActive = directPosition !== 'geen' || indirectPosition !== 'geen'
  const directPositions = DIRECT_LIGHT_POSITIONS[shape] ?? []
  const indirectPositions = INDIRECT_LIGHT_POSITIONS[shape] ?? []

  return (
    <div className="space-y-6">
      {/* Directe verlichting positie */}
      {directPositions.length > 0 && (
        <PositionPicker
          title="Directe verlichting"
          positions={directPositions}
          selected={directPosition}
          onChange={pos => {
            onDirectPositionChange(pos)
          }}
        />
      )}

      {/* Indirecte verlichting positie */}
      {indirectPositions.length > 0 && (
        <PositionPicker
          title="Indirecte verlichting"
          positions={indirectPositions}
          selected={indirectPosition}
          onChange={pos => {
            onIndirectPositionChange(pos)
          }}
        />
      )}

      {/* Gedeeld type + bediening — alleen tonen als tenminste 1 licht actief */}
      {anyActive && (
        <div className="pl-0.5 space-y-5 pt-2 border-t border-lx-divider">
          {/* Lichttype */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Lichttype</p>
              {!lightType && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Verplicht</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {lightTypes.map(lt => (
                <button
                  key={lt}
                  onClick={() => {
                    onLightTypeChange(lt)
                    if (CONTROLS_FOR_TYPE[lt][0]?.auto) onLightControlChange(CONTROLS_FOR_TYPE[lt][0].id)
                  }}
                  className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    lightType === lt
                      ? 'bg-lx-panel-bg border-lx-cta text-lx-cta'
                      : 'bg-white border-black/10 text-lx-text-primary hover:border-lx-cta/50'
                  }`}
                >
                  <span className="text-[13px] font-bold">{LIGHT_TYPE_LABELS[lt]}</span>
                  <span className="text-[10.5px] text-lx-text-secondary leading-tight">{LIGHT_TYPE_DESCRIPTIONS[lt]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bediening */}
          {lightType && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Bediening</p>
                {!lightControl && !CONTROLS_FOR_TYPE[lightType][0]?.auto && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Verplicht</span>
                )}
              </div>
              {CONTROLS_FOR_TYPE[lightType][0]?.auto ? (
                <div className="relative flex items-center gap-3 p-3 bg-lx-panel-bg rounded-xl border border-black/8">
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-lx-icon-bg text-lx-cta">
                    {shape === 'op-aanvraag' ? 'Op offerte' : `+€${Math.round(CONTROL_PRICES['afstandsbediening'] * mult)}`}
                  </span>
                  <div className="text-lx-cta"><ControlIcon id="afstandsbediening" active={true} /></div>
                  <div className="pr-14">
                    <p className="text-[13px] font-semibold text-lx-text-primary">Afstandsbediening</p>
                    <p className="text-[11px] text-lx-text-secondary">RGB+W werkt altijd met afstandsbediening</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTROLS_FOR_TYPE[lightType]
                    .filter(ctrl => (shape !== 'sol' && shape !== 'luna') || ['tip-touch', 'afstandsbediening'].includes(ctrl.id))
                    .map(ctrl => {
                      const price = Math.round((CONTROL_PRICES[ctrl.id] ?? 0) * mult)
                      const isActive = lightControl === ctrl.id
                      const tooltip = controlTooltips?.[ctrl.id]
                      return (
                        <div key={ctrl.id} className="relative group/tooltip">
                          <button
                            onClick={() => onLightControlChange(ctrl.id)}
                            className={`relative w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                              isActive
                                ? 'bg-lx-panel-bg border-lx-cta text-lx-cta'
                                : 'bg-white border-black/10 text-lx-text-secondary hover:border-lx-cta/50 hover:text-lx-cta'
                            }`}
                          >
                            <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-lx-icon-bg text-lx-cta' : 'bg-lx-panel-bg text-lx-text-secondary'
                            }`}>
                              {shape === 'op-aanvraag' ? 'Op offerte' : price === 0 ? 'Inbegrepen' : `+€${price}`}
                            </span>
                            <ControlIcon id={ctrl.id} active={isActive} />
                            <span className="text-[11.5px] font-semibold text-center leading-tight text-lx-text-primary">{ctrl.name}</span>
                          </button>
                          {tooltip && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                              <div className="bg-gray-900 text-white text-[11.5px] rounded-lg px-2.5 py-2 w-48 leading-relaxed shadow-lg text-center">{tooltip}</div>
                              <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 4: Verwijder de `LightSection`-component en oud-type `LightConfig`** uit dit bestand als ze nergens anders gebruikt worden.

- [ ] **Stap 5: Commit**

```bash
git add src/app/configurator/nieuw/step-verlichting.tsx
git commit -m "feat: verlichting-stap met gedeeld lichttype en bediening"
```

---

### Task 2e — Save action + DB-migratie

**Files:**
- Modify: `src/lib/actions/configurator.ts`
- Modify: `src/lib/actions/configurator-helpers.ts`
- Create: `supabase/migrations/YYYYMMDD_lighting_shared_control.sql`

- [ ] **Stap 1: Pas de `saveConfiguration`-action aan**

In `src/lib/actions/configurator.ts` (regels ~99–103 en ~187–191), vervang het schrijven van `directLight.type/control` door de nieuwe structuur:

```typescript
// Oud (in selected_options object):
directLight: { position: input.directLight.position, type: input.directLight.type, control: input.directLight.control },
indirectLight: { position: input.indirectLight.position, type: input.indirectLight.type, control: input.indirectLight.control },

// Nieuw:
directLight: { position: input.directLight.position },
indirectLight: { position: input.indirectLight.position },
lightType: input.lightType ?? null,
lightControl: input.lightControl ?? null,
```

- [ ] **Stap 2: Pas `configurator-helpers.ts` aan**

Voeg `lightType` en `lightControl` toe aan de output van `mapDbRowToConfig`:
```typescript
lightType: (row.selected_options?.lightType as LightType | null) ?? null,
lightControl: (row.selected_options?.lightControl as string | null) ?? null,
directLight: row.selected_options?.directLight ?? { position: 'geen' },
indirectLight: row.selected_options?.indirectLight ?? { position: 'geen' },
```

- [ ] **Stap 3: Schrijf de DB-migratie**

Maak `supabase/migrations/20260706_lighting_shared_control.sql`:

```sql
-- Migreer bestaande configuraties naar gedeeld lightType/lightControl.
-- type/control worden uit directLight/indirectLight gehaald en op top-niveau gezet.
-- Bestaande records zonder die velden worden niet gewijzigd (COALESCE → NULL → noop).

UPDATE configurations
SET selected_options = selected_options
  || jsonb_build_object(
       'lightType',
       COALESCE(
         selected_options->'directLight'->>'type',
         selected_options->'indirectLight'->>'type'
       )
     )
  || jsonb_build_object(
       'lightControl',
       COALESCE(
         selected_options->'directLight'->>'control',
         selected_options->'indirectLight'->>'control'
       )
     )
  || jsonb_build_object(
       'directLight',
       (selected_options->'directLight') - 'type' - 'control'
     )
  || jsonb_build_object(
       'indirectLight',
       (selected_options->'indirectLight') - 'type' - 'control'
     )
WHERE
  selected_options ? 'directLight'
  OR selected_options ? 'indirectLight';
```

- [ ] **Stap 4: Run de migratie op de testbranch**

```bash
# Via Supabase CLI op de testbranch:
supabase db push --linked
# Of direct via psql / Supabase Studio SQL-editor
```

Controleer daarna: `SELECT id, selected_options->'lightType', selected_options->'lightControl' FROM configurations LIMIT 10;`

- [ ] **Stap 5: Commit**

```bash
git add src/lib/actions/configurator.ts src/lib/actions/configurator-helpers.ts \
  supabase/migrations/20260706_lighting_shared_control.sql
git commit -m "feat: save/read nieuw lightType/lightControl structuur + DB-migratie"
```

---

### Task 2f — Consumers updaten

**Files (alle lezers van directLight.type/control):**
- Modify: `src/app/(main)/configuraties/configuraties-content.tsx`
- Modify: `src/app/(main)/configuraties/order-button.tsx`
- Modify: `src/app/(main)/dashboard/dashboard-sections.tsx`
- Modify: `src/app/admin/configuraties/config-detail-modal.tsx`
- Modify: `src/lib/actions/ai-configurator.ts`
- Modify: `src/app/configurator/nieuw/ai-intake.tsx`

Overal geldt dezelfde backward-compat leespatroon:
```typescript
const lightType = opts.lightType ?? opts.directLight?.type ?? opts.indirectLight?.type ?? null
const lightControl = opts.lightControl ?? opts.directLight?.control ?? opts.indirectLight?.control ?? null
```

- [ ] **Stap 1: Pas `configuraties-content.tsx` aan**

Zoek regel ~128–181 waar `directLight.type/control` gebruikt wordt voor display. Vervang door:
```typescript
const lichtType = (opts.lightType ?? opts.directLight?.type ?? opts.indirectLight?.type) as string | null
const lichtControl = (opts.lightControl ?? opts.directLight?.control ?? opts.indirectLight?.control) as string | null
```

- [ ] **Stap 2: Pas `order-button.tsx` aan**

Zoek regel ~45–89. Verwijder de apart-per-sectie type/control display; toon `lightType` en `lightControl` eenmalig in de samenvatting.

- [ ] **Stap 3: Pas `dashboard-sections.tsx` aan**

Regel ~369–379: vervang `directLight.type` door het backward-compat patroon.

- [ ] **Stap 4: Pas `config-detail-modal.tsx` aan**

Regel ~22–23 en `getLightSummary()` (~61): update voor nieuw schema.

- [ ] **Stap 5: Pas `ai-configurator.ts` aan**

Regel ~64–83: update het prompt-template en de output-normalisatie. Sol/luna vereiste:
```
Oud: indirectLight.control = 'externe-schakeling', indirectLight.type = '3000k'
Nieuw: lightControl = 'externe-schakeling', lightType = '3000k', directLight.position = 'geen', indirectLight.position = 'rondom'
```

Pas de normalisatieroutine aan (~178–183):
```typescript
// Oud:
if (raw.directLight) raw.directLight.position = 'geen'
if (raw.indirectLight) {
  raw.indirectLight.position = 'rondom'
  raw.indirectLight.control = 'externe-schakeling'
  if (!raw.indirectLight.type || ...) raw.indirectLight.type = '3000k'
}

// Nieuw:
raw.directLight = { position: 'geen' }
raw.indirectLight = { position: 'rondom' }
raw.lightType = (raw.lightType === '3000k' || raw.lightType === '4000k') ? raw.lightType : '3000k'
raw.lightControl = 'externe-schakeling'
```

- [ ] **Stap 6: Pas `ai-intake.tsx` aan**

Regel ~44: `CONTROL_LABELS` bevat de display-naam voor `lightControl`. Geen structuurwijziging nodig, maar controleer of de key die AI terugstuurt (`lightControl`) ook correct wordt weergegeven in de intake-preview.

- [ ] **Stap 7: Commit**

```bash
git add src/app/(main)/configuraties/configuraties-content.tsx \
  src/app/(main)/configuraties/order-button.tsx \
  src/app/(main)/dashboard/dashboard-sections.tsx \
  src/app/admin/configuraties/config-detail-modal.tsx \
  src/lib/actions/ai-configurator.ts \
  src/app/configurator/nieuw/ai-intake.tsx
git commit -m "refactor: consumers updaten naar gedeeld lightType/lightControl"
```

---

## Task 3 — Login-streak telt alleen werkdagen (di–za)

**Context:** Huidige streak-logica telt elke kalenderdag. Werkweek is di–za (JavaScript `getDay()`: 2–6). Zondag = 0, maandag = 1.

**Regels nieuw model:**
- Inloggen op zondag of maandag: geen streak-update (dag telt niet mee, streak wordt ook niet gereset)
- "Vorige dag" in streak-check = vorige werkdag (bv. maandag t/m dinsdag = zaterdag)
- Streak breekt als je een werkdag hebt overgeslagen

**Files:**
- Modify: `src/lib/sidebar-data.ts` (hoofd-logica, ~lines 197–224)
- Modify: `src/app/(main)/dashboard/dashboard-sections.tsx` (~lines 587–595, heeft eigen streak-update check)
- Modify: `src/app/(main)/looox-circle/milestone-card.tsx` (tooltip toevoegen)

### Task 3a — Streak-logica

- [ ] **Stap 1: Voeg helperfuncties toe boven de streak-update in `sidebar-data.ts`**

Voeg toe net boven de `if (!isInternational && !isGroothandel)` block (~regel 199):

```typescript
function isWorkingDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 2 && day <= 6  // di=2 t/m za=6
}

function prevWorkingDay(dateStr: string): string {
  const d = new Date(dateStr)
  do {
    d.setDate(d.getDate() - 1)
  } while (!isWorkingDay(d))
  return d.toISOString().split('T')[0]
}
```

- [ ] **Stap 2: Pas de streak-update aan**

```typescript
if (!isInternational && !isGroothandel) {
  const now = new Date()
  // Niet updaten op zondag of maandag
  if (isWorkingDay(now)) {
    const today = now.toISOString().split('T')[0]
    const streak = streakData as { ... } | null
    if (!streak) {
      void supabase.from('login_streaks').insert({
        user_id: userId, current_streak: 1, longest_streak: 1,
        last_login_date: today, total_days: 1,
      }).then(({ error }) => { if (error) console.error('[streak]', error) })
    } else if (streak.last_login_date !== today) {
      const prevDay = prevWorkingDay(today)
      const newStreak = streak.last_login_date === prevDay ? streak.current_streak + 1 : 1
      const newLongest = Math.max(newStreak, streak.longest_streak)
      void supabase.from('login_streaks').update({
        current_streak: newStreak, longest_streak: newLongest,
        last_login_date: today, total_days: (streak.total_days ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).then(({ error }) => { if (error) console.error('[streak]', error) })
    }
  }
}
```

- [ ] **Stap 3: Controleer `dashboard-sections.tsx`**

Zoek de streak-update in `dashboard-sections.tsx` (~regel 587). Als die ook een eigen update-logica bevat (niet alleen een read), pas dan dezelfde `isWorkingDay`/`prevWorkingDay` patroon toe.

- [ ] **Stap 4: Commit**

```bash
git add src/lib/sidebar-data.ts src/app/(main)/dashboard/dashboard-sections.tsx
git commit -m "feat: login-streak telt alleen werkdagen (di-za)"
```

---

### Task 3b — Tooltip in milestone-card

**Files:**
- Modify: `src/app/(main)/looox-circle/milestone-card.tsx`

- [ ] **Stap 1: Pas `goalText` aan voor streak-milestones**

Regel ~42:
```typescript
// Oud:
if (milestone.goal_type === 'streak') return `${milestone.goal_value} dagen op rij ingelogd`

// Nieuw:
if (milestone.goal_type === 'streak') return `${milestone.goal_value} werkdagen op rij ingelogd`
```

- [ ] **Stap 2: Voeg een tooltip toe bij streak-doelen**

Zoek waar de milestone-kaart de goal-tekst rendert. Voeg een info-icoon toe met tooltip "Werkdagen: dinsdag t/m zaterdag":

```tsx
{milestone.goal_type === 'streak' && (
  <span className="relative group/streak-tip ml-1 inline-flex">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lx-text-secondary/50 cursor-default">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 opacity-0 group-hover/streak-tip:opacity-100 transition-opacity whitespace-nowrap">
      <span className="bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg block">
        Werkdagen: dinsdag t/m zaterdag
      </span>
      <span className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1 block" />
    </span>
  </span>
)}
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/(main)/looox-circle/milestone-card.tsx
git commit -m "feat: streak-milestone toont werkdagen-tooltip (di-za)"
```

---

## Uitrolstrategie

1. **Task 1** (PDF logo) → push naar preview → visuele check → naar main
2. **Task 2a–2b** (types + prijs) → push naar preview → TypeScript-check
3. **Task 2c–2d** (wizard + UI) → push naar preview → handmatig flow testen in de wizard
4. **Task 2e** (migratie) → EERST op testbranch DB draaien → data checken → daarna op main-branch DB
5. **Task 2f** (consumers) → push naar preview → alle overzichten checken
6. **Task 3** (streak) → push naar preview → zaterdag/maandag edge-case bespreken

**Na elke task: code-review met agent (4-ogen-principe) voor merge naar main.**

---

## Openstaand / wacht op gebruiker

- **Logo-bestand** voor Task 1: Mark levert PNG of SVG aan. Tot dan: bestaande SVG-component gecentreerd.
