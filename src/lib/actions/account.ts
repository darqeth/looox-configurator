'use server'

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

  // Als user een bedrijfsnaam heeft ingevuld maar nog geen company_members-rij heeft,
  // maak automatisch een bedrijf aan en voeg user toe als manager
  if (company) {
    const { data: existingMember } = await supabase
      .from('company_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingMember) {
      const admin = createAdminClient()
      const { data: newCompany } = await admin
        .from('companies')
        .insert({ name: company })
        .select('id')
        .single()

      if (newCompany) {
        await Promise.all([
          admin.from('profiles').update({ company_id: newCompany.id }).eq('id', user.id),
          admin.from('company_members').insert({
            company_id: newCompany.id,
            user_id: user.id,
            role: 'manager',
            can_order: true,
            can_see_purchase_prices: true,
            can_configure: true,
            own_configs_only: false,
          }),
        ])
      }
    }
  }

  revalidatePath('/account')
  revalidatePath('/account/collegas')
}

export async function updatePriceFactor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const factor  = parseFloat(formData.get('price_factor') as string)
  const enabled = formData.get('price_factor_enabled') === 'on'

  if (isNaN(factor) || factor < 1 || factor > 10) throw new Error('Ongeldige factor (moet tussen 1 en 10 liggen)')

  // Controleer of lid niet een gewoon member is (geen manager-rechten)
  const { data: member } = await supabase
    .from('company_members')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (member && member.role !== 'manager') throw new Error('Alleen managers kunnen de prijsfactor instellen.')

  // Sla altijd op in profiles — werkt voor solo-gebruikers én managers
  const { error } = await supabase
    .from('profiles')
    .update({ price_factor: factor, price_factor_enabled: enabled })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
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
