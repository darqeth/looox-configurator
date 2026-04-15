'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { buildSelectedOptionsJson, DEFAULT_PRODUCT_ID } from '@/lib/actions/configurator-helpers'

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
  if (data) return data as string
  return generateFallbackOrderNumber()
}

function generateFallbackOrderNumber(): string {
  // Timestamp (ms) + 3-digit random → effectief uniek, zelfde formaat als RPC
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `LX-${ts}-${rand}`
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
    ...buildSelectedOptionsJson(input),
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

  // Haal bestaande configuratie op — RLS bepaalt toegang, user_id filter weggelaten
  // zodat managers ook configs van teamleden kunnen bestellen
  const { data: config, error: configError } = await supabase
    .from('configurations')
    .select('id, total_price, selected_options, user_id')
    .eq('id', configId)
    .single()

  if (configError || !config) throw new Error('Configuratie niet gevonden')

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

  // Maak eerst de order aan — als dit mislukt blijft de config op 'saved'
  // Genereer ordernummer met retry bij duplicate key (23505)
  let order: { id: string } | null = null
  let orderNumber = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    orderNumber = attempt < 5
      ? await generateOrderNumber(supabase)          // RPC-gebaseerd
      : generateFallbackOrderNumber()                // timestamp-gebaseerd als RPC blijft falen
    const { data, error: insertError } = await supabase
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
    if (!insertError) { order = data; break }
    if (insertError.code !== '23505') throw new Error(insertError.message ?? 'Order aanmaken mislukt')
    // 23505 = duplicate order_number, nieuw nummer proberen
  }
  if (!order) throw new Error('Order aanmaken mislukt. Probeer het opnieuw.')

  // Order is aangemaakt — zet config status op 'ordered'
  await supabase
    .from('configurations')
    .update({
      status: 'ordered',
      ...(discountAmount > 0 && {
        selected_options: {
          ...(config.selected_options as object ?? {}),
          discountType,
          discountValue,
          discountAmount,
        },
      }),
    })
    .eq('id', configId)

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
