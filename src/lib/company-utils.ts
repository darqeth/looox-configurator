import type { SupabaseClient } from '@supabase/supabase-js'

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
