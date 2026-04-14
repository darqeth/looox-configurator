import type { SupabaseClient } from '@supabase/supabase-js'

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return !!data?.is_admin
}

export async function getCompanyPriceSettings(
  supabase: SupabaseClient,
  companyId: string | null
): Promise<{ priceFactor: number; priceFactorEnabled: boolean }> {
  if (!companyId) return { priceFactor: 1, priceFactorEnabled: false }
  const { data } = await supabase
    .from('companies')
    .select('price_factor, price_factor_enabled')
    .eq('id', companyId)
    .single()
  return {
    priceFactor: Number(data?.price_factor ?? 1),
    priceFactorEnabled: data?.price_factor_enabled ?? false,
  }
}

export async function getCompanyUserIds(
  supabase: SupabaseClient,
  userId: string,
  companyId: string | null
): Promise<string[]> {
  if (!companyId) return [userId]
  const { data: members } = await supabase
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
  return [...new Set([userId, ...(members ?? []).map(m => m.user_id as string)])]
}
