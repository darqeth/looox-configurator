'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  await supabase.from('profiles').update({
    notifications_read_at: new Date().toISOString(),
  }).eq('id', user.id)

  revalidatePath('/dashboard')
}

export async function createNotification(input: {
  title: string
  body: string
  type: 'info' | 'feature' | 'promo'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Geen toegang')

  const { error } = await supabase.from('notifications').insert({
    title: input.title.trim(),
    body: input.body.trim() || null,
    type: input.type,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/admin/meldingen')
}

export async function deleteNotification(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Geen toegang')

  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/admin/meldingen')
}
