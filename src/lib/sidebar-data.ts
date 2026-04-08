import type { SupabaseClient } from '@supabase/supabase-js'

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
  isManager: boolean
  canConfigure: boolean
  pendingCount: number
  pendingColleaguesCount: number
  avatarUrl: string | null
  closestMilestone: ClosestMilestone | null
}

export async function fetchSidebarData(
  supabase: SupabaseClient,
  userId: string
): Promise<SidebarData> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, company_id, tier, is_admin, avatar_url')
    .eq('id', userId)
    .single()

  const isAdmin = profile?.is_admin ?? false

  const { data: memberData } = await supabase
    .from('company_members')
    .select('role, company_id, can_configure')
    .eq('user_id', userId)
    .single()

  const isManager = memberData?.role === 'manager'
  const companyId = profile?.company_id ?? memberData?.company_id ?? null

  // Bedrijfsbrede user_ids voor milestone-check
  let companyUserIds: string[] = [userId]
  if (companyId) {
    const { data: members } = await supabase.from('company_members').select('user_id').eq('company_id', companyId)
    companyUserIds = [...new Set([userId, ...(members ?? []).map((m: { user_id: string }) => m.user_id)])]
  }

  const [
    { data: configCount },
    { data: orderCount },
    { count: pendingCount },
    { count: pendingColleaguesCount },
    { data: milestones },
    { data: userMilestonesData },
    { data: revenueSum },
    { data: streakData },
  ] = await Promise.all([
    supabase.rpc('count_company_configs', { p_user_id: userId }),
    supabase.rpc('count_company_orders', { p_user_id: userId }),
    isAdmin
      ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
      : Promise.resolve({ count: 0, data: null, error: null }),
    isManager && companyId
      ? supabase.from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('approval_status', 'pending')
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase.from('milestones').select('id, title, goal_type, goal_value').eq('is_active', true).order('sort_order'),
    supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds),
    supabase.rpc('sum_order_revenue', { p_user_id: userId }),
    supabase.from('login_streaks').select('current_streak').eq('user_id', userId).single(),
  ])

  // Compute closest unachieved milestone
  const achievedIds = new Set((userMilestonesData ?? []).map((um: { milestone_id: string }) => um.milestone_id))
  const totalConfigs = Number(configCount ?? 0)
  const totalOrders = Number(orderCount ?? 0)
  const totalRevenue = Number(revenueSum ?? 0)
  const currentStreak = (streakData as { current_streak?: number } | null)?.current_streak ?? 0

  const currentByType: Record<string, number> = {
    configs: totalConfigs,
    orders: totalOrders,
    order_revenue: totalRevenue,
    streak: currentStreak,
  }

  type Milestone = { id: string; title: string; goal_type: string; goal_value: number }

  const closest = (milestones as Milestone[] ?? [])
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
    orderCount: totalOrders,
    isAdmin,
    isManager,
    canConfigure,
    pendingCount: pendingCount ?? 0,
    pendingColleaguesCount: pendingColleaguesCount ?? 0,
    avatarUrl: profile?.avatar_url ?? null,
    closestMilestone: closest,
  }
}
