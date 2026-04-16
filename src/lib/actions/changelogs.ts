'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'
import { sendUpdateNotificationEmail } from '@/lib/email'

export async function createChangelog(data: {
  version: string
  title: string
  body: string
  sendEmail?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  // Normaliseer versie: voeg 'v' prefix toe als die ontbreekt (bijv. "1.5" → "v1.5")
  const rawVersion = data.version.trim()
  const version = rawVersion
    ? rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`
    : ''
  const fullTitle = version
    ? `${version} — ${data.title.trim()}`
    : data.title.trim()

  await supabase.from('changelogs').insert({
    title: fullTitle,
    body: data.body.trim() || null,
    published_at: new Date().toISOString(),
  })

  if (data.sendEmail) {
    sendUpdateNotificationEmail({
      to: 'marketing@rmsanitair.nl',
      title: fullTitle,
      body: data.body.trim() || null,
    }).catch(() => {})
  }

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
