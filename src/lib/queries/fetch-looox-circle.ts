'use server'

import { createClient } from '@/lib/supabase/server'
import { getCompanyUserIds } from '@/lib/company-utils'

export type LoooxCircleMilestone = {
  id: string
  title: string
  description: string
  goal_type: string
  goal_value: number
  goal_shape: string | null
  benefit_type: string
  benefit_value: number | null
  benefit_description: string | null
  is_active: boolean
  sort_order: number
  current: number
  pct: number
  done: boolean
  userMilestone: { id: string; milestone_id: string; discount_code: string | null; claimed_at: string | null } | null
  discountUsed: boolean
}

export type LoooxCircleData = {
  company: string
  createdAt: string | null
  milestones: LoooxCircleMilestone[]
  celebrationMilestones: { id: string; title: string; perk: string; done: boolean }[]
}

export async function fetchLoooxCircle(): Promise<LoooxCircleData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profileFull } = await supabase
    .from('profiles')
    .select('full_name, company, created_at, company_id')
    .eq('id', user.id)
    .single()

  const companyId = profileFull?.company_id ?? null
  const companyUserIds = await getCompanyUserIds(supabase, user.id, companyId)

  const [
    { data: milestones },
    { data: companyMilestones },
    { data: myMilestones },
    { data: configCount },
    { data: orderCount },
    { data: revenueSum },
    { data: streakData },
    { data: shapeData },
    { data: usedDiscountCodes },
  ] = await Promise.all([
    supabase.from('milestones').select('id, title, description, goal_type, goal_value, goal_shape, benefit_type, benefit_value, benefit_description, is_active, sort_order').eq('is_active', true).order('sort_order').order('created_at'),
    supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds),
    supabase.from('user_milestones').select('id, milestone_id, discount_code, claimed_at').eq('user_id', user.id),
    supabase.rpc('count_company_configs', { p_user_id: user.id }),
    supabase.rpc('count_company_orders', { p_user_id: user.id }),
    supabase.rpc('sum_order_revenue', { p_user_id: user.id }),
    supabase.from('login_streaks').select('current_streak, longest_streak').eq('user_id', user.id).single(),
    supabase.rpc('get_user_configured_shapes', { p_user_id: user.id }),
    supabase.from('discount_codes').select('code').eq('user_id', user.id).not('used_at', 'is', null),
  ])

  const configs = Number(configCount ?? 0)
  const orders = Number(orderCount ?? 0)
  const totalRevenue = Number(revenueSum ?? 0)
  const currentStreak = streakData?.current_streak ?? 0
  const shapeCountMap = new Map<string, number>(
    (shapeData ?? []).map((r: { shape: string; shape_count: number }) => [r.shape, Number(r.shape_count)])
  )
  const companyAchievedIds = new Set((companyMilestones ?? []).map(m => m.milestone_id))
  const myMilestoneMap = new Map((myMilestones ?? []).map(um => [um.milestone_id, um]))
  const usedCodesSet = new Set((usedDiscountCodes ?? []).map(c => c.code))
  const achievedMap = new Map([...companyAchievedIds].map(mid => [mid, myMilestoneMap.get(mid) ?? null]))

  function getProgress(m: { goal_type: string; goal_value: number; goal_shape: string | null }) {
    let current = 0
    if (m.goal_type === 'configs') current = configs
    else if (m.goal_type === 'orders') current = orders
    else if (m.goal_type === 'order_revenue') current = totalRevenue
    else if (m.goal_type === 'streak') current = currentStreak
    else if (m.goal_type === 'shape') current = m.goal_shape ? (shapeCountMap.get(m.goal_shape) ?? 0) : 0
    const goal = Number(m.goal_value)
    const pct = Math.min(Math.round((current / goal) * 100), 100)
    const done = current >= goal
    return { current, pct, done }
  }

  type RawMilestone = { id: string; title: string; description: string | null; goal_type: string; goal_value: number; goal_shape: string | null; benefit_type: string; benefit_value: number | null; benefit_description: string | null; is_active: boolean; sort_order: number }

  const milestonesWithProgress: LoooxCircleMilestone[] = (milestones ?? [] as RawMilestone[]).map((m: RawMilestone) => {
    const { current, pct, done: progressDone } = getProgress(m)
    const done = companyAchievedIds.has(m.id) || progressDone
    const um = achievedMap.get(m.id) ?? null
    const discountUsed = um?.discount_code ? usedCodesSet.has(um.discount_code) : false
    return {
      ...m,
      description: m.description ?? '',
      current,
      pct,
      done,
      userMilestone: um ? { id: um.id, milestone_id: um.milestone_id, discount_code: um.discount_code, claimed_at: um.claimed_at } : null,
      discountUsed,
    }
  })

  const celebrationMilestones = milestonesWithProgress
    .filter(m => m.done)
    .map(m => ({
      id: m.id,
      title: m.title,
      perk: m.benefit_type === 'custom' ? (m.benefit_description ?? '') : `${m.benefit_value}${m.benefit_type === 'discount_pct' ? '%' : '€'} korting`,
      done: true,
    }))

  return {
    company: profileFull?.company ?? profileFull?.full_name ?? 'jouw bedrijf',
    createdAt: profileFull?.created_at ?? null,
    milestones: milestonesWithProgress,
    celebrationMilestones,
  }
}
