'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'

export async function createChangelog(data: {
  version: string
  title: string
  body: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  const fullTitle = data.version.trim()
    ? `${data.version.trim()} — ${data.title.trim()}`
    : data.title.trim()

  await supabase.from('changelogs').insert({
    title: fullTitle,
    body: data.body.trim() || null,
    published_at: new Date().toISOString(),
  })

  revalidatePath('/admin/meldingen')
  revalidatePath('/dashboard')
}

export async function deleteChangelog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  await supabase.from('changelogs').delete().eq('id', id)

  revalidatePath('/admin/meldingen')
  revalidatePath('/dashboard')
}
