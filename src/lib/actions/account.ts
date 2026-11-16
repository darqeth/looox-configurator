'use server'

import { ensureCompanyMembership } from '@/lib/ensure-company'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const fullName = (formData.get('full_name') as string ?? '').slice(0, 100)
  const company  = (formData.get('company')   as string ?? '').slice(0, 100)
  const phone    = (formData.get('phone')     as string ?? '').slice(0, 30)
  const address  = (formData.get('address')   as string ?? '').slice(0, 300)
  const shippingAddress = (formData.get('shipping_address') as string ?? '').slice(0, 300)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      company,
      phone,
      address,
      shipping_address: shippingAddress || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Bedrijfsnaam ingevuld maar nog geen lidmaatschap: koppel aan het bestaande bedrijf
  // met die naam, of maak het aan. Zelfde logica als bij inloggen en goedkeuren, zodat
  // hier geen dubbele bedrijven meer ontstaan.
  if (company) await ensureCompanyMembership(user.id)

  revalidatePath('/account')
  revalidatePath('/account/collegas')
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
