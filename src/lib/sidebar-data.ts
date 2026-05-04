import type { SupabaseClient } from '@supabase/supabase-js'
import { getCompanyUserIds } from './company-utils'

export type ClosestMilestone = {
  title: string
  pct: number
  progressLabel: string
}

export type SidebarData = {
  userName: string
  company: string
  tier: string
  configCount: number
  orderCount: number
  isAdmin: boolean
  isSubAdmin: boolean
  isManager: boolean
  canConfigure: boolean
  isInternational: boolean
  isGroothandel: boolean
  pendingCount: number
  pendingColleaguesCount: number
  avatarUrl: string | null
  closestMilestone: ClosestMilestone | null
  allMilestonesAchieved: boolean
}

export async function fetchSidebarData(
  supabase: SupabaseClient,
  userId: string
): Promise<SidebarData> {
  const [{ data: profile }, { data: memberData }] = await Promise.all([
    supabase.from('profiles').select('full_name, company, company_id, tier, is_admin, is_sub_admin, avatar_url, is_international, is_groothandel').eq('id', userId).single(),
    supabase.from('company_members').select('role, company_id, can_configure').eq('user_id', userId).single(),
  ])

  const isAdmin = profile?.is_admin ?? false
  const isSubAdmin = profile?.is_sub_admin ?? false
  const isInternational = profile?.is_international ?? false
  const isGroothandel = profile?.is_groothandel ?? false
  const isManager = memberData?.role === 'manager'
  // company_members is bron van waarheid — profile.company_id kan stale zijn na verwijdering
  const companyId = memberData?.company_id ?? null

  // Batch 2: getCompanyUserIds in parallel with independent queries
  const [
    companyUserIds,
    { data: companyOrderCount },
    { count: ownOrderCount },
    { count: pendingCount },
    { count: pendingColleaguesCount },
    { data: milestones },
    { data: revenueSum },
    { data: streakData },
  ] = await Promise.all([
    getCompanyUserIds(supabase, userId, companyId),
    // Company-wide orders — used for milestone calculation only
    supabase.rpc('count_company_orders', { p_user_id: userId }),
    // Own orders only — matches what /bestellingen page shows
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    (isAdmin || isSubAdmin)
      ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
      : Promise.resolve({ count: 0, data: null, error: null }),
    isManager && companyId
      ? supabase.from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('approval_status', 'pending')
      : Promise.resolve({ count: 0, data: null, error: null }),
    (isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('milestones').select('id, title, goal_type, goal_value').eq('is_active', true).order('sort_order'),
    (isInternational || isGroothandel) ? Promise.resolve({ data: 0, error: null }) : supabase.rpc('sum_order_revenue', { p_user_id: userId }),
    (isInternational || isGroothandel) ? Promise.resolve({ data: null, error: null }) : supabase.from('login_streaks').select('current_streak, longest_streak, last_login_date, total_days').eq('user_id', userId).single(),
  ])

  // ── Login streak update — piggybacks on the streak row already fetched above ──
  // NOTE: total_days column requires a migration that may not yet be in production.
  if (!isInternational && !isGroothandel) {
    const today = new Date().toISOString().split('T')[0]
    const streak = streakData as { current_streak: number; longest_streak: number; last_login_date: string | null; total_days: number | null } | null
    if (!streak) {
      void supabase.from('login_streaks').insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_days: 1,
      }).then(({ error }) => { if (error) console.error('[streak]', error) })
    } else if (streak.last_login_date !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const newStreak = streak.last_login_date === yesterdayStr ? streak.current_streak + 1 : 1
      const newLongest = Math.max(newStreak, streak.longest_streak)
      void supabase.from('login_streaks').update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_login_date: today,
        total_days: (streak.total_days ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).then(({ error }) => { if (error) console.error('[streak]', error) })
    }
  }

  // Batch 3: queries that need companyUserIds (now resolved from batch 2)
  const [
    { count: configCount },
    { data: userMilestonesData },
  ] = await Promise.all([
    supabase.from('configurations').select('id', { count: 'exact', head: true }).in('user_id', companyUserIds).eq('status', 'saved'),
    (isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds),
  ])

  // Compute closest unachieved milestone
  const achievedIds = new Set((userMilestonesData ?? []).map((um: { milestone_id: string }) => um.milestone_id))
  const totalConfigs = Number(configCount ?? 0)
  const totalOrders = Number(companyOrderCount ?? 0)
  const ownOrders = Number(ownOrderCount ?? 0)
  const totalRevenue = Number(revenueSum ?? 0)
  const currentStreak = (streakData as { current_streak?: number } | null)?.current_streak ?? 0

  const currentByType: Record<string, number> = {
    configs: totalConfigs,
    orders: totalOrders,
    order_revenue: totalRevenue,
    streak: currentStreak,
  }

  type Milestone = { id: string; title: string; goal_type: string; goal_value: number }

  const allMilestonesList = milestones as Milestone[] ?? []
  const unachievedCount = allMilestonesList.filter(m => !achievedIds.has(m.id)).length
  const allMilestonesAchieved = allMilestonesList.length > 0 && unachievedCount === 0

  const closest = allMilestonesList
    .filter(m => !achievedIds.has(m.id) && m.goal_type !== 'shape' && (currentByType[m.goal_type] ?? 0) < m.goal_value)
    .map(m => {
      const current = currentByType[m.goal_type] ?? 0
      const pct = Math.min(Math.round((current / m.goal_value) * 100), 99)
      const c = Math.min(current, m.goal_value)
      const v = m.goal_value
      let progressLabel = ''
      if (m.goal_type === 'configs') progressLabel = `${c} / ${v} config${v !== 1 ? 's' : ''}`
      else if (m.goal_type === 'orders') progressLabel = `${c} / ${v} order${v !== 1 ? 's' : ''}`
      else if (m.goal_type === 'order_revenue') progressLabel = `€${Math.round(c / 100) / 10}k / €${Math.round(v / 1000)}k`
      else if (m.goal_type === 'streak') progressLabel = `${c} / ${v} dag${v !== 1 ? 'en' : ''}`
      return { title: m.title, pct, progressLabel }
    })
    .sort((a, b) => b.pct - a.pct)[0] ?? null

  const canConfigure = !memberData || memberData.role === 'manager' || memberData.can_configure !== false

  return {
    userName: profile?.full_name ?? '',
    company: profile?.company ?? '',
    tier: profile?.tier ?? 'Studio',
    configCount: totalConfigs,
    orderCount: ownOrders,
    isAdmin,
    isSubAdmin,
    isManager,
    canConfigure,
    isInternational,
    isGroothandel,
    pendingCount: pendingCount ?? 0,
    pendingColleaguesCount: pendingColleaguesCount ?? 0,
    avatarUrl: profile?.avatar_url ?? null,
    closestMilestone: (isInternational || isGroothandel) ? null : closest,
    allMilestonesAchieved: (isInternational || isGroothandel) ? false : allMilestonesAchieved,
  }
}
