'use server'

import { createClient } from '@/lib/supabase/server'
import { getNotificationEmails } from '@/lib/actions/settings'
import { sendSupportEmail } from '@/lib/email'

export type SupportType = 'probleem' | 'vraag' | 'technisch' | 'feature'

export async function sendSupportRequest(data: {
  type: SupportType
  urgent: boolean
  subject: string
  description: string
  configId?: string
  screenshotBase64?: string
  screenshotName?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, company')
    .eq('id', user.id)
    .single()

  let configLabel: string | undefined
  if (data.configId) {
    const { data: config } = await supabase
      .from('configurations')
      .select('name, article_number, width, height')
      .eq('id', data.configId)
      .single()
    if (config) {
      const dims = config.width && config.height ? `${config.width} × ${config.height} cm` : ''
      const art = config.article_number ? `Art. ${config.article_number}` : ''
      const suffix = [dims, art].filter(Boolean).join(' · ')
      configLabel = suffix ? `${config.name} (${suffix})` : config.name
    }
  }

  const to = await getNotificationEmails()
  const senderEmail = profile?.email ?? ''

  await sendSupportEmail({
    to,
    replyTo: senderEmail,
    senderName: profile?.full_name ?? 'Gebruiker',
    senderEmail,
    senderCompany: profile?.company ?? '',
    type: data.type,
    urgent: data.urgent,
    subject: data.subject,
    description: data.description,
    configLabel,
    screenshotBase64: data.screenshotBase64,
    screenshotName: data.screenshotName,
  }).catch(() => {})

  return { success: true }
}

export async function getMyConfigs(): Promise<{
  id: string
  name: string
  article_number: string | null
  width: number | null
  height: number | null
}[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height')
    .eq('user_id', user.id)
    .eq('status', 'saved')
    .order('updated_at', { ascending: false })
    .limit(20)

  return data ?? []
}
