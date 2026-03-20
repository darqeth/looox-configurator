'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      company: formData.get('company') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/account')
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
