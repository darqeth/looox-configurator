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

  if (isNaN(factor) || factor < 1 || factor > 5) throw new Error('Ongeldige factor (moet tussen 1 en 5 liggen)')

  const { error } = await supabase
    .from('profiles')
    .update({ price_factor: factor, price_factor_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/account')
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
