'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateApprovalStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: self } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!self?.is_admin) return

  await supabase
    .from('profiles')
    .update({ approval_status: status })
    .eq('id', userId)

  revalidatePath('/admin/gebruikers')
}
