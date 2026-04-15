'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'

export async function createDownload(data: {
  title: string
  file_url: string
  file_ext: string
  file_size: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  const { count } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })

  await supabase.from('downloads').insert({
    title: data.title.trim(),
    file_url: data.file_url.trim(),
    file_ext: data.file_ext.toUpperCase(),
    file_size: data.file_size.trim(),
    sort_order: (count ?? 0) + 1,
    is_active: true,
  })

  revalidatePath('/admin/downloads')
  revalidatePath('/dashboard')
}

export async function deleteDownload(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  await supabase.from('downloads').delete().eq('id', id)

  revalidatePath('/admin/downloads')
  revalidatePath('/dashboard')
}

export async function updateDownload(id: string, data: {
  title: string
  file_url: string
  file_ext: string
  file_size: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  await supabase.from('downloads').update({
    title: data.title.trim(),
    file_url: data.file_url.trim(),
    file_ext: data.file_ext.toUpperCase(),
    file_size: data.file_size.trim(),
  }).eq('id', id)

  revalidatePath('/admin/downloads')
  revalidatePath('/dashboard')
}

export async function moveDownload(id: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  const { data: all } = await supabase
    .from('downloads')
    .select('id, sort_order')
    .order('sort_order')

  if (!all) return

  const idx = all.findIndex(d => d.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return

  const a = all[idx]
  const b = all[swapIdx]

  await Promise.all([
    supabase.from('downloads').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('downloads').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/admin/downloads')
  revalidatePath('/dashboard')
}
