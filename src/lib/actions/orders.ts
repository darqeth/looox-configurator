'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, LightType, calcTotalPrice } from '@/lib/configurator-config'

const DEFAULT_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'

type LightConfig = {
  position: string
  type: LightType | null
  control: string | null
}

type PlaceOrderInput = {
  // Config data (nieuw, nog niet opgeslagen)
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  projectName: string
  reference: string
  description: string
  quantity: number
}

async function generateOrderNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `ORD-${year}-${seq}`
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ orderNumber: string; orderId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const totalPrice = calcTotalPrice({
    shape: input.shape,
    width: input.width,
    height: input.height,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    directPosition: input.directLight.position,
    directType: input.directLight.type,
    indirectPosition: input.indirectLight.position,
    indirectType: input.indirectLight.type,
    selectedOptions: input.selectedOptions,
  })

  const selectedOptionsJson = {
    shape: input.shape,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    directLight: input.directLight,
    indirectLight: input.indirectLight,
    extras: input.selectedOptions,
    optionSubChoices: input.optionSubChoices ?? {},
    reference: input.reference,
    description: input.description,
    quantity: input.quantity,
  }

  // 1. Sla configuratie op met status 'ordered'
  const { data: config, error: configError } = await supabase
    .from('configurations')
    .insert({
      user_id: user.id,
      product_id: DEFAULT_PRODUCT_ID,
      name: input.projectName,
      width: input.width,
      height: input.height,
      selected_options: selectedOptionsJson,
      total_price: totalPrice.toString(),
      status: 'ordered',
    })
    .select('id')
    .single()

  if (configError || !config) throw new Error(configError?.message ?? 'Config opslaan mislukt')

  // 2. Genereer ordernummer en maak order aan
  const orderNumber = await generateOrderNumber(supabase)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      configuration_id: config.id,
      user_id: user.id,
      order_number: orderNumber,
      quantity: input.quantity,
      unit_price: totalPrice.toString(),
      total_price: (totalPrice * input.quantity).toString(),
      notes: input.description || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? 'Order aanmaken mislukt')

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  return { orderNumber, orderId: order.id }
}

export async function placeOrderFromConfig(
  configId: string,
  quantity: number,
  notes: string,
): Promise<{ orderNumber: string; orderId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Haal bestaande configuratie op (RLS zorgt dat alleen eigen configs opgehaald worden)
  const { data: config, error: configError } = await supabase
    .from('configurations')
    .select('id, total_price')
    .eq('id', configId)
    .eq('user_id', user.id)
    .single()

  if (configError || !config) throw new Error('Configuratie niet gevonden')

  // Zet status op 'ordered'
  await supabase
    .from('configurations')
    .update({ status: 'ordered' })
    .eq('id', configId)

  const unitPrice = Number(config.total_price)
  const orderNumber = await generateOrderNumber(supabase)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      configuration_id: config.id,
      user_id: user.id,
      order_number: orderNumber,
      quantity,
      unit_price: unitPrice.toString(),
      total_price: (unitPrice * quantity).toString(),
      notes: notes || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? 'Order aanmaken mislukt')

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  return { orderNumber, orderId: order.id }
}
