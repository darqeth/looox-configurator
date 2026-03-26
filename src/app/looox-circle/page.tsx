import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MilestoneCelebration from './milestone-celebration'
import MilestoneCard from './milestone-card'

export default async function LoooxCirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: milestones },
    { data: userMilestones },
    { count: configCount },
    { count: orderCount },
    { data: revenueSum },
    { data: streakData },
    { data: shapeData },
    { data: usedDiscountCodes },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, created_at').eq('id', user.id).single(),
    supabase.from('milestones').select('*').eq('is_active', true).order('sort_order').order('created_at'),
    supabase.from('user_milestones').select('*').eq('user_id', user.id),
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.rpc('sum_order_revenue', { p_user_id: user.id }),
    supabase.from('login_streaks').select('current_streak, longest_streak').eq('user_id', user.id).single(),
    supabase.from('configurations').select('selected_options').eq('user_id', user.id),
    supabase.from('discount_codes').select('code').eq('user_id', user.id).not('used_at', 'is', null),
  ])

  const company = profile?.company ?? profile?.full_name ?? 'jouw bedrijf'
  const configs = configCount ?? 0
  const orders = orderCount ?? 0
  const totalRevenue = Number(revenueSum ?? 0)
  const currentStreak = streakData?.current_streak ?? 0
  const configuredShapes = new Set(
    (shapeData ?? []).map(c => (c.selected_options as { shape?: string })?.shape).filter(Boolean)
  )

  const achievedMap = new Map((userMilestones ?? []).map(um => [um.milestone_id, um]))
  const usedCodesSet = new Set((usedDiscountCodes ?? []).map(c => c.code))

  function getProgress(m: { goal_type: string; goal_value: number; goal_shape: string | null }) {
    let current = 0
    if (m.goal_type === 'configs') current = configs
    else if (m.goal_type === 'orders') current = orders
    else if (m.goal_type === 'order_revenue') current = totalRevenue
    else if (m.goal_type === 'streak') current = currentStreak
    else if (m.goal_type === 'shape') current = m.goal_shape && configuredShapes.has(m.goal_shape) ? 1 : 0

    const goal = Number(m.goal_value)
    const pct = Math.min(Math.round((current / goal) * 100), 100)
    const done = current >= goal
    return { current, pct, done }
  }

  const milestonesWithProgress = (milestones ?? []).map(m => {
    const { current, pct, done } = getProgress(m)
    const um = achievedMap.get(m.id) ?? null
    const discountUsed = um?.discount_code ? usedCodesSet.has(um.discount_code) : false
    return { ...m, current, pct, done, userMilestone: um, discountUsed }
  })

  // Voor de celebration modal: alle behaalde milestones (user_milestones bepaalt of de code al gegenereerd is)
  const celebrationMilestones = milestonesWithProgress
    .filter(m => m.done)
    .map(m => ({ id: m.id, title: m.title, perk: m.benefit_type === 'custom' ? (m.benefit_description ?? '') : `${m.benefit_value}${m.benefit_type === 'discount_pct' ? '%' : '€'} korting`, done: true }))

  const achieved = milestonesWithProgress.filter(m => m.done)
  const inProgress = milestonesWithProgress.filter(m => !m.done && m.current > 0)
  const upcoming = milestonesWithProgress.filter(m => !m.done && m.current === 0)

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">

      <MilestoneCelebration milestones={celebrationMilestones} />

      {/* Header */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight mb-1">LoooX Circle</h1>
            <p className="text-[13px] text-lx-text-secondary">
              {company} · lid sinds {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[22px] font-bold text-lx-text-primary leading-none">{achieved.length}</p>
            <p className="text-[12px] text-lx-text-secondary mt-0.5">van {milestonesWithProgress.length} behaald</p>
          </div>
        </div>

        {/* Voortgangsbalk totaal */}
        {milestonesWithProgress.length > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-lx-divider rounded-full overflow-hidden">
              <div
                className="h-full bg-lx-cta rounded-full transition-all duration-500"
                style={{ width: `${Math.round((achieved.length / milestonesWithProgress.length) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* In uitvoering */}
      {inProgress.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">In uitvoering</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgress.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {/* Behaald */}
      {achieved.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">Behaald</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achieved.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {/* Nog te behalen */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">Nog te behalen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcoming.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {milestonesWithProgress.length === 0 && (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen mijlpalen beschikbaar</p>
          <p className="text-[13px] text-lx-text-secondary">LoooX voegt binnenkort doelen toe.</p>
        </div>
      )}

      {/* CTA */}
      <div className="bg-lx-cta rounded-[18px] px-6 py-6 mt-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white text-[15px] font-bold mb-1">Blijf configureren</p>
            <p className="text-white/70 text-[13px] leading-relaxed max-w-sm">
              Elke configuratie en bestelling brengt je dichter bij je volgende mijlpaal.
            </p>
          </div>
          <Link
            href="/configurator/nieuw"
            className="inline-flex items-center gap-2 bg-white hover:bg-lx-icon-bg text-lx-cta text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
          >
            Nieuwe configuratie
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>

    </div>
  )
}
