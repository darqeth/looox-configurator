'use server'

import { ensureCompanyMembership } from '@/lib/ensure-company'
import { vergelijkBedrijf } from '@/lib/bedrijfsnaam'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData): Promise<{ bedrijfBestaatAl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const fullName = (formData.get('full_name') as string ?? '').slice(0, 100)
  const gevraagdBedrijf = (formData.get('company') as string ?? '').trim().slice(0, 100)
  const phone    = (formData.get('phone')     as string ?? '').slice(0, 30)
  const address  = (formData.get('address')   as string ?? '').slice(0, 300)
  const shippingAddress = (formData.get('shipping_address') as string ?? '').slice(0, 300)

  // De bedrijfsnaam staat vast zodra hij er is: via de naam wordt een account aan een
  // bedrijf gekoppeld, en dat mag alleen na goedkeuring door LoooX. Alleen een account
  // zonder bedrijf mag er een invullen, en dan geen naam van een bestaand bedrijf.
  const { data: huidig } = await supabase.from('profiles').select('company, company_id').eq('id', user.id).single()
  const staatVast = !!huidig?.company?.trim() || !!huidig?.company_id
  let company = huidig?.company ?? ''
  let bedrijfBestaatAl: string | undefined
  if (!staatVast && gevraagdBedrijf) {
    const { data: alle } = await createAdminClient().from('companies').select('name').limit(2000)
    const match = vergelijkBedrijf(gevraagdBedrijf, (alle ?? []).map((c) => c.name as string))
    if (match.soort === 'zelfde' || match.soort === 'gelijk') bedrijfBestaatAl = match.naam
    else company = gevraagdBedrijf
  }

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
  if (company && !staatVast) await ensureCompanyMembership(user.id)

  revalidatePath('/account')
  revalidatePath('/account/collegas')
  return { bedrijfBestaatAl }
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
