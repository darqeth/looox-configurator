'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Use error.code (stable) with message fallback for older Supabase versions
    const code = (error as { code?: string }).code
    if (code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed'))
      return { error: 'Je e-mailadres is nog niet bevestigd. Check je inbox voor de bevestigingsmail.' }
    if (code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials'))
      return { error: 'E-mailadres of wachtwoord klopt niet.' }
    return { error: error.message }
  }

  const user = signInData.user
  if (!user) return { error: 'Inloggen mislukt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.approval_status === 'pending') redirect('/pending')
  if (profile.approval_status === 'rejected')
    redirect('/pending?rejected=true')

  redirect('/dashboard')
}

export async function signUp(data: {
  email: string
  password: string
  fullName: string
  company: string
  phone: string
  inviteToken?: string
}) {
  const supabase = await createClient()

  // Validate invite token before registering (fail fast)
  // Gebruik admin client — invite-tabel heeft RLS die auth.uid() vereist,
  // maar de registrerende gebruiker is nog niet ingelogd.
  let invite: { id: string; company_id: string; can_order: boolean; can_see_purchase_prices: boolean; can_configure: boolean; own_configs_only: boolean } | null = null
  if (data.inviteToken) {
    const admin = createAdminClient()
    const { data: inviteRow } = await admin
      .from('company_invites')
      .select('id, company_id, can_order, can_see_purchase_prices, can_configure, own_configs_only')
      .eq('token', data.inviteToken)
      .eq('email', data.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!inviteRow) return { error: 'Deze uitnodigingslink is ongeldig of verlopen.' }
    invite = inviteRow
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.fullName } },
  })

  if (error) {
    if (error.message.includes('already registered'))
      return { error: 'Dit e-mailadres is al in gebruik.' }
    return { error: error.message }
  }
  if (!authData.user) return { error: 'Registratie mislukt.' }

  // Use upsert so a retry after a failed insert doesn't create a zombie auth user
  // without a profile row.
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email: data.email,
    full_name: data.fullName,
    company: data.company,
    phone: data.phone,
    approval_status: 'pending',
    ...(invite ? { company_id: invite.company_id } : {}),
  }, { onConflict: 'id' })

  if (profileError) return { error: 'Profiel aanmaken mislukt.' }

  // Koppel aan company en markeer invite als geaccepteerd
  // Gebruik admin client — nieuwe user heeft nog geen RLS-rechten op deze tabellen
  if (invite) {
    const admin = createAdminClient()
    await admin.from('company_members').insert({
      company_id: invite.company_id,
      user_id: authData.user.id,
      role: 'member',
      can_order: invite.can_order,
      can_see_purchase_prices: invite.can_see_purchase_prices,
      can_configure: invite.can_configure,
      own_configs_only: invite.own_configs_only,
    })
    await admin
      .from('company_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  redirect('/pending')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
