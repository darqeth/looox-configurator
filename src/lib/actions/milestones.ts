'use server'

import { createClient } from '@/lib/supabase/server'
import { getCompanyUserIds, isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MilestoneGoalType = 'configs' | 'orders' | 'order_revenue' | 'shape' | 'streak'
export type MilestoneBenefitType = 'discount_pct' | 'discount_fixed' | 'custom'

export type Milestone = {
  id: string
  title: string
  description: string
  goal_type: MilestoneGoalType
  goal_value: number
  goal_shape: string | null
  benefit_type: MilestoneBenefitType
  benefit_value: number | null
  benefit_description: string | null
  is_active: boolean
  sort_order: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCode(prefix: string, length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(length))
  let code = prefix + '-'
  for (let i = 0; i < length; i++) {
    if (i === 4) code += '-'
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

// ─── Admin: CRUD milestones ───────────────────────────────────────────────────

export async function createMilestone(data: {
  title: string
  description: string
  goal_type: MilestoneGoalType
  goal_value: number
  goal_shape?: string | null
  benefit_type: MilestoneBenefitType
  benefit_value?: number | null
  benefit_description?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Forbidden' }

  const { error } = await supabase.from('milestones').insert({
    ...data,
    goal_shape: data.goal_shape ?? null,
    benefit_value: data.benefit_value ?? null,
    benefit_description: data.benefit_description ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/milestones')
  return { success: true }
}

export async function updateMilestone(id: string, data: Partial<Milestone>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Forbidden' }

  const { error } = await supabase.from('milestones').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/milestones')
  return { success: true }
}

export async function deleteMilestone(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Forbidden' }

  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/milestones')
  return { success: true }
}

// ─── Admin: Standalone kortingscodes ─────────────────────────────────────────

export async function createDiscountCode(data: {
  type: 'pct' | 'fixed'
  value: number
  expires_at?: string | null
  user_id?: string | null
  use_type?: 'single' | 'per_user'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Forbidden' }

  const code = generateCode('LX')

  const { error } = await supabase.from('discount_codes').insert({
    code,
    type: data.type,
    value: data.value,
    user_id: data.user_id ?? null,
    expires_at: data.expires_at ?? null,
    use_type: data.use_type ?? 'single',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/milestones')
  return { success: true, code }
}

export async function deleteDiscountCode(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Forbidden' }

  const { error } = await supabase.from('discount_codes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/milestones')
  return { success: true }
}

// ─── Dealer: check & award milestones ────────────────────────────────────────

export type AwardedMilestone = {
  id: string
  title: string
  perk: string
}

export async function checkAndAwardMilestones(): Promise<AwardedMilestone[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // company_members is bron van waarheid — profile.company_id kan stale zijn na verwijdering
  const { data: memberRow } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  const companyId = memberRow?.company_id ?? null

  const companyUserIds = await getCompanyUserIds(supabase, user.id, companyId)

  const [
    { data: milestones },
    { data: alreadyAchieved },
    { data: configCount },
    { data: orderCount },
    { data: revenueSum },
    { data: streakData },
    { data: shapeData },
  ] = await Promise.all([
    supabase.from('milestones').select('*').eq('is_active', true),
    // Bedrijfsbreed: als IEMAND in het bedrijf de milestone al heeft, niet opnieuw toekennen
    supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds),
    // Company-brede counts via RPCs
    supabase.rpc('count_company_configs', { p_user_id: user.id }),
    supabase.rpc('count_company_orders', { p_user_id: user.id }),
    supabase.rpc('sum_order_revenue', { p_user_id: user.id }),
    supabase.from('login_streaks').select('current_streak').eq('user_id', user.id).single(),
    // Shape milestone: directe query zodat we kunnen tellen per vorm
    supabase.from('configurations').select('selected_options').in('user_id', companyUserIds),
  ])

  if (!milestones) return []

  const achievedIds = new Set((alreadyAchieved ?? []).map(a => a.milestone_id))
  const newlyAwarded: AwardedMilestone[] = []
  const totalConfigs = Number(configCount ?? 0)
  const totalOrders = Number(orderCount ?? 0)
  const totalRevenue = Number(revenueSum ?? 0)
  const currentStreak = streakData?.current_streak ?? 0

  // Tel configuraties per vorm
  const shapeCounts: Record<string, number> = {}
  for (const c of (shapeData ?? [])) {
    const shape = (c.selected_options as Record<string, unknown> | null)?.shape as string | undefined
    if (shape) shapeCounts[shape] = (shapeCounts[shape] ?? 0) + 1
  }

  for (const m of milestones) {
    if (achievedIds.has(m.id)) continue

    let achieved = false
    if (m.goal_type === 'configs') achieved = totalConfigs >= m.goal_value
    else if (m.goal_type === 'orders') achieved = totalOrders >= m.goal_value
    else if (m.goal_type === 'order_revenue') achieved = totalRevenue >= m.goal_value
    else if (m.goal_type === 'streak') achieved = currentStreak >= m.goal_value
    else if (m.goal_type === 'shape') achieved = m.goal_shape ? (shapeCounts[m.goal_shape] ?? 0) >= m.goal_value : false

    if (!achieved) continue

    // Voor korting: genereer unieke code en sla op in discount_codes
    let discountCode: string | null = null
    if (m.benefit_type === 'discount_pct' || m.benefit_type === 'discount_fixed') {
      discountCode = generateCode('LX')
      await supabase.from('discount_codes').insert({
        code: discountCode,
        type: m.benefit_type === 'discount_pct' ? 'pct' : 'fixed',
        value: m.benefit_value ?? 0,
        user_id: user.id,
        milestone_id: m.id,
      })
    }

    await supabase.from('user_milestones').insert({
      user_id: user.id,
      milestone_id: m.id,
      discount_code: discountCode,
    })

    newlyAwarded.push({
      id: m.id,
      title: m.title,
      perk: m.benefit_description ?? (
        m.benefit_type === 'discount_pct' ? `${m.benefit_value}% korting`
        : m.benefit_type === 'discount_fixed' ? `€${m.benefit_value} korting`
        : 'Voordeel beschikbaar'
      ),
    })
  }

  revalidatePath('/looox-circle')
  return newlyAwarded
}

// ─── Dealer: custom voordeel claimen (markeer als gezien) ────────────────────

export async function claimCustomBenefit(userMilestoneId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: um } = await supabase
    .from('user_milestones')
    .select('id, user_id, claimed_at')
    .eq('id', userMilestoneId)
    .eq('user_id', user.id)
    .single()

  if (!um) return { success: false, error: 'Niet gevonden' }
  if (um.claimed_at) return { success: true }

  await supabase
    .from('user_milestones')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', userMilestoneId)

  revalidatePath('/looox-circle')
  return { success: true }
}

// ─── Dealer: kortingscode valideren ──────────────────────────────────────────

export async function validateDiscountCode(code: string): Promise<{
  valid: boolean
  type?: 'pct' | 'fixed'
  value?: number
  id?: string
  use_type?: 'single' | 'per_user'
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { valid: false, error: 'Unauthorized' }

  const { data } = await supabase
    .from('discount_codes')
    .select('id, type, value, user_id, used_at, expires_at, use_type')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!data) return { valid: false, error: 'Code niet gevonden' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, error: 'Code verlopen' }
  if (data.user_id && data.user_id !== user.id) return { valid: false, error: 'Code niet geldig voor dit account' }

  const useType = (data.use_type ?? 'single') as 'single' | 'per_user'

  if (useType === 'single') {
    if (data.used_at) return { valid: false, error: 'Code al gebruikt' }
  } else {
    // per_user: controleer of déze dealer de code al gebruikt heeft
    const { data: existing } = await supabase
      .from('discount_code_uses')
      .select('id')
      .eq('code_id', data.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return { valid: false, error: 'Je hebt deze code al eerder gebruikt' }
  }

  return { valid: true, type: data.type as 'pct' | 'fixed', value: Number(data.value), id: data.id, use_type: useType }
}
