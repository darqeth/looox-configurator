'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { MEUBEL_FACTOR_MAX } from '@/lib/meubel-config'

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

// Brutofactor voor Tailor-Made meubels: alleen de manager van het bedrijf.
export async function updateMeubelFactor(value: string): Promise<{ success: boolean; error?: string; factor?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  // Eén decimaal (Mark, 12 nov): 2,35 wordt 2,4
  const factor = Math.round(Number(String(value).replace(',', '.')) * 10) / 10
  if (!Number.isFinite(factor) || factor <= 0 || factor > MEUBEL_FACTOR_MAX) {
    return { success: false, error: `Vul een factor in tussen 0,1 en ${MEUBEL_FACTOR_MAX}.` }
  }

  const { data: member } = await supabase
    .from('company_members')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member?.company_id || member.role !== 'manager') {
    return { success: false, error: 'Alleen de manager kan de factor aanpassen.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('companies').update({ meubel_factor: factor }).eq('id', member.company_id)
  if (error) return { success: false, error: 'Opslaan mislukt. Probeer het opnieuw.' }

  revalidatePath('/account')
  return { success: true, factor }
}
