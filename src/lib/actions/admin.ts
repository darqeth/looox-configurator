'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendApprovalEmail } from '@/lib/email'

export async function toggleInternational(userId: string, value: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return
  await supabase.from('profiles').update({ is_international: value }).eq('id', userId)
  revalidatePath('/admin/gebruikers')
}

export async function updateApprovalStatus(userId: string, status: 'approved' | 'rejected'): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (!await isAdmin(supabase, user.id)) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  await supabase
    .from('profiles')
    .update({ approval_status: status })
    .eq('id', userId)

  if (status === 'approved' && profile?.email) {
    sendApprovalEmail({
      to: profile.email,
      name: profile.full_name ?? 'Gebruiker',
    }).catch(() => {})
  }

  revalidatePath('/admin/gebruikers')
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  if (!await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang.' }

  // Voorkom dat een admin zichzelf verwijdert
  if (userId === user.id) return { success: false, error: 'Je kunt jezelf niet verwijderen.' }

  const admin = createAdminClient()

  // Verwijder in volgorde (FK-afhankelijkheden)
  // Cascades vanuit profiles: user_milestones, login_streaks, company_members, company_invites.invited_by
  // Niet-cascaderende tabellen eerst handmatig verwijderen
  await admin.from('discount_code_uses').delete().eq('user_id', userId)
  await admin.from('configurations').delete().eq('user_id', userId)
  await admin.from('orders').delete().eq('user_id', userId)

  // Verwijder profile (cascades de rest)
  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
  if (profileError) return { success: false, error: 'Verwijderen mislukt: ' + profileError.message }

  // Verwijder auth-gebruiker
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) return { success: false, error: 'Auth verwijderen mislukt: ' + authError.message }

  revalidatePath('/admin/gebruikers')
  return { success: true }
}

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function generatePasswordResetLink(email: string): Promise<{ link?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  if (!await isAdmin(supabase, user.id)) return { error: 'Geen toegang.' }

  const appUrl = await getAppUrl()
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: appUrl },
  })

  if (error || !data) return { error: error?.message ?? 'Link genereren mislukt.' }

  // Supabase embeds SITE_URL (often localhost) in redirect_to — override with actual deployment URL
  const actionLink = new URL(data.properties.action_link)
  actionLink.searchParams.set('redirect_to', appUrl)

  return { link: actionLink.toString() }
}
