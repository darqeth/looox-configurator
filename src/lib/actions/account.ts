'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const fullName = (formData.get('full_name') as string ?? '').slice(0, 100)
  const company  = (formData.get('company')   as string ?? '').slice(0, 100)
  const phone    = (formData.get('phone')     as string ?? '').slice(0, 30)
  const address  = (formData.get('address')   as string ?? '').slice(0, 200)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      company,
      phone,
      address,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/account')
}

export async function updatePriceFactor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const factor  = parseFloat(formData.get('price_factor') as string)
  const enabled = formData.get('price_factor_enabled') === 'on'

  if (isNaN(factor) || factor < 1 || factor > 10) throw new Error('Ongeldige factor (moet tussen 1 en 10 liggen)')

  // Alleen managers mogen de factor instellen
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  // Haal company_id op: via company_members (manager) of via profiles (solo)
  let companyId: string | null = member?.company_id ?? null
  if (!companyId) {
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    companyId = profile?.company_id ?? null
  }

  if (member && member.role !== 'manager') throw new Error('Alleen managers kunnen de prijsfactor instellen.')
  if (!companyId) throw new Error('Geen bedrijf gevonden.')

  const { error, count } = await supabase
    .from('companies')
    .update({ price_factor: factor, price_factor_enabled: enabled }, { count: 'exact' })
    .eq('id', companyId)

  if (error) throw new Error(error.message)
  if (count === 0) throw new Error('Opslaan mislukt — geen toegang tot het bedrijfsrecord.')
  revalidatePath('/account')
  revalidatePath('/dashboard')
  revalidatePath('/configurator')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) throw new Error('Wachtwoorden komen niet overeen')
  if (password.length < 8) throw new Error('Wachtwoord moet minimaal 8 tekens zijn')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}
