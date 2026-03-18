'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed'))
      return { error: 'Je e-mailadres is nog niet bevestigd. Check je inbox voor de bevestigingsmail.' }
    if (error.message.toLowerCase().includes('invalid login credentials'))
      return { error: 'E-mailadres of wachtwoord klopt niet.' }
    return { error: error.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
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
}) {
  const supabase = await createClient()

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

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: data.email,
    full_name: data.fullName,
    company: data.company,
    phone: data.phone,
    approval_status: 'pending',
  })

  if (profileError) return { error: 'Profiel aanmaken mislukt.' }

  redirect('/pending')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
