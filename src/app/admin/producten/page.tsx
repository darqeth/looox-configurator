'use client'

import { Fragment, useState, useEffect } from 'react'
import {
  GLAS_KLEUREN,
  GLAS_PRIJS_M2,
  VASTE_TOESLAG,
  LED_PRIJS_PER_METER,
  ZANDSTRAAL_PRIJS_PER_METER,
  HEATING_MATRIX,
  ROND_DIAMETERS,
  ROND_BASIS_GLAS,
  ROND_FRAME_PRIJZEN,
  RECHTHOEK_FRAME_PRIJS_PER_METER,
  ORGANIC_SIZES,
  EXTRA_OPTIONS,
  CONTROL_PRICES,
  CONTROLS_FOR_TYPE,
  LIGHT_TYPE_LABELS,
  SOL_CATALOGUS,
  LUNA_CATALOGUS,
  RONDE_GLAS_SMOKE_M2,
} from '@/lib/configurator-config'
import { getExtraOptionTooltips, saveExtraOptionTooltip, getControlTooltips, saveControlTooltip } from '@/lib/actions/admin'
import {
  GLASDIKTE_PRIJS_M2,
  STAFFEL_KORTINGEN,
  POLIJSTEN_PER_M,
  OPHANGING_KLEIN,
  OPHANGING_GROOT,
  VERPAKKING_PER_STUK,
} from '@/lib/projectspiegel-config'
import { MAATWERK_STAFFEL_KORTINGEN } from '@/lib/maatwerk-staffel'

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

function RechthoekTab() {
  return (
    <div className="space-y-5">
      {/* Glasprijs per m² */}
      <SectionCard
        title="Glasprijs per m²"
        subtitle="Vaste prijs per glaskleur, ongeacht verlichtingskeuze. Zandstraalbewerking bij directe verlichting wordt apart berekend."
      >
        <div className="space-y-0">
          {GLAS_KLEUREN.map((g, gi) => (
            <div key={g.id} className={`flex items-center justify-between py-2.5 ${gi < GLAS_KLEUREN.length - 1 ? 'border-b border-lx-divider' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <span className="text-[12.5px] text-lx-text-primary font-medium">{g.name}</span>
              </div>
              <span className="text-[12.5px] font-semibold text-lx-text-primary">{fmt(GLAS_PRIJS_M2[g.id])}/m²</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-lx-divider flex items-center justify-between">
          <span className="text-[12.5px] text-lx-text-secondary">Vaste productiekosten (per spiegel)</span>
          <span className="text-[12.5px] font-semibold text-lx-text-primary">{fmt(VASTE_TOESLAG)}</span>
        </div>
      </SectionCard>

      {/* Zandstraal */}
      <SectionCard
        title="Zandstraalbaan"
        subtitle="Gezandstraalde baan in het glas bij directe verlichting, zodat het licht zichtbaar is. Zelfde marges als direct LED (10 cm per kant)."
      >
        <div className="space-y-0">
          <InfoRow label="Prijs per strekkende meter" value={`${fmt(ZANDSTRAAL_PRIJS_PER_METER)}/m`} />
          <InfoRow label="Marge per kant" value="10 cm (zelfde als direct LED)" />
          <InfoRow label="Van toepassing bij" value="Directe verlichting (niet bij indirect)" />
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

      {/* Frame in kleur */}
      <SectionCard
        title="Frame in kleur — rechthoek"
        subtitle="Aluminium frame rondom. Prijs per strekkende meter × omtrek (2 × breedte + 2 × hoogte)."
      >
        <div className="space-y-0">
          {Object.entries(RECHTHOEK_FRAME_PRIJS_PER_METER).map(([colorId, pricePerM]) => {
            const label = {
              'aluminium':      'Aluminium',
              'zwart':          'Mat zwart',
              'gun-metal':      'Metallic Gun Metal',
              'brushed-brass':  'Metallic Brushed Brass',
              'brushed-copper': 'Metallic Brushed Copper',
            }[colorId] ?? colorId
            return (
              <InfoRow
                key={colorId}
                label={label}
                value={`€${pricePerM}/m`}
              />
            )
          })}
        </div>
        <p className="text-[11.5px] text-lx-text-secondary mt-3">Voorbeeld: 100×80 cm → omtrek 3,6 m → aluminium €72 · zwart €144 · metallic €216</p>
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

// ─── Projectspiegels ─────────────────────────────────────────────────────────

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

// ─── Maatwerk staffelkorting ──────────────────────────────────────────────────

function MaatwerkStaffelTab() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Staffelkorting maatwerk spiegels"
        subtitle="Van toepassing op de netto prijs (ná dealer korting). Wordt automatisch toegepast bij het bestellen op basis van het gekozen aantal."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lx-divider">
              <th className="text-left py-2 text-xs text-lx-text-secondary font-medium">Vanaf (stuks)</th>
              <th className="text-left py-2 text-xs text-lx-text-secondary font-medium">Korting</th>
            </tr>
          </thead>
          <tbody>
            {[...MAATWERK_STAFFEL_KORTINGEN].reverse().map((tier, i) => (
              <tr key={i} className="border-b border-lx-divider last:border-0">
                <td className="py-2 text-lx-text-primary">{tier.vanaf}+</td>
                <td className="py-2 font-medium text-lx-cta">
                  {tier.pct > 0 ? `${(tier.pct * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [tooltips, setTooltips] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, 'saved' | 'error' | null>>({})

  useEffect(() => {
    getExtraOptionTooltips().then(setTooltips)
  }, [])

  async function handleTooltipBlur(id: string, value: string) {
    try {
      await saveExtraOptionTooltip(id, value)
      setTooltips(prev => ({ ...prev, [id]: value }))
      setFeedback(prev => ({ ...prev, [id]: 'saved' }))
    } catch {
      setFeedback(prev => ({ ...prev, [id]: 'error' }))
    }
    setTimeout(() => setFeedback(prev => ({ ...prev, [id]: null })), 2000)
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Alle extra opties" subtitle="Prijzen zijn netto inkoopprijs excl. btw. Tooltip tekst is zichtbaar voor klanten in de configurator.">
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
                <Fragment key={opt.id}>
                  <tr className="border-b border-lx-divider">
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
                  <tr className={i < EXTRA_OPTIONS.length - 1 ? 'border-b border-lx-divider' : ''}>
                    <td colSpan={3} className="pb-3 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Tooltip tekst (klanten)</span>
                        {feedback[opt.id] === 'saved' && (
                          <span className="text-[10.5px] text-green-600 font-medium">✓ Opgeslagen</span>
                        )}
                        {feedback[opt.id] === 'error' && (
                          <span className="text-[10.5px] text-red-500 font-medium">✗ Fout</span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        defaultValue={tooltips[opt.id] ?? ''}
                        key={opt.id + '-' + (tooltips[opt.id] ?? '')}
                        onBlur={async (e) => { await handleTooltipBlur(opt.id, e.target.value) }}
                        placeholder="Tooltip tekst voor klanten (optioneel)..."
                        className="w-full px-3 py-2 text-[12px] rounded-lg border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-1 focus:ring-lx-cta/30 outline-none transition-colors resize-none"
                      />
                    </td>
                  </tr>
                </Fragment>
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

function BedieningTab() {
  const lightTypeOrder = ['3000k', '4000k', 'cct', 'rgbw'] as const

  // Deduplicate controls: id → { name, price, lightTypes[] }
  const allControls: { id: string; name: string; price: number; lightTypes: string[] }[] = []
  for (const lt of lightTypeOrder) {
    for (const ctrl of CONTROLS_FOR_TYPE[lt]) {
      const existing = allControls.find(c => c.id === ctrl.id)
      if (existing) {
        existing.lightTypes.push(LIGHT_TYPE_LABELS[lt])
      } else {
        allControls.push({ id: ctrl.id, name: ctrl.name, price: CONTROL_PRICES[ctrl.id] ?? 0, lightTypes: [LIGHT_TYPE_LABELS[lt]] })
      }
    }
  }

  const [tooltips, setTooltips] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, 'saved' | 'error' | null>>({})

  useEffect(() => {
    getControlTooltips().then(setTooltips)
  }, [])

  async function handleTooltipBlur(id: string, value: string) {
    try {
      await saveControlTooltip(id, value)
      setTooltips(prev => ({ ...prev, [id]: value }))
      setFeedback(prev => ({ ...prev, [id]: 'saved' }))
    } catch {
      setFeedback(prev => ({ ...prev, [id]: 'error' }))
    }
    setTimeout(() => setFeedback(prev => ({ ...prev, [id]: null })), 2000)
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Bedieningsopties" subtitle="Zelfde prijs voor alle spiegelvormen. Tooltip tekst is zichtbaar voor klanten in de configurator.">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Bediening</th>
                <th className="text-left pb-2 pr-4 text-lx-text-secondary font-medium">Beschikbaar bij</th>
                <th className="text-right pb-2 text-lx-text-secondary font-medium">Prijs</th>
              </tr>
            </thead>
            <tbody>
              {allControls.map((ctrl, i) => (
                <Fragment key={ctrl.id}>
                  <tr className="border-b border-lx-divider">
                    <td className="py-3 pr-4 align-top font-semibold text-lx-text-primary">{ctrl.name}</td>
                    <td className="py-3 pr-4 align-top text-lx-text-secondary">{ctrl.lightTypes.join(', ')}</td>
                    <td className="py-3 align-top text-right font-semibold text-lx-text-primary whitespace-nowrap">
                      {ctrl.price === 0 ? 'Inbegrepen' : fmt(ctrl.price)}
                    </td>
                  </tr>
                  <tr className={i < allControls.length - 1 ? 'border-b border-lx-divider' : ''}>
                    <td colSpan={3} className="pb-3 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wide">Tooltip tekst (klanten)</span>
                        {feedback[ctrl.id] === 'saved' && (
                          <span className="text-[10.5px] text-green-600 font-medium">✓ Opgeslagen</span>
                        )}
                        {feedback[ctrl.id] === 'error' && (
                          <span className="text-[10.5px] text-red-500 font-medium">✗ Fout</span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        defaultValue={tooltips[ctrl.id] ?? ''}
                        key={ctrl.id + '-' + (tooltips[ctrl.id] ?? '')}
                        onBlur={async (e) => { await handleTooltipBlur(ctrl.id, e.target.value) }}
                        placeholder="Tooltip tekst voor klanten (optioneel)..."
                        className="w-full px-3 py-2 text-[12px] rounded-lg border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-1 focus:ring-lx-cta/30 outline-none transition-colors resize-none"
                      />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Sol ─────────────────────────────────────────────────────────────────────

function SolTab() {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Sol — catalogusprijzen"
        subtitle="Vaste catalogusprijzen. Glaskleur meerprijs per m² extra (smoke-zwart of smoke-brons)."
      >
        <InfoRow label="Zonder extra deel (SPSOL1R80)" value={fmt(SOL_CATALOGUS.basis)} />
        <InfoRow label="Met extra deel (SPSOL2R80)" value={fmt(SOL_CATALOGUS.metExtraDeel)} />
        <InfoRow label="Extra deel meerprijs" value={fmt(SOL_CATALOGUS.metExtraDeel - SOL_CATALOGUS.basis)} />
      </SectionCard>

      <SectionCard
        title="Glaskleur meerprijs"
        subtitle={`Smoke-zwart of smoke-brons: meerprijs op basis van cirkeloppervlak (π × r²). Meerprijs/m²: ${fmt(RONDE_GLAS_SMOKE_M2)}.`}
      >
        <div className="space-y-0">
          <InfoRow label="Formule" value="π × (diameter ÷ 200)² × €61" />
          {[60, 80, 100, 120, 160, 180].map(d => {
            const area = Math.PI * Math.pow(d / 200, 2)
            return (
              <InfoRow key={d} label={`Ø${d} cm`} value={`+${fmt(Math.round(area * RONDE_GLAS_SMOKE_M2))}`} />
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Inbegrepen in catalogusprijs" subtitle="Worden NIET afzonderlijk berekend.">
        <InfoRow label="Verwarming" value="Inbegrepen" />
        <InfoRow label="LED verlichting rondom (indirect)" value="Inbegrepen" />
        <InfoRow label="Bediening (extern geschakeld)" value="Inbegrepen" />
      </SectionCard>
    </div>
  )
}

// ─── Luna ────────────────────────────────────────────────────────────────────

function LunaTab() {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Luna — catalogusprijzen"
        subtitle="Vaste catalogusprijzen. Extra deel prijs op basis van meubelhoogte én diameter. Glaskleur meerprijs per m² extra."
      >
        <InfoRow label="Zonder extra deel (SPLUNA1R90R/L)" value={fmt(LUNA_CATALOGUS.basis)} />
        <InfoRow label="Extra deel — meubelhoogte ≤ 30 cm of diameter > 160 cm" value={fmt(LUNA_CATALOGUS.basis + LUNA_CATALOGUS.extraDeel30)} />
        <InfoRow label="Extra deel — meubelhoogte > 30 cm en diameter ≤ 160 cm" value={fmt(LUNA_CATALOGUS.basis + LUNA_CATALOGUS.extraDeel35)} />
        <InfoRow label="Extra deel meerprijs (duurste trap)" value={fmt(LUNA_CATALOGUS.extraDeel30)} />
        <InfoRow label="Extra deel meerprijs (goedkoopste trap)" value={fmt(LUNA_CATALOGUS.extraDeel35)} />
      </SectionCard>

      <SectionCard
        title="Glaskleur meerprijs"
        subtitle={`Identiek aan Sol: smoke-zwart of smoke-brons per m² cirkeloppervlak. Meerprijs/m²: ${fmt(RONDE_GLAS_SMOKE_M2)}.`}
      >
        <div className="space-y-0">
          <InfoRow label="Formule" value="π × (diameter ÷ 200)² × €61" />
          {[60, 80, 100, 120, 160, 180].map(d => {
            const area = Math.PI * Math.pow(d / 200, 2)
            return (
              <InfoRow key={d} label={`Ø${d} cm`} value={`+${fmt(Math.round(area * RONDE_GLAS_SMOKE_M2))}`} />
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Inbegrepen in catalogusprijs" subtitle="Worden NIET afzonderlijk berekend.">
        <InfoRow label="Verwarming" value="Inbegrepen" />
        <InfoRow label="LED verlichting rondom (indirect)" value="Inbegrepen" />
        <InfoRow label="Bediening (extern geschakeld)" value="Inbegrepen" />
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
  { id: 'rechthoek',        label: 'Rechthoek',       component: RechthoekTab },
  { id: 'rond',             label: 'Rond',             component: RondTab },
  { id: 'organic',          label: 'Organic',          component: OrganicTab },
  { id: 'sol',              label: 'Sol',              component: SolTab },
  { id: 'luna',             label: 'Luna',             component: LunaTab },
  { id: 'op-aanvraag',      label: 'Op aanvraag',      component: OpAanvraagTab },
  { id: 'projectspiegels',  label: 'Projectspiegels',  component: ProjectspiegelsTab },
  { id: 'opties',           label: 'Extra opties',     component: ExtraOptiesTab },
  { id: 'bediening',        label: 'Bediening',        component: BedieningTab },
  { id: 'maatwerk-staffel', label: 'Staffelkorting',   component: MaatwerkStaffelTab },
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
      <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {PRODUCT_CATS.map(c => (
          <button
            key={c.id}
            onClick={() => c.available && setCat(c.id)}
            disabled={!c.available}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              !c.available
                ? 'text-lx-text-secondary cursor-not-allowed opacity-40'
                : cat === c.id
                ? 'bg-lx-text-primary text-white'
                : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg cursor-pointer'
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
          <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit overflow-x-auto">
            {SHAPE_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setShape(t.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                  shape === t.id
                    ? 'bg-lx-text-primary text-white'
                    : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
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
