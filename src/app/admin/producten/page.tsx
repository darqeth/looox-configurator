'use client'

import { useState } from 'react'
import {
  GLAS_KLEUREN,
  GLAS_PRIJS_M2,
  VASTE_TOESLAG,
  LED_PRIJS_PER_METER,
  HEATING_MATRIX,
  ROND_DIAMETERS,
  ROND_BASIS_GLAS,
  ROND_FRAME_PRIJZEN,
  ORGANIC_SIZES,
  EXTRA_OPTIONS,
  CONTROL_PRICES,
} from '@/lib/configurator-config'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return `€${n.toLocaleString('nl-NL')}` }
function pi(d: number, sub = 0) { return (Math.PI * (d - sub) / 100).toFixed(2) }

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-lx-divider">
        <p className="text-[14px] font-semibold text-lx-text-primary">{title}</p>
        {subtitle && <p className="text-[12px] text-lx-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-lx-divider last:border-0">
      <span className="text-[12.5px] text-lx-text-secondary">{label}</span>
      <span className="text-[12.5px] font-semibold text-lx-text-primary text-right">{value}</span>
    </div>
  )
}

// ─── Rechthoek ───────────────────────────────────────────────────────────────

const DIRECT_POSITIONS = [
  { key: 'geen',          label: 'Geen' },
  { key: 'boven',         label: 'Boven' },
  { key: 'boven-beneden', label: 'Boven + Beneden' },
  { key: 'links-rechts',  label: 'Links + Rechts' },
  { key: 'rondom',        label: 'Rondom' },
]

function RechthoekTab() {
  return (
    <div className="space-y-5">
      {/* Glasprijs per m² */}
      <SectionCard
        title="Glasprijs per m²"
        subtitle="Prijs varieert per glaskleur en directe lichtpositie (zandstraalbewerking). Indirecte verlichting heeft geen invloed op de glasprijs."
      >
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Glaskleur</th>
                {DIRECT_POSITIONS.map(p => (
                  <th key={p.key} className="text-right pb-2 px-2 text-lx-text-secondary font-medium whitespace-nowrap">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GLAS_KLEUREN.map((g, gi) => (
                <tr key={g.id} className={gi < GLAS_KLEUREN.length - 1 ? 'border-b border-lx-divider' : ''}>
                  <td className="py-2.5 pr-4 font-medium text-lx-text-primary">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      {g.name}
                    </div>
                  </td>
                  {DIRECT_POSITIONS.map(p => (
                    <td key={p.key} className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">
                      {fmt(GLAS_PRIJS_M2[g.id][p.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider flex items-center justify-between">
          <span className="text-[12.5px] text-lx-text-secondary">Vaste productiekosten (per spiegel)</span>
          <span className="text-[12.5px] font-semibold text-lx-text-primary">{fmt(VASTE_TOESLAG)}</span>
        </div>
      </SectionCard>

      {/* LED */}
      <SectionCard title="LED-verlichting" subtitle={`€${LED_PRIJS_PER_METER} per strekkende meter — geldt voor alle lichttypen (3000K, 4000K, CCT, RGBW)`}>
        <div className="space-y-0">
          <InfoRow label="Direct LED — marge per kant" value="10 cm (LED zit 6 cm terug van rand)" />
          <InfoRow label="Indirect LED — marge" value="Geen — volledige afmeting" />
          <InfoRow label="Prijs per strekkende meter" value={`${fmt(LED_PRIJS_PER_METER)}/m`} />
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider">
          <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2">Bediening</p>
          <div className="space-y-0">
            {Object.entries(CONTROL_PRICES).map(([id, price]) => {
              const label = {
                'externe-schakeling': 'Externe schakeling',
                'tip-touch':          'Tip-Touch',
                '3-staps-dimmer':     '3-staps dimmer',
                'wip-schakelaar':     'Wip schakelaar',
                'motion-sensor':      'Motion sensor',
                'afstandsbediening':  'Afstandsbediening',
              }[id] ?? id
              return <InfoRow key={id} label={label} value={price === 0 ? 'Geen meerprijs' : fmt(price)} />
            })}
          </div>
        </div>
      </SectionCard>

      {/* Verwarming matrix */}
      <SectionCard title="Verwarming — prijsmatrix" subtitle="Anti-condensverwarming. Prijs bepaald door breedte × hoogte van de spiegel in cm.">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Breedte</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">t/m 80 cm hoog</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">t/m 120 cm hoog</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">t/m 160 cm hoog</th>
              </tr>
            </thead>
            <tbody>
              {HEATING_MATRIX.map((row, i) => {
                const prevMax = i === 0 ? 0 : HEATING_MATRIX[i - 1].maxW
                const label = i === 0 ? `t/m ${row.maxW} cm` : `${prevMax + 1}–${row.maxW} cm`
                return (
                  <tr key={row.maxW} className={i < HEATING_MATRIX.length - 1 ? 'border-b border-lx-divider' : ''}>
                    <td className="py-2.5 pr-4 font-medium text-lx-text-primary">{label}</td>
                    {row.rows.map(cell => (
                      <td key={cell.maxH} className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">{fmt(cell.price)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Rond ────────────────────────────────────────────────────────────────────

const METALLIC_DIAMETERS = [60, 80, 100]

function RondTab() {
  return (
    <div className="space-y-5">
      {/* Basisprijs + frame */}
      <SectionCard
        title="Basisprijs per diameter"
        subtitle="Standaard glas + €105 vaste kosten. Frameprijzen zijn additioneel op de basisprijs."
      >
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-3 text-lx-text-secondary font-medium">Diameter</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">Standaard</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">+ Alu frame</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">+ Zwart frame</th>
                <th className="text-right pb-2 px-2 text-lx-text-secondary font-medium">+ Metallic</th>
              </tr>
            </thead>
            <tbody>
              {ROND_DIAMETERS.map((d, i) => {
                const base = (ROND_BASIS_GLAS[d] ?? 0) + VASTE_TOESLAG
                const alu   = ROND_FRAME_PRIJZEN['aluminium']?.[d]
                const zwart = ROND_FRAME_PRIJZEN['zwart']?.[d]
                const metal = ROND_FRAME_PRIJZEN['gun-metal']?.[d]
                return (
                  <tr key={d} className={i < ROND_DIAMETERS.length - 1 ? 'border-b border-lx-divider' : ''}>
                    <td className="py-2.5 pr-3 font-medium text-lx-text-primary">⌀ {d} cm</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">{fmt(base)}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">
                      {alu !== undefined ? `+${fmt(alu)}` : <span className="text-lx-text-secondary">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">
                      {zwart !== undefined ? `+${fmt(zwart)}` : <span className="text-lx-text-secondary">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-lx-text-primary">
                      {metal !== undefined
                        ? `+${fmt(metal)}`
                        : <span className="text-[11px] text-lx-text-secondary bg-lx-panel-bg px-1.5 py-0.5 rounded-md">Niet beschikbaar</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11.5px] text-lx-text-secondary mt-3">
          Metallic frames (Gun Metal, Brushed Brass, Brushed Copper) zijn beschikbaar voor ⌀{METALLIC_DIAMETERS.join(', ⌀')} cm — zelfde prijs per kleur.
        </p>
      </SectionCard>

      {/* LED */}
      <SectionCard title="LED-verlichting" subtitle="Ronde spiegels hebben altijd rondom verlichting. LED-prijs is gebaseerd op de omtrek.">
        <div className="space-y-0">
          <InfoRow label="Prijs per strekkende meter" value={`${fmt(LED_PRIJS_PER_METER)}/m`} />
          <InfoRow label="Direct LED — effectieve diameter" value="Spiegeldiameter − 6 cm (LED ligt 3 cm terug van rand)" />
          <InfoRow label="Indirect LED — effectieve diameter" value="Volledige spiegeldiameter" />
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider">
          <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2">Berekende LED-meters per diameter</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                <th className="text-left pb-1.5 text-lx-text-secondary font-medium">Diameter</th>
                <th className="text-right pb-1.5 px-2 text-lx-text-secondary font-medium">Direct (m)</th>
                <th className="text-right pb-1.5 px-2 text-lx-text-secondary font-medium">Direct prijs</th>
                <th className="text-right pb-1.5 text-lx-text-secondary font-medium">Indirect (m)</th>
                <th className="text-right pb-1.5 px-2 text-lx-text-secondary font-medium">Indirect prijs</th>
              </tr>
            </thead>
            <tbody>
              {ROND_DIAMETERS.map((d, i) => {
                const mDirect   = parseFloat(pi(d, 6))
                const mIndirect = parseFloat(pi(d))
                return (
                  <tr key={d} className={i < ROND_DIAMETERS.length - 1 ? 'border-b border-lx-divider' : ''}>
                    <td className="py-2 font-medium text-lx-text-primary">⌀ {d} cm</td>
                    <td className="py-2 px-2 text-right text-lx-text-primary">{pi(d, 6)} m</td>
                    <td className="py-2 px-2 text-right font-semibold text-lx-text-primary">{fmt(Math.round(mDirect * LED_PRIJS_PER_METER))}</td>
                    <td className="py-2 text-right text-lx-text-primary">{pi(d)} m</td>
                    <td className="py-2 px-2 text-right font-semibold text-lx-text-primary">{fmt(Math.round(mIndirect * LED_PRIJS_PER_METER))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider">
          <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2">Bediening</p>
          <div className="space-y-0">
            {Object.entries(CONTROL_PRICES).map(([id, price]) => {
              const label = {
                'externe-schakeling': 'Externe schakeling',
                'tip-touch':          'Tip-Touch',
                '3-staps-dimmer':     '3-staps dimmer',
                'wip-schakelaar':     'Wip schakelaar',
                'motion-sensor':      'Motion sensor',
                'afstandsbediening':  'Afstandsbediening',
              }[id] ?? id
              return <InfoRow key={id} label={label} value={price === 0 ? 'Geen meerprijs' : fmt(price)} />
            })}
          </div>
        </div>
      </SectionCard>

      {/* Verwarming */}
      <SectionCard title="Verwarming" subtitle="Prijs op basis van spiegeldiameter.">
        <div className="space-y-0">
          <InfoRow label="t/m ⌀ 60 cm" value="€76" />
          <InfoRow label="t/m ⌀ 90 cm" value="€95" />
          <InfoRow label="t/m ⌀ 120 cm" value="€115" />
          <InfoRow label="t/m ⌀ 200 cm" value="€285" />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Organic ─────────────────────────────────────────────────────────────────

function OrganicTab() {
  return (
    <div className="space-y-5">
      <SectionCard title="Vaste prijzen per maat" subtitle="Organische spiegels worden geleverd in vaste maten. Prijs is inclusief vaste kosten.">
        <div className="space-y-0">
          {ORGANIC_SIZES.map(s => (
            <InfoRow key={s.key} label={s.label} value={fmt({ '60x40': 281, '80x60': 345, '100x70': 420, '120x80': 510 }[s.key] ?? 0)} />
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Verlichting & opties">
        <p className="text-[12.5px] text-lx-text-secondary">
          Organische spiegels hebben uitsluitend indirecte verlichting (rondom). LED-prijs op aanvraag — omtrek varieert per organische vorm.
          Verwarming en overige opties: zie Extra opties hieronder.
        </p>
      </SectionCard>
    </div>
  )
}

// ─── Op aanvraag ─────────────────────────────────────────────────────────────

function OpAanvraagTab() {
  return (
    <div className="space-y-5">
      <SectionCard title="Op aanvraag">
        <p className="text-[12.5px] text-lx-text-secondary leading-relaxed">
          Eigen ontwerpen, bijzondere maten of vormen worden op aanvraag geconfigureerd. De klant maakt een configuratie aan als &ldquo;offerteaanvraag&rdquo; —
          geen betaling vereist. LoooX brengt binnen 1 werkdag een prijsopgave uit.
        </p>
        <div className="mt-4 space-y-0">
          <InfoRow label="Minimale levertijd" value="Ca. 10 werkdagen na akkoord offerte" />
          <InfoRow label="Betalingsmoment" value="Na akkoord offerte" />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Extra opties ─────────────────────────────────────────────────────────────

function ExtraOptiesTab() {
  const shapeLabel = (shapes: string[]) => shapes.map(s => ({ rechthoek: 'Rechthoek', rond: 'Rond', organic: 'Organic', 'op-aanvraag': 'Op aanvraag' }[s] ?? s)).join(', ')

  return (
    <div className="space-y-5">
      <SectionCard title="Alle extra opties" subtitle="Prijzen zijn netto inkoopprijs excl. btw.">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Optie</th>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Beschikbaar voor</th>
                <th className="text-right pb-2 text-lx-text-secondary font-medium">Prijs</th>
              </tr>
            </thead>
            <tbody>
              {EXTRA_OPTIONS.map((opt, i) => (
                <tr key={opt.id} className={i < EXTRA_OPTIONS.length - 1 ? 'border-b border-lx-divider' : ''}>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-semibold text-lx-text-primary">{opt.name}</p>
                    <p className="text-[11.5px] text-lx-text-secondary mt-0.5 leading-snug">{opt.description}</p>
                    {opt.incompatibleWith.length > 0 && (
                      <p className="text-[11px] text-amber-600 mt-0.5">
                        Niet combineerbaar met: {opt.incompatibleWith.map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name ?? id).join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top text-lx-text-secondary">{shapeLabel(opt.shapes as string[])}</td>
                  <td className="py-3 align-top text-right font-semibold text-lx-text-primary whitespace-nowrap">
                    {opt.priceDisplay ?? (opt.price > 0 ? fmt(opt.price) : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider space-y-1.5">
          <p className="text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2">Toelichting percentages</p>
          <InfoRow label="Afgeronde hoeken (+60%)" value="60% van de glaskosten (breedte × hoogte × glasprijs/m²)" />
          <InfoRow label="Schuine zijden (+30%)" value="30% van de glaskosten (breedte × hoogte × glasprijs/m²)" />
          <InfoRow label="Frame in kleur — rechthoek" value="€80 (vast)" />
          <InfoRow label="Frame in kleur — rond" value="Zie tabel ronde spiegels (per diameter + kleur)" />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PRODUCT_CATS = [
  { id: 'spiegels', label: 'Spiegels', available: true },
  { id: 'meubels',  label: 'Meubels',  available: false },
]

const SHAPE_TABS = [
  { id: 'rechthoek',  label: 'Rechthoek',  component: RechthoekTab },
  { id: 'rond',       label: 'Rond',        component: RondTab },
  { id: 'organic',    label: 'Organic',     component: OrganicTab },
  { id: 'op-aanvraag',label: 'Op aanvraag', component: OpAanvraagTab },
  { id: 'opties',     label: 'Extra opties',component: ExtraOptiesTab },
]

export default function ProductenPage() {
  const [cat, setCat]     = useState('spiegels')
  const [shape, setShape] = useState('rechthoek')

  const ActiveShape = SHAPE_TABS.find(t => t.id === shape)?.component ?? RechthoekTab

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">Producten & Prijzen</h1>
        <p className="text-lx-text-secondary text-[13px] mt-1">Netto inkoopprijzen excl. btw — bijgewerkt vanuit de configurator-instellingen</p>
      </div>

      {/* Productcategorie */}
      <div className="flex items-center gap-2 mb-5">
        {PRODUCT_CATS.map(c => (
          <button
            key={c.id}
            onClick={() => c.available && setCat(c.id)}
            disabled={!c.available}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              !c.available
                ? 'text-lx-text-secondary cursor-not-allowed opacity-50'
                : cat === c.id
                ? 'bg-lx-cta text-white'
                : 'bg-white border border-black/10 text-lx-text-secondary hover:border-lx-cta/40 hover:text-lx-cta cursor-pointer'
            }`}
          >
            {c.label}
            {!c.available && (
              <span className="text-[10px] font-medium bg-black/8 text-lx-text-secondary px-1.5 py-0.5 rounded-full">
                Binnenkort
              </span>
            )}
          </button>
        ))}
      </div>

      {cat === 'spiegels' && (
        <>
          {/* Shape tabs */}
          <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
            {SHAPE_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setShape(t.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${
                  shape === t.id
                    ? 'bg-lx-icon-bg text-lx-cta'
                    : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ActiveShape />
        </>
      )}

      {cat === 'meubels' && (
        <div className="bg-white rounded-2xl border border-black/8 shadow-sm p-8 text-center">
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Meubels — binnenkort</p>
          <p className="text-[13px] text-lx-text-secondary">Prijzen en productinfo voor meubels worden hier toegevoegd zodra deze categorie beschikbaar is.</p>
        </div>
      )}
    </div>
  )
}
