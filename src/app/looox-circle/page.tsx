import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MilestonesModal from './milestones-modal'

// Tier definitie
const TIERS = [
  {
    key: 'Studio',
    label: 'Studio',
    color: '#8C8884',
    bgClass: 'bg-lx-panel-bg',
    textClass: 'text-[#8C8884]',
    borderClass: 'border-[#8C8884]',
    description: 'Jouw startpunt als LoooX dealer.',
    perks: ['Toegang tot de configurator', 'Standaard leveringstijden', 'Digitaal merkmateriaal'],
    threshold: null,
  },
  {
    key: 'Signature',
    label: 'Signature',
    color: 'var(--lx-cta)',
    bgClass: 'bg-lx-icon-bg',
    textClass: 'text-lx-cta',
    borderClass: 'border-lx-cta',
    description: 'Erkend als actieve LoooX partner.',
    perks: ['12% korting op alle orders', 'Gratis standaard verzending', 'Uitgebreid merkmateriaal', 'Prioriteit bij support'],
    threshold: 10, // orders
  },
  {
    key: 'Atelier',
    label: 'Atelier',
    color: 'var(--lx-sidebar-bg)',
    bgClass: 'bg-lx-divider',
    textClass: 'text-lx-sidebar-bg',
    borderClass: 'border-lx-sidebar-bg',
    description: 'Het hoogste niveau van LoooX partnerschap.',
    perks: ['Maximale kortingen', 'Gratis express verzending', 'Merkmateriaal op maat', 'Persoonlijk accountmanager', 'Exclusieve productpreviews'],
    threshold: 30, // orders (placeholder)
  },
]

// Placeholder milestones — later koppelen aan echte data
const MILESTONES = [
  {
    id: 'eerste-config',
    title: 'Eerste configuratie',
    description: 'Maak je eerste spiegel aan in de configurator.',
    perk: 'Toegang tot alle vormen',
    goal: 1,
    type: 'configs' as const,
  },
  {
    id: 'ontwerper',
    title: 'Ontwerper',
    description: 'Maak 5 configuraties aan.',
    perk: '5% introductiekorting',
    goal: 5,
    type: 'configs' as const,
  },
  {
    id: 'eerste-order',
    title: 'Eerste bestelling',
    description: 'Plaats je eerste order via het portaal.',
    perk: 'Persoonlijke onboarding call',
    goal: 1,
    type: 'orders' as const,
  },
  {
    id: 'vaste-klant',
    title: 'Vaste partner',
    description: 'Bereik 5 bestellingen.',
    perk: 'Gratis verzending',
    goal: 5,
    type: 'orders' as const,
  },
  {
    id: 'signature',
    title: 'Signature status',
    description: 'Bereik 10 bestellingen.',
    perk: '12% korting op alle orders',
    goal: 10,
    type: 'orders' as const,
  },
]

export default async function LoooxCirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: configCount }, { count: orderCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, company, tier, created_at').eq('id', user.id).single(),
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const tier = profile?.tier ?? 'Studio'
  const company = profile?.company ?? profile?.full_name ?? 'jouw bedrijf'
  const configs = configCount ?? 0
  const orders = orderCount ?? 0

  const currentTierIndex = TIERS.findIndex(t => t.key === tier)
  const currentTier = TIERS[currentTierIndex]
  const nextTier = TIERS[currentTierIndex + 1] ?? null

  // Voortgang naar volgende tier
  const progressToNext = nextTier?.threshold
    ? Math.min(Math.round((orders / nextTier.threshold) * 100), 100)
    : 100
  const ordersToNext = nextTier?.threshold ? Math.max(nextTier.threshold - orders, 0) : 0

  // Milestone progress
  function getMilestoneProgress(m: typeof MILESTONES[0]) {
    const current = m.type === 'configs' ? configs : orders
    const pct = Math.min(Math.round((current / m.goal) * 100), 100)
    const done = current >= m.goal
    return { current, pct, done }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-4xl">

      {/* ── 1. HEADER ── */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">LoooX Circle</h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentTier.bgClass} ${currentTier.textClass} ${currentTier.borderClass}/30`}>
                {tier}
              </span>
            </div>
            <p className="text-[13px] text-lx-text-secondary">
              {company} · lid sinds {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          {nextTier && (
            <div className="text-right flex-shrink-0">
              <p className="text-[12px] text-lx-text-secondary mb-1">
                {ordersToNext === 0
                  ? `${nextTier.label} bereikt`
                  : `Nog ${ordersToNext} order${ordersToNext !== 1 ? 's' : ''} voor ${nextTier.label}`}
              </p>
              <div className="w-40 h-1.5 bg-lx-divider rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressToNext}%`, backgroundColor: nextTier.color }}
                />
              </div>
              <p className="text-[11px] text-lx-placeholder mt-1">{progressToNext}% naar {nextTier.label}</p>
            </div>
          )}
          {!nextTier && (
            <div className="flex items-center gap-2 text-[13px] text-lx-sidebar-bg font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Hoogste niveau bereikt
            </div>
          )}
        </div>
      </div>

      {/* ── 2. TIER TIJDLIJN ── */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <h2 className="text-[13px] font-bold text-lx-text-primary mb-4">Jouw pad</h2>
        <div className="grid grid-cols-3 gap-0 relative">
          {/* Verbindingslijn */}
          <div className="absolute top-4 left-[16.66%] right-[16.66%] h-px bg-lx-border z-0" />

          {TIERS.map((t, i) => {
            const isCurrent = t.key === tier
            const isPast = i < currentTierIndex
            const isFuture = i > currentTierIndex
            return (
              <div key={t.key} className="relative z-10 flex flex-col items-center text-center px-2">
                {/* Dot */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-3 ${
                  isCurrent ? 'border-current bg-white shadow-sm' :
                  isPast ? 'border-current bg-current' :
                  'border-lx-border bg-white'
                }`} style={{ borderColor: isFuture ? undefined : t.color }}>
                  {isPast && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {isCurrent && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[12.5px] font-bold mb-1 ${isFuture ? 'text-lx-placeholder' : 'text-lx-text-primary'}`}>
                  {t.label}
                </span>

                {/* Status */}
                <span className={`text-[11px] mb-2 ${
                  isCurrent ? currentTier.textClass + ' font-semibold' :
                  isPast ? 'text-lx-text-secondary' : 'text-lx-placeholder'
                }`}>
                  {isCurrent ? 'Huidig niveau' : isPast ? 'Bereikt' : t.threshold ? `Vanaf ${t.threshold} orders` : '—'}
                </span>

                {/* Voordelen */}
                <div className={`w-full rounded-xl p-3 text-left ${isFuture ? 'bg-lx-panel-bg' : 'bg-lx-panel-bg'}`}>
                  <ul className="space-y-1">
                    {t.perks.slice(0, 3).map((perk) => (
                      <li key={perk} className={`text-[11px] flex items-start gap-1.5 ${isFuture ? 'text-lx-placeholder' : 'text-lx-text-secondary'}`}>
                        <span className="mt-0.5 flex-shrink-0" style={{ color: isFuture ? 'var(--lx-placeholder)' : t.color }}>
                          {isFuture ? '·' : '✓'}
                        </span>
                        {perk}
                      </li>
                    ))}
                    {t.perks.length > 3 && (
                      <li className={`text-[11px] ${isFuture ? 'text-lx-placeholder' : 'text-lx-text-secondary'}`}>
                        +{t.perks.length - 3} meer
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. MILESTONES ── */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-bold text-lx-text-primary">Mijlpalen</h2>
          <MilestonesModal milestones={MILESTONES.map(m => ({
            ...m,
            ...getMilestoneProgress(m),
          }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MILESTONES.map((m) => {
            const { current, pct, done } = getMilestoneProgress(m)
            const isFuture = !done && current === 0 && m.type === 'orders' && m.goal > 5
            return (
              <div key={m.id} className={`rounded-[14px] p-4 border ${
                done
                  ? 'bg-white border-lx-cta/20'
                  : isFuture
                  ? 'bg-lx-panel-bg border-lx-divider'
                  : 'bg-white border-lx-divider'
              }`}>
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {done ? (
                        <span className="w-4 h-4 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      ) : (
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isFuture ? 'border-lx-border' : 'border-lx-cta/40'}`} />
                      )}
                      <p className={`text-[13px] font-semibold ${isFuture ? 'text-lx-text-secondary' : 'text-lx-text-primary'}`}>
                        {m.title}
                      </p>
                    </div>
                    <p className={`text-[11.5px] ml-6 ${isFuture ? 'text-lx-placeholder' : 'text-lx-text-secondary'}`}>
                      {m.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar (alleen voor actieve milestones) */}
                {!done && !isFuture && (
                  <div className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-lx-text-secondary">{current} van {m.goal}</span>
                      <span className="text-[11px] text-lx-text-secondary">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-lx-divider rounded-full overflow-hidden">
                      <div className="h-full bg-lx-cta rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className={`text-[11px] mt-1.5 ml-6 ${done ? 'text-lx-cta font-medium' : isFuture ? 'text-lx-placeholder italic' : 'text-lx-text-secondary'}`}>
                  Voordeel: {m.perk}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 4. VOORDELEN VERGELIJKING ── */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-lx-divider">
          <h2 className="text-[13px] font-bold text-lx-text-primary">Voordelen per niveau</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-lx-divider">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide w-[40%]">Voordeel</th>
                {TIERS.map((t) => (
                  <th key={t.key} className={`px-4 py-3 text-center ${t.key === tier ? 'bg-lx-panel-bg' : ''}`}>
                    <span className={`text-[11.5px] font-bold`} style={{ color: t.color }}>{t.label}</span>
                    {t.key === tier && <span className="block text-[10px] text-lx-text-secondary font-normal mt-0.5">Huidig</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-lx-divider">
              {[
                { label: 'Korting op orders', values: ['—', '12%', 'Op maat'] },
                { label: 'Configurator toegang', values: ['✓', '✓', '✓ + exclusief'] },
                { label: 'Verzending', values: ['Standaard', 'Gratis', 'Gratis express'] },
                { label: 'Merkmateriaal', values: ['Basis', 'Uitgebreid', 'Op maat'] },
                { label: 'Prioriteit support', values: ['—', '✓', '✓'] },
                { label: 'Accountmanager', values: ['—', '—', 'Persoonlijk'] },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-6 py-3 text-[12.5px] text-lx-text-primary">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className={`px-4 py-3 text-center text-[12.5px] ${
                      TIERS[i].key === tier ? 'bg-lx-panel-bg font-semibold text-lx-text-primary' :
                      i > currentTierIndex ? 'text-lx-placeholder' : 'text-lx-text-secondary'
                    }`}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. CTA ── */}
      {nextTier && (
        <div className="bg-lx-cta rounded-[18px] px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white text-[15px] font-bold mb-1">Richting {nextTier.label}</p>
              <p className="text-white/70 text-[13px] leading-relaxed max-w-sm">
                {ordersToNext === 0
                  ? `Je hebt ${nextTier.label} bereikt. Neem contact op voor activatie.`
                  : `Nog ${ordersToNext} order${ordersToNext !== 1 ? 's' : ''} voor ${nextTier.label} en ${nextTier.perks[0].toLowerCase()}.`}
              </p>
            </div>
            <Link
              href="/configurator/nieuw"
              className="inline-flex items-center gap-2 bg-white hover:bg-lx-icon-bg text-lx-cta text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              Nieuwe configuratie starten
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      )}

      {!nextTier && (
        <div className="bg-lx-sidebar-bg rounded-[18px] px-6 py-6 text-center">
          <p className="text-white text-[15px] font-bold mb-1">Atelier — het hoogste niveau</p>
          <p className="text-white/60 text-[13px]">Je hebt het maximale bereikt als LoooX partner. Dank voor je vertrouwen.</p>
        </div>
      )}

    </div>
  )
}
