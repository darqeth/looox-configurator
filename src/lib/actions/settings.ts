'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/company-utils'

export async function getNotificationEmails(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('notification_emails')
    .eq('id', 'singleton')
    .single()
  return data?.notification_emails ?? ['marketing@rmsanitair.nl']
}

export async function updateNotificationEmails(
  emails: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }
  if (!await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  const valid = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  if (valid.length === 0) return { success: false, error: 'Minimaal één geldig e-mailadres vereist' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('app_settings')
    .update({ notification_emails: valid })
    .eq('id', 'singleton')

  if (error) return { success: false, error: error.message }
  return { success: true }
}
