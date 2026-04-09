'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  const { data: self } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!self?.is_admin) return { success: false, error: 'Geen toegang.' }

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

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function generatePasswordResetLink(email: string): Promise<{ link?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: self } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!self?.is_admin) return { error: 'Geen toegang.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: getAppUrl() },
  })

  if (error || !data) return { error: error?.message ?? 'Link genereren mislukt.' }

  // Vervang redirect_to met de correcte app-URL (Supabase gebruikt anders SITE_URL = localhost)
  const actionLink = new URL(data.properties.action_link)
  actionLink.searchParams.set('redirect_to', getAppUrl())

  return { link: actionLink.toString() }
}
