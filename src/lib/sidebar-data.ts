import type { SupabaseClient } from '@supabase/supabase-js'
import { getCompanyUserIds } from './company-utils'
import { parseConfiguratorAccess, type ConfiguratorAccess } from './configurator-access'

// Werkweek voor login-streak: dinsdag t/m zaterdag (getDay: di=2 .. za=6).
function isWorkingDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 2 && day <= 6
}

// Vorige werkdag als YYYY-MM-DD (bv. dinsdag -> zaterdag, want zo/ma tellen niet mee).
function prevWorkingDay(dateStr: string): string {
  const d = new Date(dateStr)
  do {
    d.setDate(d.getDate() - 1)
  } while (!isWorkingDay(d))
  return d.toISOString().split('T')[0]
}

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
  configuratorAccess: ConfiguratorAccess
  pendingCount: number
  pendingColleaguesCount: number
  avatarUrl: string | null
  closestMilestone: ClosestMilestone | null
  allMilestonesAchieved: boolean
}

type Milestone = { id: string; title: string; goal_type: string; goal_value: number }

function computeMilestones(
  milestones: Milestone[],
  achievedIds: Set<string>,
  currentByType: Record<string, number>
): { closest: ClosestMilestone | null; allAchieved: boolean } {
  const unachievedCount = milestones.filter(m => !achievedIds.has(m.id)).length
  const allAchieved = milestones.length > 0 && unachievedCount === 0

  const closest = milestones
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

  return { closest, allAchieved }
}

type SidebarRpcResult = {
  profile: {
    full_name: string | null
    company: string | null
    company_id: string | null
    tier: string | null
    is_admin: boolean | null
    is_sub_admin: boolean | null
    avatar_url: string | null
    is_international: boolean | null
    is_groothandel: boolean | null
    configurator_access: string | null
  } | null
  member: { role: string | null; company_id: string | null; can_configure: boolean | null } | null
  company_order_count: number
  own_order_count: number
  pending_count: number
  pending_colleagues_count: number
  milestones: Milestone[]
  revenue_sum: number
  streak: { current_streak: number } | null
  config_count: number
  maatwerk_config_count?: number
  achieved_milestone_ids: string[]
}

export async function fetchSidebarData(
  supabase: SupabaseClient,
  userId: string
): Promise<SidebarData> {
  // Snelle pad: één RPC i.p.v. 13 losse queries in 4 sequentiële golven.
  // Vereist supabase/sidebar-rpc-migration.sql; zolang die niet is uitgevoerd
  // valt dit automatisch terug op het oude query-pad.
  const { data: rpc, error } = await supabase.rpc('get_sidebar_data')
  if (!error && rpc) return buildFromRpc(rpc as SidebarRpcResult)
  return fetchSidebarDataLegacy(supabase, userId)
}

function buildFromRpc(rpc: SidebarRpcResult): SidebarData {
  const profile = rpc.profile
  const member = rpc.member && rpc.member.role !== null ? rpc.member : null

  const isAdmin = profile?.is_admin ?? false
  const isSubAdmin = profile?.is_sub_admin ?? false
  const isInternational = profile?.is_international ?? false
  const configuratorAccess = parseConfiguratorAccess(profile?.configurator_access)
  // 'project'-stand verbergt Circle/milestones (besluit B4); 'beide' ziet alles
  const isGroothandel = configuratorAccess === 'project'
  const isSpecial = isInternational || isGroothandel
  const isManager = member?.role === 'manager'

  const currentByType: Record<string, number> = {
    // Milestones tellen alleen maatwerk (besluit B4); config_count blijft
    // het totaal voor het menu-badge
    configs: Number(rpc.maatwerk_config_count ?? rpc.config_count ?? 0),
    orders: Number(rpc.company_order_count ?? 0),
    order_revenue: Number(rpc.revenue_sum ?? 0),
    streak: rpc.streak?.current_streak ?? 0,
  }

  const { closest, allAchieved } = computeMilestones(
    rpc.milestones ?? [],
    new Set(rpc.achieved_milestone_ids ?? []),
    currentByType
  )

  const canConfigure = !member || member.role === 'manager' || member.can_configure !== false

  return {
    userName: profile?.full_name ?? '',
    company: profile?.company ?? '',
    tier: profile?.tier ?? 'Studio',
    configCount: Number(rpc.config_count ?? 0),
    orderCount: Number(rpc.own_order_count ?? 0),
    isAdmin,
    isSubAdmin,
    isManager,
    canConfigure,
    isInternational,
    isGroothandel,
    configuratorAccess,
    pendingCount: Number(rpc.pending_count ?? 0),
    pendingColleaguesCount: Number(rpc.pending_colleagues_count ?? 0),
    avatarUrl: profile?.avatar_url ?? null,
    closestMilestone: isSpecial ? null : closest,
    allMilestonesAchieved: isSpecial ? false : allAchieved,
  }
}

async function fetchSidebarDataLegacy(
  supabase: SupabaseClient,
  userId: string
): Promise<SidebarData> {
  const [{ data: profile }, { data: memberData }] = await Promise.all([
    supabase.from('profiles').select('full_name, company, company_id, tier, is_admin, is_sub_admin, avatar_url, is_international, is_groothandel, configurator_access').eq('id', userId).single(),
    supabase.from('company_members').select('role, company_id, can_configure').eq('user_id', userId).single(),
  ])

  const isAdmin = profile?.is_admin ?? false
  const isSubAdmin = profile?.is_sub_admin ?? false
  const isInternational = profile?.is_international ?? false
  const configuratorAccess = parseConfiguratorAccess((profile as { configurator_access?: string | null } | null)?.configurator_access)
  const isGroothandel = configuratorAccess === 'project'
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
  // Werkweek is di t/m za (getDay 2..6). Zondag/maandag tellen niet mee en breken de streak niet.
  const now = new Date()
  if (!isInternational && !isGroothandel && isWorkingDay(now)) {
    const today = now.toISOString().split('T')[0]
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
      const prevDay = prevWorkingDay(today)
      const newStreak = streak.last_login_date === prevDay ? streak.current_streak + 1 : 1
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

  const { closest, allAchieved } = computeMilestones(
    (milestones as Milestone[]) ?? [],
    achievedIds,
    currentByType
  )

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
    configuratorAccess,
    pendingCount: pendingCount ?? 0,
    pendingColleaguesCount: pendingColleaguesCount ?? 0,
    avatarUrl: profile?.avatar_url ?? null,
    closestMilestone: (isInternational || isGroothandel) ? null : closest,
    allMilestonesAchieved: (isInternational || isGroothandel) ? false : allAchieved,
  }
}
