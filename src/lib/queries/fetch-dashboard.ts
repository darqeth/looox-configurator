'use server'

import { createClient } from '@/lib/supabase/server'
import { getCompanyUserIds } from '@/lib/company-utils'

export type DashboardConfig = {
  id: string
  name: string | null
  article_number: string | null
  total_price: number
  status: string
  created_at: string
  updated_at: string
  width: number | null
  height: number | null
  selected_options: Record<string, unknown> | null
}

type CircleMilestoneEnriched = {
  id: string
  title: string
  goal_type: string
  goal_value: number
  benefit_type: string
  benefit_value: number | null
  benefit_description: string | null
  done: boolean
  isRecent: boolean
  claimedAt: string | null
  umId: string | null
  discountCode: string | null
  isCodeUsed: boolean
  current: number
  pct: number
}

export type DashboardCircle = {
  doneCount: number
  total: number
  overallPct: number
  achieved: CircleMilestoneEnriched[]
  upcoming: CircleMilestoneEnriched[]
}

export type DashboardData = {
  firstName: string
  company: string
  isInternational: boolean
  isGroothandel: boolean
  notificationsReadAt: string | null
  notifications: { id: string; title: string; body: string; type: string; published_at: string }[]
  korting: number
  canOrder: boolean
  totalConfigCount: number
  savedConfigCount: number
  orderedConfigCount: number
  pendingOrderCount: number
  revenueSum: number
  configs: DashboardConfig[]
  changelogs: { id: string; title: string; body: string; published_at: string }[]
  rssItems: { id: string; title: string; url: string; summary: string | null; image_url: string | null; published_at: string | null }[]
  downloads: { id: string; title: string; file_url: string; file_ext: string; file_size: string | null }[]
  circle: DashboardCircle | null
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Eerste batch: profiel + lid info (voor isInternational/isGroothandel check)
  const [
    { data: profile },
    { data: memberData },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, notifications_read_at, is_international, is_groothandel, korting').eq('id', user.id).single(),
    supabase.from('company_members').select('company_id, role, can_order').eq('user_id', user.id).maybeSingle(),
  ])

  const isInternational = profile?.is_international ?? false
  const isGroothandel = profile?.is_groothandel ?? false
  const companyId = memberData?.company_id ?? null

  // Tweede batch: alle data parallel
  const [
    companyUserIds,
    { data: notificationItems },
    { data: configs },
    { count: pendingOrderCount },
    { data: changelogs },
    { data: rssItems },
    { data: circleMilestones },
    { data: userMilestonesData },
    { data: ownOrders },
    { data: companyConfigCount },
    { data: companyOrderCount },
    { data: streakData },
    { data: usedDiscountCodes },
    { data: downloads },
    { count: totalConfigCountResult },
    { data: configStatusRows },
  ] = await Promise.all([
    getCompanyUserIds(supabase, user.id, companyId),
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }).limit(20),
    supabase.from('configurations').select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'confirmed']),
    supabase.from('changelogs').select('id, title, body, published_at').order('published_at', { ascending: false }).limit(20),
    supabase.from('rss_cache').select('id, title, url, summary, image_url, published_at').order('published_at', { ascending: false }).limit(4),
    (isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('milestones').select('id, title, goal_type, goal_value, benefit_type, benefit_value, benefit_description').eq('is_active', true).order('sort_order'),
    (isInternational || isGroothandel) ? Promise.resolve({ data: [], error: null }) : supabase.from('user_milestones').select('id, milestone_id, achieved_at, claimed_at, discount_code').eq('user_id', user.id),
    supabase.from('orders').select('total_price').eq('user_id', user.id),
    supabase.rpc('count_company_configs', { p_user_id: user.id }),
    supabase.rpc('count_company_orders', { p_user_id: user.id }),
    supabase.from('login_streaks').select('current_streak').eq('user_id', user.id).single(),
    supabase.from('discount_codes').select('code').eq('user_id', user.id).not('used_at', 'is', null).limit(50),
    supabase.from('downloads').select('id, title, file_url, file_ext, file_size').eq('is_active', true).order('sort_order').limit(6),
    supabase.from('configurations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('configurations').select('status').eq('user_id', user.id).in('status', ['saved', 'ordered']).limit(500),
  ])

  // Sequentieel: company milestones (heeft companyUserIds nodig)
  const { data: companyMilestonesData } = await (
    (isInternational || isGroothandel)
      ? Promise.resolve({ data: [] })
      : supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds)
  )

  // Derived counts
  const totalConfigCount = totalConfigCountResult ?? 0
  const savedConfigCount = configStatusRows?.filter(c => c.status === 'saved').length ?? 0
  const orderedConfigCount = configStatusRows?.filter(c => c.status === 'ordered').length ?? 0
  const korting = profile?.korting ?? 50
  // can_order is leidend, ook voor een manager; geen member-rij = mag bestellen
  const canOrder = memberData ? (memberData.can_order ?? true) : true
  const revenueSum = (ownOrders ?? []).reduce((sum, o) => sum + Number(o.total_price), 0)

  // LoooX Circle berekeningen
  const circle: DashboardCircle | null = (() => {
    if (!circleMilestones?.length) return null
    const currentStreak = streakData?.current_streak ?? 0
    const usedCodesSet = new Set((usedDiscountCodes ?? []).map(c => c.code as string))
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const companyAchievedIds = new Set((companyMilestonesData ?? []).map(m => m.milestone_id as string))
    const userMilestoneMap = Object.fromEntries(
      (userMilestonesData ?? []).map(um => [
        um.milestone_id,
        { id: um.id as string, achieved_at: um.achieved_at as string | null, claimed_at: um.claimed_at as string | null, discount_code: um.discount_code as string | null },
      ])
    )
    const currentByType: Record<string, number> = {
      configs: Number(companyConfigCount ?? 0),
      orders: Number(companyOrderCount ?? 0),
      order_revenue: revenueSum,
      streak: currentStreak,
    }
    type RawMilestone = { id: string; title: string; goal_type: string; goal_value: number; benefit_type: string; benefit_value: number | null; benefit_description: string | null }
    const enriched: CircleMilestoneEnriched[] = (circleMilestones as RawMilestone[]).map(m => {
      const um = userMilestoneMap[m.id]
      const done = companyAchievedIds.has(m.id) || !!um?.achieved_at || (m.goal_type !== 'shape' && (currentByType[m.goal_type] ?? 0) >= m.goal_value)
      const isRecent = done && !!um?.achieved_at && new Date(um.achieved_at).getTime() > sevenDaysAgo
      const current = currentByType[m.goal_type] ?? 0
      const pct = done ? 100 : Math.min(Math.round((current / m.goal_value) * 100), 99)
      const isCodeUsed = um?.discount_code ? usedCodesSet.has(um.discount_code) : false
      return { ...m, done, isRecent, claimedAt: um?.claimed_at ?? null, umId: um?.id ?? null, discountCode: um?.discount_code ?? null, isCodeUsed, current, pct }
    })
    const doneCount = enriched.filter(m => m.done).length
    const total = enriched.length
    const overallPct = total > 0 ? Math.round((doneCount / total) * 100) : 0
    const hasAction = (m: CircleMilestoneEnriched) =>
      ((m.benefit_type === 'discount_pct' || m.benefit_type === 'discount_fixed') && !m.isCodeUsed && !!m.discountCode) ||
      (m.benefit_type === 'custom' && !m.claimedAt && !!m.umId)
    const achieved = enriched.filter(m => m.done)
      .sort((a, b) => {
        if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1
        return Number(hasAction(b)) - Number(hasAction(a))
      })
      .slice(0, 4)
    const upcoming = enriched.filter(m => !m.done && m.goal_type !== 'shape').sort((a, b) => b.pct - a.pct).slice(0, Math.max(0, 6 - achieved.length))
    return { doneCount, total, overallPct, achieved, upcoming }
  })()

  return {
    firstName: profile?.full_name?.split(' ')[0] ?? 'daar',
    company: profile?.company ?? '',
    isInternational,
    isGroothandel,
    notificationsReadAt: profile?.notifications_read_at ?? null,
    notifications: (notificationItems ?? []) as DashboardData['notifications'],
    korting,
    canOrder,
    totalConfigCount,
    savedConfigCount,
    orderedConfigCount,
    pendingOrderCount: pendingOrderCount ?? 0,
    revenueSum,
    configs: (configs ?? []) as DashboardConfig[],
    changelogs: (changelogs ?? []).map(c => ({ ...c, body: c.body ?? '' })) as DashboardData['changelogs'],
    rssItems: (rssItems ?? []) as DashboardData['rssItems'],
    downloads: (downloads ?? []) as DashboardData['downloads'],
    circle,
  }
}
