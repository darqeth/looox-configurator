'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { buildSelectedOptionsJson, DEFAULT_PRODUCT_ID } from '@/lib/actions/configurator-helpers'
import { getMaatwerkStaffelKorting } from '@/lib/maatwerk-staffel'
import { sendOrderConfirmationEmail, sendInternalOrderEmail, type OrderEmailDetails } from '@/lib/email'
import { getNotificationEmails } from '@/lib/actions/settings'
import { renderOrderPDF } from '@/lib/pdf/render-order'
import type { ConfigOptions } from '@/lib/pdf/helpers'

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POSITION_LABELS: Record<string, string> = {
  geen: 'Geen', boven: 'Boven', onder: 'Onder', links: 'Links', rechts: 'Rechts',
  'boven-onder': 'Boven & onder', 'links-rechts': 'Links & rechts',
}

const LIGHT_LABELS: Record<string, string> = {
  'tl-buis': 'TL-buis', 'led-strip': 'LED-strip', 'led-spots': 'LED-spots',
}

function lightLabel(light: LightConfig | { position?: string; type?: string | null } | undefined): string | null {
  if (!light) return null
  const pos = light.position ?? ''
  if (!pos || pos === 'geen') return null
  const posLabel = POSITION_LABELS[pos] ?? pos
  const typeLabel = light.type ? (LIGHT_LABELS[light.type] ?? light.type) : null
  return typeLabel ? `${posLabel} — ${typeLabel}` : posLabel
}

type Profile = {
  full_name: string | null
  email: string | null
  company: string | null
  phone: string | null
  address: string | null
  shipping_address?: string | null
  korting?: number
}

async function sendOrderEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail: string,
  orderNumber: string,
  orderDate: string,
  articleNumber: string | null | undefined,
  emailDetails: OrderEmailDetails,
  notes: string | null,
  attachmentUrl: string | null,
  configOptions: ConfigOptions,
  width: number | null,
  height: number | null,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, company, phone, address, shipping_address, korting')
    .eq('id', userId)
    .single()

  const profileData = profile as Profile | null
  const email = profileData?.email ?? userEmail
  const dealerInfo = {
    name: profileData?.full_name ?? null,
    company: profileData?.company ?? null,
    email,
    phone: profileData?.phone ?? null,
    address: profileData?.address ?? null,
    shippingAddress: profileData?.shipping_address ?? null,
  }

  const pdfBuffer = await renderOrderPDF({
    orderNumber,
    orderDate,
    articleNumber,
    status: 'pending' as const,
    dealer: dealerInfo,
    config: {
      name: emailDetails.projectName ?? null,
      width,
      height,
      options: configOptions,
    },
    unitPrice: emailDetails.unitPrice,
    korting: profileData?.korting ?? 50,
    quantity: emailDetails.quantity,
    notes,
    attachmentUrl,
  }).catch(() => undefined)

  sendOrderConfirmationEmail({
    to: email,
    name: profileData?.full_name ?? 'Gebruiker',
    order: emailDetails,
    pdfBuffer,
  }).catch(() => {})

  getNotificationEmails().then(to =>
    sendInternalOrderEmail({
      to,
      order: emailDetails,
      customer: dealerInfo,
      pdfBuffer,
    })
  ).catch(() => {})
}

// ─── Order number ─────────────────────────────────────────────────────────────

async function generateOrderNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase.rpc('next_order_number')
  if (data) return data as string
  return generateFallbackOrderNumber()
}

function generateFallbackOrderNumber(): string {
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

// ─── placeOrder ───────────────────────────────────────────────────────────────

export async function placeOrder(input: PlaceOrderInput): Promise<{ orderNumber: string; orderId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Controleer buitenlandtoeslag
  const { data: profile } = await supabase.from('profiles').select('is_international, korting').eq('id', user.id).single()
  const isInternational = profile?.is_international ?? false
  const dealerKortingPct = profile?.korting ?? 50

  const calcPrice = calcTotalPrice({
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
  const basePrice = isInternational ? Math.round(calcPrice * 1.05) : calcPrice

  const staffelKortingPct = getMaatwerkStaffelKorting(input.quantity)
  const nettoNaDealer = Math.round(basePrice * (1 - dealerKortingPct / 100))
  const staffelKortingAmount = Math.round(nettoNaDealer * staffelKortingPct) * input.quantity

  const subtotal = basePrice * input.quantity
  let discountAmount = 0
  let resolvedDiscountType: 'pct' | 'fixed' | null = null
  let resolvedDiscountValue: number | null = null
  let resolvedDiscountUseType: 'single' | 'per_user' = 'single'
  if (input.discountCodeId) {
    // Re-read authoritative type/value/use_type from DB — never trust client-supplied values
    const { data: codeRow } = await supabase
      .from('discount_codes')
      .select('type, value, use_type')
      .eq('id', input.discountCodeId)
      .single()
    if (codeRow) {
      resolvedDiscountType = codeRow.type as 'pct' | 'fixed'
      resolvedDiscountValue = Number(codeRow.value)
      resolvedDiscountUseType = (codeRow.use_type ?? 'single') as 'single' | 'per_user'
      discountAmount = resolvedDiscountType === 'pct'
        ? Math.round(subtotal * resolvedDiscountValue / 100)
        : Math.min(resolvedDiscountValue, subtotal)
    }
  }
  const finalTotalPrice = subtotal - staffelKortingAmount - discountAmount

  const selectedOptionsJson = {
    ...buildSelectedOptionsJson(input),
    ...(staffelKortingPct > 0 && { staffelKortingPct }),
    discountType: resolvedDiscountType,
    discountValue: resolvedDiscountValue,
    discountAmount: discountAmount > 0 ? discountAmount : null,
  }

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

  const orderNumber = await generateOrderNumber(supabase)
  const orderDate = new Date().toISOString()

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

  if (input.discountCodeId) {
    await applyDiscountCode(supabase, input.discountCodeId, order.id, user.id, resolvedDiscountUseType)
  }

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  const emailDetails: OrderEmailDetails = {
    orderNumber,
    projectName: input.projectName,
    shape: input.shape,
    width: input.width,
    height: input.height,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    glasKleur: input.glasKleur,
    directLight: lightLabel(input.directLight),
    indirectLight: lightLabel(input.indirectLight),
    quantity: input.quantity,
    unitPrice: basePrice,
    totalPrice: finalTotalPrice,
  }

  const configOptions: ConfigOptions = selectedOptionsJson as ConfigOptions

  sendOrderEmails(
    supabase, user.id, user.email ?? '',
    orderNumber, orderDate, null,
    emailDetails,
    input.description || null,
    input.attachmentUrl ?? null,
    configOptions,
    input.width, input.height,
  ).catch(() => {})

  return { orderNumber, orderId: order.id }
}

// ─── placeOrderFromConfig ─────────────────────────────────────────────────────

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

  const { data: config, error: configError } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, selected_options, user_id')
    .eq('id', configId)
    .single()

  if (configError || !config) throw new Error('Configuratie niet gevonden')

  const { data: profileForKorting } = await supabase
    .from('profiles')
    .select('korting')
    .eq('id', user.id)
    .single()
  const dealerKortingPct = profileForKorting?.korting ?? 50

  const opts = (config.selected_options ?? {}) as ConfigOptions
  const isProjectspiegel = (opts.shape as string | undefined) === 'projectspiegel'
  const configQty = (opts.quantity as number | undefined) ?? 1

  // Projectspiegels: total_price is al het totaal voor configQty stuks.
  // Sla de echte hoeveelheid + stuksprijs op, niet quantity=1 + totaal-als-stuksprijs.
  const effectiveQuantity = isProjectspiegel ? configQty : quantity
  // total_price stored at save time already includes international surcharge — do not re-apply here.
  // Note: if is_international status changed after config was saved, the stored price reflects the
  // status at save time. This is intentional (price locked at save time), not a bug.
  const totalPriceRaw = Number(config.total_price)
  const unitPrice = isProjectspiegel && configQty > 0
    ? Math.round((totalPriceRaw / configQty) * 100) / 100
    : totalPriceRaw
  const subtotal = unitPrice * effectiveQuantity
  const staffelKortingPct = isProjectspiegel ? 0 : getMaatwerkStaffelKorting(effectiveQuantity)
  const nettoNaDealer = isProjectspiegel ? 0 : Math.round(unitPrice * (1 - dealerKortingPct / 100))
  const staffelKortingAmount = isProjectspiegel ? 0 : Math.round(nettoNaDealer * staffelKortingPct) * effectiveQuantity
  let discountAmount = 0
  let resolvedDiscountType: 'pct' | 'fixed' | null = null
  let resolvedDiscountValue: number | null = null
  let resolvedDiscountUseType: 'single' | 'per_user' = 'single'
  if (discountCodeId) {
    // Re-read authoritative type/value/use_type from DB — never trust client-supplied values
    const { data: codeRow } = await supabase
      .from('discount_codes')
      .select('type, value, use_type')
      .eq('id', discountCodeId)
      .single()
    if (codeRow) {
      resolvedDiscountType = codeRow.type as 'pct' | 'fixed'
      resolvedDiscountValue = Number(codeRow.value)
      resolvedDiscountUseType = (codeRow.use_type ?? 'single') as 'single' | 'per_user'
      discountAmount = resolvedDiscountType === 'pct'
        ? Math.round(subtotal * resolvedDiscountValue / 100)
        : Math.min(resolvedDiscountValue, subtotal)
    }
  }
  const finalTotalPrice = subtotal - staffelKortingAmount - discountAmount

  let order: { id: string } | null = null
  let orderNumber = ''
  const orderDate = new Date().toISOString()
  for (let attempt = 0; attempt < 10; attempt++) {
    orderNumber = attempt < 5
      ? await generateOrderNumber(supabase)
      : generateFallbackOrderNumber()
    const { data, error: insertError } = await supabase
      .from('orders')
      .insert({
        configuration_id: config.id,
        user_id: user.id,
        order_number: orderNumber,
        quantity: effectiveQuantity,
        unit_price: unitPrice.toString(),
        total_price: finalTotalPrice.toString(),
        notes: notes || null,
        status: 'pending',
      })
      .select('id')
      .single()
    if (!insertError) { order = data; break }
    if (insertError.code !== '23505') throw new Error(insertError.message ?? 'Order aanmaken mislukt')
  }
  if (!order) throw new Error('Order aanmaken mislukt. Probeer het opnieuw.')

  await supabase
    .from('configurations')
    .update({
      status: 'ordered',
      ...((discountAmount > 0 || staffelKortingPct > 0) && {
        selected_options: {
          ...(config.selected_options as object ?? {}),
          ...(staffelKortingPct > 0 && { staffelKortingPct }),
          ...(discountAmount > 0 && {
            discountType: resolvedDiscountType,
            discountValue: resolvedDiscountValue,
            discountAmount,
          }),
        },
      }),
    })
    .eq('id', configId)

  if (discountCodeId) {
    await applyDiscountCode(supabase, discountCodeId, order.id, user.id, resolvedDiscountUseType)
  }

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  const emailDetails: OrderEmailDetails = {
    orderNumber,
    projectName: config.name ?? (opts.description as string | undefined) ?? 'Configuratie',
    shape: opts.shape ?? 'rechthoek',
    width: config.width ?? null,
    height: config.height ?? null,
    diameter: opts.diameter ?? null,
    organicSizeKey: opts.organicSizeKey ?? null,
    glasKleur: opts.glasKleur ?? null,
    directLight: lightLabel(opts.directLight),
    indirectLight: lightLabel(opts.indirectLight),
    quantity: effectiveQuantity,
    unitPrice,
    totalPrice: finalTotalPrice,
  }

  sendOrderEmails(
    supabase, user.id, user.email ?? '',
    orderNumber, orderDate,
    (config as { article_number?: string | null }).article_number ?? null,
    emailDetails,
    notes || null,
    (opts.attachmentUrl as string | null) ?? null,
    opts,
    config.width ?? null,
    config.height ?? null,
  ).catch(() => {})

  return { orderNumber, orderId: order.id }
}
