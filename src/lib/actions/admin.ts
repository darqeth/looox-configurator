'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateApprovalStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()

  // Check of de uitvoerder zelf admin is
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: self } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!self?.is_admin) return { error: 'Geen toegang' }

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: status })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/gebruikers')
  return { ok: true }
}
