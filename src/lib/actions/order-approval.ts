'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendOrderStatusEmail, sendAfgekeurdEmail } from '@/lib/email'

export async function approveOrder(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, user_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Bestelling niet gevonden' }
  if (order.user_id !== user.id) return { success: false, error: 'Geen toegang' }
  if (order.status !== 'controle_vereist') return { success: false, error: 'Bestelling staat niet op controle' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ status: 'goedgekeurd' })
    .eq('id', orderId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/bestellingen')
  revalidatePath('/admin/bestellingen')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.email) {
    sendOrderStatusEmail({
      to: profile.email,
      name: profile.full_name ?? 'Gebruiker',
      orderNumber: order.order_number,
      status: 'goedgekeurd',
    }).catch(() => {})
  }

  return { success: true }
}

export async function rejectOrder(
  orderId: string,
  reden: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, user_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Bestelling niet gevonden' }
  if (order.user_id !== user.id) return { success: false, error: 'Geen toegang' }
  if (order.status !== 'controle_vereist') return { success: false, error: 'Bestelling staat niet op controle' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ status: 'afgekeurd', afkeur_reden: reden })
    .eq('id', orderId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/bestellingen')
  revalidatePath('/admin/bestellingen')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  sendAfgekeurdEmail({
    orderNumber: order.order_number,
    dealerName: profile?.full_name ?? 'Onbekend',
    dealerEmail: profile?.email ?? '',
    reden,
  }).catch(() => {})

  return { success: true }
}
