'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberPermissions = {
  role: 'manager' | 'member'
  can_order: boolean
  can_see_purchase_prices: boolean
  can_configure: boolean
  own_configs_only: boolean
}

// ─── Collega uitnodigen ────────────────────────────────────────────────────────

export async function inviteColleague(email: string): Promise<
  { success: true; token: string } | { success: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  // Verificeer dat de ingelogde user manager is
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'manager')
    return { success: false, error: 'Alleen managers kunnen collega\'s uitnodigen.' }

  // Check of het e-mailadres al in gebruik is
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) return { success: false, error: 'Dit e-mailadres is al geregistreerd.' }

  // Insert invite (UNIQUE constraint op company_id+email voorkomt duplicaten)
  const { data: invite, error } = await supabase
    .from('company_invites')
    .upsert(
      {
        company_id: member.company_id,
        invited_by: user.id,
        email,
        // Reset token en verloopdatum bij opnieuw uitnodigen
        token: null as unknown as string,  // DB genereert nieuwe token via DEFAULT
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
      },
      { onConflict: 'company_id,email', ignoreDuplicates: false }
    )
    .select('token')
    .single()

  if (error || !invite) return { success: false, error: 'Uitnodiging aanmaken mislukt.' }

  revalidatePath('/account/collegas')
  return { success: true, token: invite.token }
}

// ─── Rechten bijwerken ────────────────────────────────────────────────────────

export async function updateMemberPermissions(
  memberId: string,
  permissions: MemberPermissions
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  // Verificeer manager-rol
  const { data: myMember } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myMember || myMember.role !== 'manager')
    return { success: false, error: 'Alleen managers kunnen rechten aanpassen.' }

  // Verificeer dat het target-member bij hetzelfde bedrijf hoort
  const { data: target } = await supabase
    .from('company_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('company_id', myMember.company_id)
    .single()

  if (!target) return { success: false, error: 'Collega niet gevonden.' }

  // Blokkeer: voorkom dat de enige manager zichzelf degradeert
  if (target.user_id === user.id && permissions.role === 'member') {
    const { count } = await supabase
      .from('company_members')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', myMember.company_id)
      .eq('role', 'manager')

    if ((count ?? 0) <= 1)
      return { success: false, error: 'Je bent de enige manager. Promoveer eerst een andere collega.' }
  }

  const { error } = await supabase
    .from('company_members')
    .update({
      role: permissions.role,
      can_order: permissions.can_order,
      can_see_purchase_prices: permissions.can_see_purchase_prices,
      can_configure: permissions.can_configure,
      own_configs_only: permissions.own_configs_only,
    })
    .eq('id', memberId)
    .eq('company_id', myMember.company_id)

  if (error) return { success: false, error: 'Bijwerken mislukt.' }

  revalidatePath('/account/collegas')
  return { success: true }
}

// ─── Collega verwijderen ──────────────────────────────────────────────────────

export async function removeMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  const { data: myMember } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myMember || myMember.role !== 'manager')
    return { success: false, error: 'Alleen managers kunnen collega\'s verwijderen.' }

  const { data: target } = await supabase
    .from('company_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('company_id', myMember.company_id)
    .single()

  if (!target) return { success: false, error: 'Collega niet gevonden.' }

  // Blokkeer verwijdering van de enige manager
  if (target.role === 'manager') {
    const { count } = await supabase
      .from('company_members')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', myMember.company_id)
      .eq('role', 'manager')

    if ((count ?? 0) <= 1)
      return { success: false, error: 'Je bent de enige manager. Promoveer eerst een andere collega.' }
  }

  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId)
    .eq('company_id', myMember.company_id)

  if (error) return { success: false, error: 'Verwijderen mislukt.' }

  revalidatePath('/account/collegas')
  return { success: true }
}

// ─── Invite intrekken ─────────────────────────────────────────────────────────

export async function revokeInvite(
  inviteId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd.' }

  const { data: myMember } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myMember || myMember.role !== 'manager')
    return { success: false, error: 'Alleen managers kunnen uitnodigingen intrekken.' }

  const { error } = await supabase
    .from('company_invites')
    .delete()
    .eq('id', inviteId)
    .eq('company_id', myMember.company_id)
    .is('accepted_at', null)

  if (error) return { success: false, error: 'Intrekken mislukt.' }

  revalidatePath('/account/collegas')
  return { success: true }
}
