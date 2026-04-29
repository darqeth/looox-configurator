# Projectspiegel Configurator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een aparte 3-stappen configurator toe voor groothandelaren die projectspiegels (plain glas, geen LED) configureren met staffelprijzen, en verberg LoooX Circle voor deze gebruikers.

**Architecture:** Server-side detectie op `/configurator/nieuw` — als `is_groothandel=true` wordt `<ProjectspiegelConfigurator>` gerenderd, anders de bestaande `<ConfiguratorWizard>`. Data wordt opgeslagen in de bestaande `configurations` tabel met `shape='projectspiegel'` in `selected_options`. Prijslogica zit in een aparte `projectspiegel-config.ts`.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Tailwind CSS

---

### Task 1: DB-migratie + ShapeSlug uitbreiden

**Files:**
- Create: `supabase/projectspiegel-migration.sql`
- Modify: `src/lib/configurator-config.ts` (regel 1 — ShapeSlug type)

- [ ] **Stap 1: Maak migratiebestand aan**

```sql
-- supabase/projectspiegel-migration.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_groothandel boolean NOT NULL DEFAULT false;
```

- [ ] **Stap 2: Voer migratie uit in Supabase dashboard**

Ga naar Supabase → SQL Editor → plak en voer de SQL uit. Controleer dat de kolom bestaat in de `profiles` tabel.

- [ ] **Stap 3: Voeg 'projectspiegel' toe aan ShapeSlug**

In `src/lib/configurator-config.ts`, verander regel 1:

```ts
export type ShapeSlug = 'rechthoek' | 'rond' | 'organic' | 'op-aanvraag' | 'rounded-rect' | 'ovaal' | 'arc' | 'projectspiegel'
```

Voeg ook entries toe aan de twee Records (zodat TypeScript niet klaagt), na de bestaande `'op-aanvraag'` entries:

```ts
// In DIRECT_LIGHT_POSITIONS:
projectspiegel: [],

// In INDIRECT_LIGHT_POSITIONS:
projectspiegel: [],
```

- [ ] **Stap 4: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

Verwacht: geen nieuwe fouten.

- [ ] **Stap 5: Commit**

```bash
git add supabase/projectspiegel-migration.sql src/lib/configurator-config.ts
git commit -m "feat: add is_groothandel profile flag + projectspiegel ShapeSlug"
```

---

### Task 2: Prijsmodule

**Files:**
- Create: `src/lib/projectspiegel-config.ts`

- [ ] **Stap 1: Maak het bestand aan**

```ts
// src/lib/projectspiegel-config.ts

export type Glasdikte = '4' | '5' | '6'

export const GLASDIKTE_PRIJS_M2: Record<Glasdikte, number> = {
  '4': 30.78,
  '5': 34.68,
  '6': 36.36,
}

export const POLIJSTEN_PER_M = 4.55
export const OPHANGING_KLEIN = 3.80   // oppervlakte ≤ 0.8 m²
export const OPHANGING_GROOT = 6.18   // oppervlakte > 0.8 m² (ook >1.6 m² TBD — juiste prijs opzoeken)
export const VERPAKKING_PER_STUK = 9.16

export const STAFFEL_KORTINGEN = [
  { vanaf: 500, pct: 0.45 },
  { vanaf: 250, pct: 0.43 },
  { vanaf: 100, pct: 0.40 },
  { vanaf:  50, pct: 0.35 },
  { vanaf:  20, pct: 0.283 },
  { vanaf:  10, pct: 0.213 },
  { vanaf:   1, pct: 0 },
] as const

// Toon tip wanneer qty binnen deze afstand van de volgende grens ligt
const STAFFEL_TIP_WINDOW: Record<number, number> = {
  10: 3, 20: 5, 50: 10, 100: 15, 250: 30, 500: 50,
}

export function calcBasisprijs(params: {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  ophanging: boolean
  verpakkingPerStuk: boolean
}): number {
  const opp   = (params.lengte / 100) * (params.hoogte / 100)
  const omtrek = 2 * ((params.lengte + params.hoogte) / 100)
  let prijs = opp * GLASDIKTE_PRIJS_M2[params.glasdikte]
  prijs += omtrek * POLIJSTEN_PER_M
  if (params.ophanging) prijs += opp <= 0.8 ? OPHANGING_KLEIN : OPHANGING_GROOT
  if (params.verpakkingPerStuk) prijs += VERPAKKING_PER_STUK
  return Math.round(prijs * 100) / 100
}

export function getStaffelKorting(qty: number): number {
  return STAFFEL_KORTINGEN.find(s => qty >= s.vanaf)?.pct ?? 0
}

export function calcStuksprijs(basisprijs: number, qty: number): number {
  return Math.round(basisprijs * (1 - getStaffelKorting(qty)) * 100) / 100
}

export function calcTotaal(basisprijs: number, qty: number): number {
  return Math.round(calcStuksprijs(basisprijs, qty) * qty * 100) / 100
}

export type StaffelTip = {
  stuks: number        // hoeveel extra stuks nodig
  tierQty: number      // de grens die gehaald wordt
  stuksprijsNu: number
  stuksprijsVolgend: number
}

export function getStaffelTip(basisprijs: number, qty: number): StaffelTip | null {
  const tiers = [10, 20, 50, 100, 250, 500]
  const nextTier = tiers.find(t => t > qty)
  if (!nextTier) return null
  const window = STAFFEL_TIP_WINDOW[nextTier] ?? 5
  if (nextTier - qty > window) return null
  return {
    stuks: nextTier - qty,
    tierQty: nextTier,
    stuksprijsNu: calcStuksprijs(basisprijs, qty),
    stuksprijsVolgend: calcStuksprijs(basisprijs, nextTier),
  }
}

export const VERPAKKING_DREMPEL = 25  // onder deze qty altijd verpakken per stuk
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/lib/projectspiegel-config.ts
git commit -m "feat: projectspiegel pricing module met staffelkortingen"
```

---

### Task 3: Save server action

**Files:**
- Modify: `src/lib/actions/configurator.ts`

- [ ] **Stap 1: Voeg type en functie toe aan het einde van `configurator.ts`**

```ts
// Voeg toe na de bestaande exports

export type SaveProjectspiegelInput = {
  lengte: number
  hoogte: number
  glasdikte: '4' | '5' | '6'
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
  reference: string
}

export async function saveProjectspiegelConfiguration(input: SaveProjectspiegelInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { calcBasisprijs, calcTotaal } = await import('@/lib/projectspiegel-config')
  const basisprijs = calcBasisprijs({
    lengte: input.lengte,
    hoogte: input.hoogte,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    verpakkingPerStuk: input.verpakkingPerStuk,
  })
  const totalPrice = calcTotaal(basisprijs, input.quantity)

  const selectedOptionsJson = {
    shape: 'projectspiegel' as const,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    voormonteren: input.voormonteren,
    verpakkingPerStuk: input.verpakkingPerStuk,
    quantity: input.quantity,
    reference: input.reference,
    description: '',
    diameter: null,
    organicSizeKey: null,
    glasKleur: 'helder',
    directLight: { position: 'geen', type: null, control: null },
    indirectLight: { position: 'geen', type: null, control: null },
    extras: [],
    optionSubChoices: {},
    attachmentUrl: null,
  }

  const { error } = await supabase.from('configurations').insert({
    user_id: user.id,
    product_id: DEFAULT_PRODUCT_ID,
    name: input.projectName,
    width: input.lengte,
    height: input.hoogte,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: 'saved',
    article_number: generateArticleNumber(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/lib/actions/configurator.ts
git commit -m "feat: saveProjectspiegelConfiguration server action"
```

---

### Task 4: Stap 1 — Afmeting component

**Files:**
- Create: `src/app/configurator/nieuw/projectspiegel/step-afmeting.tsx`

- [ ] **Stap 1: Maak het bestand aan**

```tsx
// src/app/configurator/nieuw/projectspiegel/step-afmeting.tsx
'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Glasdikte } from '@/lib/projectspiegel-config'

interface StepAfmetingProps {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  onChange: (updates: Partial<{ lengte: number; hoogte: number; glasdikte: Glasdikte }>) => void
}

const MIN = 20
const MAX = 300

const DimInput = memo(function DimInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setRaw(String(value)) }, [value])

  function commit(str: string) {
    const v = Math.min(MAX, Math.max(MIN, parseInt(str) || MIN))
    onChange(v)
    setRaw(String(v))
  }

  const step = useCallback((next: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(next), 150)
  }, [onChange])

  const parsed = parseInt(raw)
  const isValid = !isNaN(parsed) && parsed >= MIN && parsed <= MAX

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => step(Math.max(MIN, value - 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >−</button>
        <div className="relative flex-1">
          <input
            type="number"
            value={raw}
            min={MIN}
            max={MAX}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(raw) }}
            className={`w-full h-9 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none transition-colors bg-white ${
              isValid ? 'border-black/12 focus:border-lx-cta' : 'border-red-400 bg-red-50'
            }`}
          />
        </div>
        <button
          onClick={() => step(Math.min(MAX, value + 1))}
          tabIndex={-1}
          className="w-9 h-9 rounded-xl bg-lx-panel-bg border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center flex-shrink-0"
        >+</button>
        <span className="text-[13px] text-lx-text-secondary font-medium w-6">cm</span>
      </div>
      {!isValid && <p className="text-[11px] text-red-500">Min. {MIN} cm — Max. {MAX} cm</p>}
    </div>
  )
})

export default function StepAfmeting({ lengte, hoogte, glasdikte, onChange }: StepAfmetingProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <DimInput label="Lengte" value={lengte} onChange={(v) => onChange({ lengte: v })} />
        <DimInput label="Hoogte" value={hoogte} onChange={(v) => onChange({ hoogte: v })} />
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide">Glasdikte</p>
        <div className="flex gap-2">
          {(['4', '5', '6'] as Glasdikte[]).map((d) => (
            <button
              key={d}
              onClick={() => onChange({ glasdikte: d })}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                glasdikte === d
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-primary border-black/12 hover:border-lx-cta hover:text-lx-cta'
              }`}
            >
              {d} mm
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-lx-text-secondary">
        Minimale afmeting: {MIN} cm — Maximale afmeting: {MAX} cm
      </p>
    </div>
  )
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/configurator/nieuw/projectspiegel/step-afmeting.tsx
git commit -m "feat: projectspiegel stap 1 — afmeting component"
```

---

### Task 5: Stap 2 — Opties component

**Files:**
- Create: `src/app/configurator/nieuw/projectspiegel/step-opties.tsx`

- [ ] **Stap 1: Maak het bestand aan**

```tsx
// src/app/configurator/nieuw/projectspiegel/step-opties.tsx
'use client'

interface StepOptiesProps {
  ophanging: boolean
  voormonteren: boolean
  onChange: (updates: Partial<{ ophanging: boolean; voormonteren: boolean }>) => void
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-lx-divider last:border-0">
      <div>
        <p className="text-[13px] font-medium text-lx-text-primary">{label}</p>
        {description && <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            className={`px-4 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${
              value === v
                ? 'bg-lx-cta text-white border-lx-cta'
                : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta hover:text-lx-cta'
            }`}
          >
            {v ? 'Ja' : 'Nee'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StepOpties({ ophanging, voormonteren, onChange }: StepOptiesProps) {
  return (
    <div className="bg-lx-panel-bg rounded-2xl px-4">
      <ToggleRow
        label="Ophanging"
        description="Ophangmateriaal wordt meegeleverd"
        value={ophanging}
        onChange={(v) => onChange({ ophanging: v })}
      />
      {ophanging && (
        <ToggleRow
          label="Voormonteren"
          description="Ophangmateriaal wordt voorgemonteerd geleverd (geen meerprijs)"
          value={voormonteren}
          onChange={(v) => onChange({ voormonteren: v })}
        />
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/configurator/nieuw/projectspiegel/step-opties.tsx
git commit -m "feat: projectspiegel stap 2 — opties component"
```

---

### Task 6: Stap 3 — Samenvatting component

**Files:**
- Create: `src/app/configurator/nieuw/projectspiegel/step-samenvatting.tsx`

- [ ] **Stap 1: Maak het bestand aan**

```tsx
// src/app/configurator/nieuw/projectspiegel/step-samenvatting.tsx
'use client'

import { useState, useCallback } from 'react'
import {
  Glasdikte,
  calcBasisprijs,
  calcStuksprijs,
  calcTotaal,
  getStaffelTip,
  STAFFEL_KORTINGEN,
  VERPAKKING_DREMPEL,
} from '@/lib/projectspiegel-config'

interface StepSamenvattingProps {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
  saving: boolean
  onVerpakkingChange: (v: boolean) => void
  onQuantityChange: (v: number) => void
  onProjectNameChange: (v: string) => void
  onGoToStep: (step: number) => void
  onSave: () => void
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-lx-divider last:border-0">
      <span className="text-[12.5px] text-lx-text-secondary font-medium flex-shrink-0 w-32">{label}</span>
      <span className="text-[13px] text-lx-text-primary font-medium flex-1">{value}</span>
      <button onClick={onEdit} className="text-[12px] text-lx-cta font-semibold hover:underline flex-shrink-0">
        Wijzigen
      </button>
    </div>
  )
}

export default function StepSamenvatting({
  lengte, hoogte, glasdikte, ophanging, voormonteren,
  verpakkingPerStuk, quantity, projectName, saving,
  onVerpakkingChange, onQuantityChange, onProjectNameChange,
  onGoToStep, onSave,
}: StepSamenvattingProps) {
  const basisprijs = calcBasisprijs({ lengte, hoogte, glasdikte, ophanging, verpakkingPerStuk })
  const stuksprijs = calcStuksprijs(basisprijs, quantity)
  const totaal     = calcTotaal(basisprijs, quantity)
  const korting    = STAFFEL_KORTINGEN.find(s => quantity >= s.vanaf)?.pct ?? 0
  const tip        = getStaffelTip(basisprijs, quantity)

  const showVerpakkingToggle = quantity >= VERPAKKING_DREMPEL

  const effectiveVerpakking = quantity < VERPAKKING_DREMPEL ? true : verpakkingPerStuk

  const stepQty = useCallback((delta: number) => {
    onQuantityChange(Math.max(1, quantity + delta))
  }, [quantity, onQuantityChange])

  return (
    <div className="space-y-5">
      {/* Configuratie overzicht */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Configuratie</p>
        <Row
          label="Afmeting"
          value={`${lengte} × ${hoogte} cm · ${glasdikte} mm`}
          onEdit={() => onGoToStep(0)}
        />
        <Row
          label="Ophanging"
          value={ophanging ? (voormonteren ? 'Ja, voorgemonteerd' : 'Ja') : 'Nee'}
          onEdit={() => onGoToStep(1)}
        />
      </div>

      {/* Staffelprijzen tabel */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-3">Staffelprijzen (netto ex. BTW)</p>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-lx-text-secondary">
              <th className="text-left pb-2 font-medium">Aantal</th>
              <th className="text-right pb-2 font-medium">Korting</th>
              <th className="text-right pb-2 font-medium">Per stuk</th>
            </tr>
          </thead>
          <tbody>
            {[...STAFFEL_KORTINGEN].reverse().map((tier, i, arr) => {
              const nextTier = arr[i + 1]
              const label = nextTier
                ? `${tier.vanaf}–${nextTier.vanaf - 1} stuks`
                : `${tier.vanaf}+ stuks`
              const isActive = korting === tier.pct
              return (
                <tr
                  key={tier.vanaf}
                  className={`border-t border-lx-divider ${isActive ? 'font-semibold text-lx-cta' : 'text-lx-text-primary'}`}
                >
                  <td className="py-2">{tier.vanaf === 1 ? '1–9 stuks' : label}</td>
                  <td className="py-2 text-right">{tier.pct > 0 ? `−${(tier.pct * 100).toFixed(1)}%` : '—'}</td>
                  <td className="py-2 text-right">€{calcStuksprijs(basisprijs, tier.vanaf).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Staffel-tip */}
      {tip && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
          <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Bestel er nog <strong>{tip.stuks}</strong> meer (totaal <strong>{tip.tierQty} stuks</strong>) en betaal{' '}
            <strong>€{tip.stuksprijsVolgend.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> per stuk{' '}
            in plaats van €{tip.stuksprijsNu.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} —{' '}
            bespaar <strong>€{(tip.stuksprijsNu - tip.stuksprijsVolgend).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> per stuk.
          </p>
        </div>
      )}

      {/* Aantal + verpakking */}
      <div className="bg-lx-panel-bg rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-lx-text-primary flex-shrink-0">Aantal</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepQty(-1)}
              className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center"
            >−</button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-9 rounded-xl border-2 border-lx-cta text-center text-[14px] font-bold text-lx-cta bg-white outline-none"
            />
            <button
              onClick={() => stepQty(1)}
              className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {showVerpakkingToggle && (
          <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
            <div>
              <p className="text-[13px] font-medium text-lx-text-primary">Niet per stuk verpakken</p>
              <p className="text-[11.5px] text-lx-text-secondary">Bulk verpakking — geen folie/hoekjes per spiegel (−€9,16/stuk)</p>
            </div>
            <button
              role="switch"
              aria-checked={!verpakkingPerStuk}
              onClick={() => onVerpakkingChange(!verpakkingPerStuk)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${!verpakkingPerStuk ? 'bg-lx-cta' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${!verpakkingPerStuk ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}
      </div>

      {/* Prijs */}
      <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-lx-text-secondary">
            {quantity} × €{stuksprijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {korting > 0 && <span className="ml-1.5 text-lx-cta font-semibold">(−{(korting * 100).toFixed(1)}%)</span>}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-lx-divider pt-1.5">
          <span className="text-[12.5px] text-lx-text-secondary font-medium">Totaal netto ex. BTW</span>
          <span className="text-[18px] font-bold text-lx-cta">
            €{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Projectnaam */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary">Projectgegevens</p>
        <div>
          <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">
            Projectnaam <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Bijv. Badkamer renovatie De Vries"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
          />
        </div>
      </div>

      {/* Actie */}
      <button
        onClick={onSave}
        disabled={!projectName.trim() || saving}
        className="w-full h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Opslaan…' : 'Opslaan als offerte'}
      </button>
      {!projectName.trim() && (
        <p className="text-[11px] text-lx-text-secondary text-center">Vul een projectnaam in om op te slaan</p>
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/configurator/nieuw/projectspiegel/step-samenvatting.tsx
git commit -m "feat: projectspiegel stap 3 — samenvatting met staffelprijzen en tip"
```

---

### Task 7: Projectspiegel wizard root

**Files:**
- Create: `src/app/configurator/nieuw/projectspiegel/index.tsx`

- [ ] **Stap 1: Maak het bestand aan**

```tsx
// src/app/configurator/nieuw/projectspiegel/index.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Glasdikte, VERPAKKING_DREMPEL } from '@/lib/projectspiegel-config'
import { saveProjectspiegelConfiguration } from '@/lib/actions/configurator'
import StepAfmeting from './step-afmeting'
import StepOpties from './step-opties'
import StepSamenvatting from './step-samenvatting'

const STEPS = [
  { label: 'Afmeting' },
  { label: 'Opties' },
  { label: 'Samenvatting' },
]

export default function ProjectspiegelConfigurator() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(0)
  const [lengte, setLengte] = useState(120)
  const [hoogte, setHoogte] = useState(80)
  const [glasdikte, setGlasdikte] = useState<Glasdikte>('5')
  const [ophanging, setOphanging] = useState(true)
  const [voormonteren, setVoormonteren] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [verpakkingPerStuk, setVerpakkingPerStuk] = useState(true)
  const [projectName, setProjectName] = useState('')

  const effectiveVerpakking = quantity < VERPAKKING_DREMPEL ? true : verpakkingPerStuk

  function handleQuantityChange(v: number) {
    setQuantity(v)
    // Als qty terugvalt onder drempel, reset verpakking naar aan
    if (v < VERPAKKING_DREMPEL) setVerpakkingPerStuk(true)
  }

  function handleSave() {
    startTransition(async () => {
      await saveProjectspiegelConfiguration({
        lengte,
        hoogte,
        glasdikte,
        ophanging,
        voormonteren,
        verpakkingPerStuk: effectiveVerpakking,
        quantity,
        projectName,
        reference: '',
      })
      router.push('/configuraties')
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-lx-divider">
      {/* Stappen header */}
      <div className="bg-white border-b border-lx-divider sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-1.5 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                    i < step ? 'bg-lx-cta text-white' :
                    i === step ? 'bg-lx-cta text-white' :
                    'bg-lx-panel-bg text-lx-text-secondary'
                  }`}>
                    {i < step ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    ) : i + 1}
                  </span>
                  <span className={`text-[12px] font-semibold hidden sm:inline ${i === step ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-lx-divider mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-lx-divider p-5">
          <h2 className="text-[16px] font-semibold text-lx-text-primary mb-5">
            {STEPS[step].label}
          </h2>

          {step === 0 && (
            <StepAfmeting
              lengte={lengte}
              hoogte={hoogte}
              glasdikte={glasdikte}
              onChange={(u) => {
                if (u.lengte !== undefined) setLengte(u.lengte)
                if (u.hoogte !== undefined) setHoogte(u.hoogte)
                if (u.glasdikte !== undefined) setGlasdikte(u.glasdikte)
              }}
            />
          )}

          {step === 1 && (
            <StepOpties
              ophanging={ophanging}
              voormonteren={voormonteren}
              onChange={(u) => {
                if (u.ophanging !== undefined) setOphanging(u.ophanging)
                if (u.voormonteren !== undefined) setVoormonteren(u.voormonteren)
              }}
            />
          )}

          {step === 2 && (
            <StepSamenvatting
              lengte={lengte}
              hoogte={hoogte}
              glasdikte={glasdikte}
              ophanging={ophanging}
              voormonteren={voormonteren}
              verpakkingPerStuk={effectiveVerpakking}
              quantity={quantity}
              projectName={projectName}
              saving={isPending}
              onVerpakkingChange={setVerpakkingPerStuk}
              onQuantityChange={handleQuantityChange}
              onProjectNameChange={setProjectName}
              onGoToStep={setStep}
              onSave={handleSave}
            />
          )}
        </div>

        {/* Navigatie */}
        {step < 2 && (
          <div className="flex gap-3 mt-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 h-11 rounded-xl border border-black/12 text-lx-text-primary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors"
              >
                Terug
              </button>
            )}
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors"
            >
              Volgende stap
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/configurator/nieuw/projectspiegel/
git commit -m "feat: projectspiegel configurator wizard (3 stappen)"
```

---

### Task 8: Route detectie

**Files:**
- Modify: `src/app/configurator/nieuw/page.tsx`

- [ ] **Stap 1: Pas `page.tsx` aan**

Vervang de volledige inhoud van `src/app/configurator/nieuw/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let korting = 50
  let canSeePurchasePrices = true
  let canOrder = true
  let isInternational = false
  let isGroothandel = false

  if (user) {
    const [{ data: profile }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('is_international, is_groothandel, korting').eq('id', user.id).single(),
      supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
    ])

    const isManager = !memberData || memberData.role === 'manager'
    canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
    canOrder = isManager || (memberData?.can_order ?? true)
    isInternational = profile?.is_international ?? false
    isGroothandel = profile?.is_groothandel ?? false
    korting = profile?.korting ?? 50
  }

  if (isGroothandel) {
    return <ProjectspiegelConfigurator />
  }

  return (
    <ConfiguratorWizard
      korting={korting}
      canSeePurchasePrices={canSeePurchasePrices}
      canOrder={canOrder}
      isInternational={isInternational}
    />
  )
}
```

- [ ] **Stap 2: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/configurator/nieuw/page.tsx
git commit -m "feat: detecteer is_groothandel op configurator-route"
```

---

### Task 9: Admin toggle

**Files:**
- Modify: `src/lib/actions/admin.ts`
- Modify: `src/app/admin/gebruikers/user-row.tsx`
- Modify: `src/app/admin/gebruikers/user-modal.tsx`

- [ ] **Stap 1: Voeg `toggleGroothandel` toe aan `admin.ts`**

Voeg toe direct na `toggleInternational` (rond regel 14):

```ts
export async function toggleGroothandel(userId: string, value: boolean): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('profiles').update({ is_groothandel: value }).eq('id', userId)
}
```

Voeg ook `toggleGroothandel` toe aan de imports van `createAdminClient` als die er nog niet is (kijk naar de bestaande import).

- [ ] **Stap 2: Voeg `is_groothandel` toe aan `UserRowProfile` type**

In `src/app/admin/gebruikers/user-row.tsx`, voeg toe na `is_sub_admin: boolean`:

```ts
is_groothandel: boolean | null
```

- [ ] **Stap 3: Voeg toggle toe aan `user-modal.tsx`**

Voeg bovenaan de state-declaraties toe (na `isInternational`):

```ts
const [isGroothandel, setIsGroothandel] = useState(profile.is_groothandel ?? false)
```

Voeg `toggleGroothandel` toe aan de imports:

```ts
import {
  updateKorting,
  toggleInternational,
  toggleGroothandel,
  // ... rest
} from '@/lib/actions/admin'
```

Voeg handler toe (na `handleToggleInternational`):

```ts
function handleToggleGroothandel() {
  const next = !isGroothandel
  setIsGroothandel(next)
  startTransition(async () => {
    await toggleGroothandel(profile.id, next)
  })
}
```

Voeg toggle toe in de "Dealer instellingen" sectie, direct na de internationale toggle (na de afsluitende `</div>` van Buitenlandtoeslag):

```tsx
{/* Groothandel */}
<div className="flex items-center justify-between mt-4 pt-4 border-t border-lx-divider">
  <div>
    <p className="text-[13px] font-medium text-lx-text-primary">Groothandelaar</p>
    <p className="text-[11.5px] text-lx-text-secondary">Toegang tot projectspiegel configurator — geen reguliere spiegels of milestones</p>
  </div>
  <button
    role="switch"
    aria-checked={isGroothandel}
    onClick={handleToggleGroothandel}
    disabled={isPending}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40 cursor-pointer ${isGroothandel ? 'bg-lx-cta' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isGroothandel ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
</div>
```

- [ ] **Stap 4: Voeg `is_groothandel` toe aan de profile select in `gebruikers/page.tsx`**

Zoek de query die `UserRowProfile` velden ophaalt en voeg `is_groothandel` toe aan de select string. Zoek naar:

```ts
.select('id, full_name, email, company, phone, tier, approval_status, created_at, korting, is_international, is_admin, is_sub_admin, company_id, ...')
```

Voeg `, is_groothandel` toe.

- [ ] **Stap 5: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 6: Commit**

```bash
git add src/lib/actions/admin.ts src/app/admin/gebruikers/
git commit -m "feat: is_groothandel toggle in admin gebruikersbeheer"
```

---

### Task 10: Sidebar & milestones

**Files:**
- Modify: `src/lib/sidebar-data.ts`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/(main)/dashboard/dashboard-content.tsx`

- [ ] **Stap 1: Pas `sidebar-data.ts` aan**

Voeg `isGroothandel` toe aan `SidebarData` type:

```ts
export type SidebarData = {
  // ... bestaande velden
  isInternational: boolean
  isGroothandel: boolean    // ← toevoegen
  // ...
}
```

In `fetchSidebarData`, voeg toe na `const isInternational = ...`:

```ts
const isGroothandel = (profile as { is_groothandel?: boolean } | null)?.is_groothandel ?? false
```

Voeg `is_groothandel` toe aan de profile select string:

```ts
supabase.from('profiles').select('full_name, company, company_id, tier, is_admin, is_sub_admin, avatar_url, is_international, is_groothandel')
```

Vervang elke `isInternational ?` check in de Promise.all door `isInternational || isGroothandel ?`:

```ts
(isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('milestones')...
(isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('user_milestones')...
(isInternational || isGroothandel) ? Promise.resolve({ data: 0, error: null }) : supabase.rpc('sum_order_revenue'...
(isInternational || isGroothandel) ? Promise.resolve({ data: null, error: null }) : supabase.from('login_streaks')...
```

Voeg `isGroothandel` toe aan de return:

```ts
return {
  // ... bestaande velden
  isGroothandel,
  closestMilestone: (isInternational || isGroothandel) ? null : closest,
}
```

- [ ] **Stap 2: Pas `sidebar.tsx` aan**

Voeg `isGroothandel?: boolean` toe aan de props interface. Vervang `!isInternational` checks die LoooX Circle betreffen door `!isInternational && !isGroothandel`. Voeg `isGroothandel={sidebar.isGroothandel}` toe in alle layouts die Sidebar renderen (`src/app/(main)/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/configurator/layout.tsx`).

- [ ] **Stap 3: Pas `dashboard-content.tsx` aan**

Voeg `isGroothandel?: boolean` toe aan de props interface. Vervang `!isInternational` check bij de LoooX Circle widget door `!isInternational && !isGroothandel`. Pas de `DashboardContent` aanroep in `dashboard/page.tsx` aan — voeg toe:

```tsx
// In dashboard/page.tsx profile select, voeg 'is_groothandel' toe:
supabase.from('profiles').select('full_name, company, notifications_read_at, is_international, is_groothandel')

// En pass door:
const isGroothandel = profile?.is_groothandel ?? false
// ...
<DashboardContent
  userId={user.id}
  companyId={companyId}
  isInternational={isInternational}
  isGroothandel={isGroothandel}
/>
```

- [ ] **Stap 4: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 5: Commit**

```bash
git add src/lib/sidebar-data.ts src/components/layout/sidebar.tsx src/app/\(main\)/dashboard/
git commit -m "feat: verberg LoooX Circle en sla milestones over voor groothandelaren"
```

---

### Task 11: Producten & Prijzen — Projectspiegels tab

**Files:**
- Modify: `src/app/admin/producten/page.tsx`

- [ ] **Stap 1: Importeer projectspiegel constanten**

Voeg bovenaan `page.tsx` toe na de bestaande imports:

```ts
import {
  GLASDIKTE_PRIJS_M2,
  STAFFEL_KORTINGEN,
  POLIJSTEN_PER_M,
  OPHANGING_KLEIN,
  OPHANGING_GROOT,
  VERPAKKING_PER_STUK,
} from '@/lib/projectspiegel-config'
```

- [ ] **Stap 2: Voeg `ProjectspiegelsTab` component toe**

Voeg toe vóór de `PRODUCT_CATS` const:

```tsx
function ProjectspiegelsTab() {
  return (
    <div className="space-y-5">
      <SectionCard title="Glasprijs per m²" subtitle="Basisprijs glas voor projectspiegels (geen LED, geen frame).">
        <div className="space-y-0">
          {(['4', '5', '6'] as const).map((d, i, arr) => (
            <div key={d} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-lx-divider' : ''}`}>
              <span className="text-[12.5px] text-lx-text-primary font-medium">{d} mm</span>
              <span className="text-[12.5px] font-semibold text-lx-text-primary">{fmt(GLASDIKTE_PRIJS_M2[d])}/m²</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Kanten polijsten" subtitle="Altijd inbegrepen. Prijs per lopende meter × omtrek (2 × lengte + 2 × hoogte).">
        <InfoRow label="Prijs per lopende meter" value={`${fmt(POLIJSTEN_PER_M)}/m`} />
      </SectionCard>

      <SectionCard title="Ophanging">
        <InfoRow label="Oppervlakte ≤ 0,8 m²" value={fmt(OPHANGING_KLEIN)} />
        <InfoRow label="Oppervlakte > 0,8 m²" value={`${fmt(OPHANGING_GROOT)} (ook >1,6 m² — TBD)`} />
      </SectionCard>

      <SectionCard title="Verpakking per stuk" subtitle="Folie en hoekbeschermers. Altijd inbegrepen bij <25 stuks. Optioneel ≥25 stuks.">
        <InfoRow label="Prijs per stuk" value={fmt(VERPAKKING_PER_STUK)} />
        <InfoRow label="Drempel" value="< 25 stuks: altijd aan · ≥ 25 stuks: optioneel" />
      </SectionCard>

      <SectionCard title="Staffelkortingen" subtitle="Korting op de basisprijs per stuk op basis van besteld aantal.">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-lx-text-secondary">
              <th className="text-left pb-2 font-medium">Vanaf</th>
              <th className="text-right pb-2 font-medium">Korting</th>
            </tr>
          </thead>
          <tbody>
            {[...STAFFEL_KORTINGEN].reverse().map((tier, i) => (
              <tr key={tier.vanaf} className={i < STAFFEL_KORTINGEN.length - 1 ? 'border-b border-lx-divider' : ''}>
                <td className="py-2.5 font-medium text-lx-text-primary">{tier.vanaf}+ stuks</td>
                <td className="py-2.5 text-right font-semibold text-lx-text-primary">
                  {tier.pct > 0 ? `−${(tier.pct * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
```

- [ ] **Stap 3: Voeg tab toe aan `SHAPE_TABS`**

Voeg toe als laatste item in `SHAPE_TABS`:

```ts
{ id: 'projectspiegels', label: 'Projectspiegels', component: ProjectspiegelsTab },
```

- [ ] **Stap 4: Check TypeScript**

```bash
cd "/Users/mark/claude code/LoooX Configurator" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 5: Commit**

```bash
git add src/app/admin/producten/page.tsx
git commit -m "feat: projectspiegels tab in Producten & Prijzen"
```

---

## Verificatie

1. Run dev server: `npm run dev`
2. Voer de SQL migratie uit in Supabase als dat nog niet gedaan is
3. **Groothandelaar flow:**
   - Ga naar admin → gebruikers → zet `is_groothandel = true` op een testgebruiker
   - Log in als die gebruiker → geen LoooX Circle in sidebar, geen milestone widget op dashboard
   - Ga naar `/configurator/nieuw` → ziet 3-stappen projectspiegel flow (geen vormkeuze)
   - Configureer 120×80, 5mm, ophanging ja, qty=1 → controleer prijs: basisprijs ≈ €57,67
   - Verander qty naar 8 → staffel-tip verschijnt ("Bestel er nog 2 meer")
   - Verander qty naar 10 → tip verdwijnt, korting −21,3% zichtbaar
   - Verander qty naar 25 → "Niet per stuk verpakken" toggle verschijnt
   - Sla op → verschijnt in `/configuraties`
4. **Reguliere gebruiker:** `/configurator/nieuw` toont normale flow
5. **Admin:** `/admin/gebruikers` → modal heeft Groothandelaar toggle
6. **Admin:** `/admin/producten` → tab "Projectspiegels" toont staffelprijzen
