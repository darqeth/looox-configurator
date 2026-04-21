import type { SupabaseClient } from '@supabase/supabase-js'

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return !!data?.is_admin
}

export async function isSubAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_sub_admin').eq('id', userId).single()
  return !!data?.is_sub_admin
}

export async function isAdminOrSubAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin, is_sub_admin').eq('id', userId).single()
  return !!(data?.is_admin || data?.is_sub_admin)
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
