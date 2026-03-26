'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'

const DEFAULT_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'

type LightConfig = {
  position: string
  type: LightType | null
  control: string | null
}

type PlaceOrderInput = {
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur?: GlasKleur | null
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  projectName: string
  reference: string
  description: string
  quantity: number
  attachmentUrl?: string | null
  discountCodeId?: string | null
  discountType?: 'pct' | 'fixed' | null
  discountValue?: number | null
  discountUseType?: 'single' | 'per_user' | null
}

async function generateOrderNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase.rpc('next_order_number')
  if (!data) throw new Error('Ordernummer genereren mislukt')
  return data as string
}

async function applyDiscountCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  codeId: string,
  orderId: string,
  userId: string,
  useType: 'single' | 'per_user',
) {
  if (useType === 'per_user') {
    const { error } = await supabase.from('discount_code_uses').insert({
      code_id: codeId,
      user_id: userId,
      order_id: orderId,
    })
    if (error) throw new Error('Kortingscode is al gebruikt')
  } else {
    const { data: claimed } = await supabase
      .rpc('use_discount_code_atomic', { p_code_id: codeId, p_order_id: orderId })
    if (!claimed) throw new Error('Kortingscode is al gebruikt')
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ orderNumber: string; orderId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const basePrice = calcTotalPrice({
    shape: input.shape,
    width: input.width,
    height: input.height,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    glasKleur: input.glasKleur,
    directPosition: input.directLight.position,
    directType: input.directLight.type,
    directControl: input.directLight.control,
    indirectPosition: input.indirectLight.position,
    indirectType: input.indirectLight.type,
    indirectControl: input.indirectLight.control,
    selectedOptions: input.selectedOptions,
  })

  // Korting altijd op het totaalbedrag toepassen (niet per stuk)
  const subtotal = basePrice * input.quantity
  let discountAmount = 0
  if (input.discountCodeId && input.discountType && input.discountValue) {
    if (input.discountType === 'pct') {
      discountAmount = Math.round(subtotal * input.discountValue / 100)
    } else {
      discountAmount = Math.min(input.discountValue, subtotal)
    }
  }
  const finalTotalPrice = subtotal - discountAmount

  const selectedOptionsJson = {
    shape: input.shape,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    glasKleur: input.glasKleur ?? 'helder',
    directLight: input.directLight,
    indirectLight: input.indirectLight,
    extras: input.selectedOptions,
    optionSubChoices: input.optionSubChoices ?? {},
    reference: input.reference,
    description: input.description,
    quantity: input.quantity,
    attachmentUrl: input.attachmentUrl ?? null,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? null,
    discountAmount: discountAmount > 0 ? discountAmount : null,
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
      total_price: basePrice.toString(),
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
      unit_price: basePrice.toString(),
      total_price: finalTotalPrice.toString(),
      notes: input.description || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? 'Order aanmaken mislukt')

  // 3. Markeer kortingscode als gebruikt (atomisch)
  if (input.discountCodeId) {
    await applyDiscountCode(
      supabase,
      input.discountCodeId,
      order.id,
      user.id,
      input.discountUseType ?? 'single',
    )
  }

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  return { orderNumber, orderId: order.id }
}

export async function placeOrderFromConfig(
  configId: string,
  quantity: number,
  notes: string,
  discountCodeId?: string | null,
  discountType?: 'pct' | 'fixed' | null,
  discountValue?: number | null,
  discountUseType?: 'single' | 'per_user' | null,
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
  const subtotal = unitPrice * quantity
  let discountAmount = 0
  if (discountCodeId && discountType && discountValue) {
    if (discountType === 'pct') {
      discountAmount = Math.round(subtotal * discountValue / 100)
    } else {
      discountAmount = Math.min(discountValue, subtotal)
    }
  }
  const finalTotalPrice = subtotal - discountAmount

  // Sla kortingsinfo op in config selected_options zodat de PDF het kan tonen
  if (discountAmount > 0) {
    const { data: existingConfig } = await supabase
      .from('configurations')
      .select('selected_options')
      .eq('id', configId)
      .single()
    await supabase.from('configurations').update({
      selected_options: {
        ...(existingConfig?.selected_options as object ?? {}),
        discountType,
        discountValue,
        discountAmount,
      },
    }).eq('id', configId)
  }

  const orderNumber = await generateOrderNumber(supabase)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      configuration_id: config.id,
      user_id: user.id,
      order_number: orderNumber,
      quantity,
      unit_price: unitPrice.toString(),
      total_price: finalTotalPrice.toString(),
      notes: notes || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? 'Order aanmaken mislukt')

  // Markeer kortingscode als gebruikt (atomisch)
  if (discountCodeId) {
    await applyDiscountCode(
      supabase,
      discountCodeId,
      order.id,
      user.id,
      discountUseType ?? 'single',
    )
  }

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  return { orderNumber, orderId: order.id }
}
