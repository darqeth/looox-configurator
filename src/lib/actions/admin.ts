'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendApprovalEmail, sendOrderStatusEmail, sendControleVereistEmail } from '@/lib/email'

export async function toggleInternational(userId: string, value: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return
  await supabase.from('profiles').update({ is_international: value }).eq('id', userId)
  revalidatePath('/admin/gebruikers')
}

export async function updateKorting(userId: string, korting: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return
  await supabase.from('profiles').update({ korting: Math.min(100, Math.max(0, korting)) }).eq('id', userId)
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

export async function linkUserToCompany(
  userId: string,
  companyId: string,
  permissions?: {
    role?: 'manager' | 'member'
    can_order?: boolean
    can_see_purchase_prices?: boolean
    can_configure?: boolean
    own_configs_only?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  const admin = createAdminClient()

  const perms = {
    role: permissions?.role ?? 'manager',
    can_order: permissions?.can_order ?? true,
    can_see_purchase_prices: permissions?.can_see_purchase_prices ?? true,
    can_configure: permissions?.can_configure ?? true,
    own_configs_only: permissions?.own_configs_only ?? false,
  }

  // Haal bedrijfsnaam op om profiles.company synchroon te houden
  const { data: company } = await admin.from('companies').select('name').eq('id', companyId).single()
  await admin.from('profiles').update({ company_id: companyId, ...(company ? { company: company.name } : {}) }).eq('id', userId)

  const { data: existingMember } = await admin
    .from('company_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingMember) {
    await admin.from('company_members').update({ company_id: companyId, ...perms }).eq('user_id', userId)
  } else {
    await admin.from('company_members').insert({ company_id: companyId, user_id: userId, ...perms })
  }

  revalidatePath('/admin/gebruikers')
  return { success: true }
}

export async function updateMemberPermissions(
  userId: string,
  permissions: {
    role: 'manager' | 'member'
    can_order: boolean
    can_see_purchase_prices: boolean
    can_configure: boolean
    own_configs_only: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  const admin = createAdminClient()
  const { error } = await admin.from('company_members').update(permissions).eq('user_id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/gebruikers')
  return { success: true }
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

export type OrderStatus = 'pending' | 'confirmed' | 'controle_vereist' | 'goedgekeurd' | 'afgekeurd' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  // Haal order op voor e-mail (voor de update, zodat we user_id hebben)
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, user_id')
    .eq('id', orderId)
    .single()

  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/bestellingen')
  revalidatePath('/bestellingen')

  // Status e-mail naar dealer (niet bij pending — dat is de initiële status)
  if (status !== 'pending' && order?.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', order.user_id)
      .single()

    if (profile?.email) {
      sendOrderStatusEmail({
        to: profile.email,
        name: profile.full_name ?? 'Gebruiker',
        orderNumber: order.order_number,
        status,
      }).catch(() => {})
    }
  }

  return { success: true }
}

export async function setControleVereist(
  orderId: string,
  drawings: { file_url: string; file_name: string }[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, user_id')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Bestelling niet gevonden' }

  await supabase.from('order_drawings').delete().eq('order_id', orderId)

  if (drawings.length > 0) {
    const { error: insertError } = await supabase.from('order_drawings').insert(
      drawings.map(d => ({ order_id: orderId, file_url: d.file_url, file_name: d.file_name }))
    )
    if (insertError) return { success: false, error: insertError.message }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'controle_vereist', afkeur_reden: null })
    .eq('id', orderId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/bestellingen')
  revalidatePath('/bestellingen')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', order.user_id)
    .single()

  if (profile?.email) {
    sendControleVereistEmail({
      to: profile.email,
      name: profile.full_name ?? 'Gebruiker',
      orderNumber: order.order_number,
      drawings,
    }).catch(() => {})
  }

  return { success: true }
}

export async function updateSubAdmin(
  userId: string,
  value: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }
  if (userId === user.id) return { success: false, error: 'Kan jezelf niet wijzigen' }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_sub_admin: value }).eq('id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/gebruikers')
  return { success: true }
}

export async function updateSuperAdmin(
  userId: string,
  value: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }
  if (userId === user.id) return { success: false, error: 'Kan jezelf niet wijzigen' }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_admin: value }).eq('id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/gebruikers')
  return { success: true }
}
