'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { buildSelectedOptionsJson, DEFAULT_PRODUCT_ID, assertSolLunaMaat } from '@/lib/actions/configurator-helpers'
import { computeOrderTotals, type OrderDiscount } from '@/lib/order-pricing'
import { runAfterResponse } from '@/lib/after-response'
import { parseOrThrow, placeOrderInputSchema, orderFromConfigSchema } from '@/lib/validation'
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
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstand?: number
  lunaMuurZijde?: 'links' | 'rechts'
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
  altShippingAddress?: string | null,
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
    shippingAddress: altShippingAddress ?? profileData?.shipping_address ?? null,
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
  }).catch((e) => {
    console.error('[order-pdf]', orderNumber, e)
    return undefined
  })

  // Beide mails afwachten en fouten loggen — een bestelling zonder interne
  // notificatie mag nooit onzichtbaar blijven (audit C4)
  const results = await Promise.allSettled([
    sendOrderConfirmationEmail({
      to: email,
      name: profileData?.full_name ?? 'Gebruiker',
      order: emailDetails,
      pdfBuffer,
    }),
    getNotificationEmails().then(to =>
      sendInternalOrderEmail({
        to,
        order: emailDetails,
        customer: dealerInfo,
        pdfBuffer,
      })
    ),
  ])
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[order-email:${i === 0 ? 'klant' : 'intern'}]`, orderNumber, r.reason)
    }
  })
}

// ─── Atomische order-plaatsing ────────────────────────────────────────────────
// create_order_atomic (supabase/order-transaction-migration.sql) doet config +
// order + discount-claim in één transactie (audit C5): geen orphan-configs of
// half-verwerkte kortingen meer.

type OrderTxResult = { order_id: string; order_number: string; config_id: string }

async function createOrderAtomic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    configId: string | null
    newConfig: Record<string, unknown> | null
    configPatch: Record<string, unknown> | null
    quantity: number
    unitPrice: number
    totalPrice: number
    notes: string
    discountCodeId: string | null
    discountUseType: 'single' | 'per_user'
    isOfferte?: boolean
  },
): Promise<OrderTxResult> {
  const { data, error } = await supabase.rpc('create_order_atomic', {
    p_config_id: params.configId,
    p_new_config: params.newConfig,
    p_config_patch: params.configPatch,
    p_quantity: params.quantity,
    p_unit_price: params.unitPrice,
    p_total_price: params.totalPrice,
    p_notes: params.notes,
    p_discount_code_id: params.discountCodeId,
    p_discount_use_type: params.discountUseType,
    p_is_offerte: params.isOfferte ?? false,
  })
  if (error || !data) {
    throw new Error(error?.message ?? 'Bestelling plaatsen mislukt')
  }
  return data as OrderTxResult
}

// Leest type/value/use_type altijd opnieuw uit de DB en valideert geldigheid —
// client-waarden worden nooit vertrouwd. Geeft null terug bij ongeldige code.
async function resolveDiscountCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  codeId: string,
  userId: string,
): Promise<{ discount: OrderDiscount; useType: 'single' | 'per_user' } | null> {
  const { data: codeRow } = await supabase
    .from('discount_codes')
    .select('type, value, use_type, user_id, used_at, expires_at')
    .eq('id', codeId)
    .single()
  if (!codeRow) return null

  // Hervalidatie (audit C10): verlopen, al gebruikt of aan een ander gebonden
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    throw new Error('Deze kortingscode is verlopen')
  }
  const useType = (codeRow.use_type ?? 'single') as 'single' | 'per_user'
  if (useType === 'single' && codeRow.used_at) {
    throw new Error('Deze kortingscode is al gebruikt')
  }
  if (codeRow.user_id && codeRow.user_id !== userId) {
    throw new Error('Deze kortingscode is niet geldig voor dit account')
  }

  return {
    discount: { type: codeRow.type as 'pct' | 'fixed', value: Number(codeRow.value) },
    useType,
  }
}

// Mag deze gebruiker bestellen, en (bij bestellen vanaf een config) is hij
// eigenaar of manager binnen hetzelfde bedrijf? UI verbergt de knop al, maar
// de server is de echte poortwachter (audit S7).
async function assertCanOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  configOwnerId?: string,
) {
  const { data: member } = await supabase
    .from('company_members')
    .select('role, can_order, company_id')
    .eq('user_id', userId)
    .maybeSingle()

  const isManager = !member || member.role === 'manager'
  if (!isManager && member?.can_order === false) {
    throw new Error('Je hebt geen rechten om te bestellen')
  }

  if (configOwnerId && configOwnerId !== userId) {
    if (!isManager || !member?.company_id) {
      throw new Error('Je kunt alleen je eigen configuraties bestellen')
    }
    const { data: ownerMember } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', configOwnerId)
      .maybeSingle()
    if (ownerMember?.company_id !== member.company_id) {
      throw new Error('Je kunt alleen configuraties van je eigen team bestellen')
    }
  }
}

// ─── placeOrder ───────────────────────────────────────────────────────────────

export async function placeOrder(rawInput: PlaceOrderInput): Promise<{ orderNumber: string; orderId: string }> {
  const input = parseOrThrow(placeOrderInputSchema, rawInput) as PlaceOrderInput
  assertSolLunaMaat(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  await assertCanOrder(supabase, user.id)

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
    indirectPosition: input.indirectLight.position,
    indirectType: input.indirectLight.type,
    lightControl: input.directLight.control ?? input.indirectLight.control,
    selectedOptions: input.selectedOptions,
    optionSubChoices: input.optionSubChoices,
    // Zonder deze params valt de berekening terug op defaults en wijkt de
    // opgeslagen prijs af van wat de klant zag (zelfde bugklasse als
    // optionSubChoices, gefixed 2026-05-27)
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
  })
  const basePrice = isInternational ? Math.round(calcPrice * 1.05) : calcPrice

  const resolved = input.discountCodeId
    ? await resolveDiscountCode(supabase, input.discountCodeId, user.id)
    : null

  const totals = computeOrderTotals({
    brutoUnitPrice: basePrice,
    dealerKortingPct,
    quantity: input.quantity,
    discount: resolved?.discount ?? null,
  })
  const resolvedDiscountUseType = resolved?.useType ?? 'single'

  const selectedOptionsJson = {
    ...buildSelectedOptionsJson(input),
    ...(totals.staffelPct > 0 && { staffelKortingPct: totals.staffelPct }),
    discountType: resolved?.discount?.type ?? null,
    discountValue: resolved?.discount?.value ?? null,
    discountAmount: totals.discountAmount > 0 ? totals.discountAmount : null,
  }

  const orderDate = new Date().toISOString()
  const tx = await createOrderAtomic(supabase, {
    configId: null,
    newConfig: {
      product_id: DEFAULT_PRODUCT_ID,
      name: input.projectName,
      width: input.width,
      height: input.height,
      selected_options: selectedOptionsJson,
      total_price: basePrice,
    },
    configPatch: null,
    quantity: input.quantity,
    unitPrice: basePrice,
    totalPrice: totals.total,
    notes: input.description || '',
    discountCodeId: resolved ? input.discountCodeId ?? null : null,
    discountUseType: resolvedDiscountUseType,
    isOfferte: input.shape === 'op-aanvraag',
  })
  const orderNumber = tx.order_number

  // +2 visualisatie-tegoed per geplaatste bestelling (besluit V4) — de RPC
  // valideert dat de order echt, vers en van de aanroeper is. Bewust
  // awaiten: een losse promise kan op Vercel bevriezen voor hij afrondt.
  const { error: bonusError } = await supabase.rpc('grant_order_visualisation_bonus', { p_order_id: tx.order_id })
  if (bonusError) console.error('[visualisatie-bonus]', bonusError)

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
    totalPrice: totals.total,
    dealerKortingPct,
    nettoUnitPrice: totals.nettoUnitPrice,
    staffelPct: totals.staffelPct,
    discountAmount: totals.discountAmount,
  }

  const configOptions: ConfigOptions = selectedOptionsJson as ConfigOptions

  runAfterResponse('order-emails', sendOrderEmails(
    supabase, user.id, user.email ?? '',
    orderNumber, orderDate, null,
    emailDetails,
    input.description || null,
    input.attachmentUrl ?? null,
    configOptions,
    input.width, input.height,
  ))

  return { orderNumber, orderId: tx.order_id }
}

// ─── placeOrderFromConfig ─────────────────────────────────────────────────────

export async function placeOrderFromConfig(
  rawConfigId: string,
  rawQuantity: number,
  rawNotes: string,
  rawDiscountCodeId?: string | null,
  discountType?: 'pct' | 'fixed' | null,
  discountValue?: number | null,
  discountUseType?: 'single' | 'per_user' | null,
  rawAltShippingAddress?: string | null,
): Promise<{ orderNumber: string; orderId: string }> {
  const { configId, quantity, notes, discountCodeId, altShippingAddress } = parseOrThrow(orderFromConfigSchema, {
    configId: rawConfigId,
    quantity: rawQuantity,
    notes: rawNotes,
    discountCodeId: rawDiscountCodeId,
    altShippingAddress: rawAltShippingAddress,
  })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: config, error: configError } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, selected_options, user_id')
    .eq('id', configId)
    .single()

  if (configError || !config) throw new Error('Configuratie niet gevonden')

  // Eigenaarschap + bestelrechten server-side afdwingen (audit S7)
  await assertCanOrder(supabase, user.id, config.user_id as string)

  const { data: profileForKorting } = await supabase
    .from('profiles')
    .select('korting')
    .eq('id', user.id)
    .single()
  const dealerKortingPct = profileForKorting?.korting ?? 50

  const opts = (config.selected_options ?? {}) as ConfigOptions
  const isProjectspiegel = (opts.shape as string | undefined) === 'projectspiegel'
  const isOpAanvraag = (opts.shape as string | undefined) === 'op-aanvraag'
  const configQty = (opts.quantity as number | undefined) ?? 1

  // Projectspiegels: total_price is al het totaal voor configQty stuks.
  // Sla de echte hoeveelheid + stuksprijs op, niet quantity=1 + totaal-als-stuksprijs.
  const effectiveQuantity = isProjectspiegel ? configQty : quantity
  // total_price stored at save time already includes international surcharge — do not re-apply here.
  // Note: if is_international status changed after config was saved, the stored price reflects the
  // status at save time. This is intentional (price locked at save time), not a bug.
  // Op aanvraag: nooit een prijs vanuit de configurator, ook niet bij oude
  // configs die nog een berekende prijs opgeslagen hebben.
  const totalPriceRaw = isOpAanvraag ? 0 : Number(config.total_price)
  const unitPrice = isProjectspiegel && configQty > 0
    ? Math.round((totalPriceRaw / configQty) * 100) / 100
    : totalPriceRaw

  const resolved = discountCodeId
    ? await resolveDiscountCode(supabase, discountCodeId, user.id)
    : null

  const totals = computeOrderTotals({
    brutoUnitPrice: unitPrice,
    dealerKortingPct,
    quantity: effectiveQuantity,
    isProjectspiegel,
    discount: resolved?.discount ?? null,
  })
  const staffelKortingPct = totals.staffelPct
  const discountAmount = totals.discountAmount
  const resolvedDiscountUseType = resolved?.useType ?? 'single'

  const configPatch = (discountAmount > 0 || staffelKortingPct > 0 || altShippingAddress)
    ? {
        ...(staffelKortingPct > 0 && { staffelKortingPct }),
        ...(discountAmount > 0 && resolved?.discount && {
          discountType: resolved.discount.type,
          discountValue: resolved.discount.value,
          discountAmount,
        }),
        ...(altShippingAddress && { altShippingAddress }),
      }
    : null

  const orderDate = new Date().toISOString()
  const tx = await createOrderAtomic(supabase, {
    configId: config.id,
    newConfig: null,
    configPatch,
    quantity: effectiveQuantity,
    unitPrice,
    totalPrice: totals.total,
    notes: notes || '',
    discountCodeId: resolved ? discountCodeId ?? null : null,
    discountUseType: resolvedDiscountUseType,
    isOfferte: isOpAanvraag,
  })
  const orderNumber = tx.order_number

  // +2 visualisatie-tegoed per geplaatste bestelling (besluit V4) — de RPC
  // valideert dat de order echt, vers en van de aanroeper is. Bewust
  // awaiten: een losse promise kan op Vercel bevriezen voor hij afrondt.
  const { error: bonusError } = await supabase.rpc('grant_order_visualisation_bonus', { p_order_id: tx.order_id })
  if (bonusError) console.error('[visualisatie-bonus]', bonusError)

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
    totalPrice: totals.total,
    dealerKortingPct: isProjectspiegel ? 0 : dealerKortingPct,
    nettoUnitPrice: totals.nettoUnitPrice,
    staffelPct: totals.staffelPct,
    discountAmount: totals.discountAmount,
  }

  runAfterResponse('order-emails', sendOrderEmails(
    supabase, user.id, user.email ?? '',
    orderNumber, orderDate,
    (config as { article_number?: string | null }).article_number ?? null,
    emailDetails,
    notes || null,
    (opts.attachmentUrl as string | null) ?? null,
    opts,
    config.width ?? null,
    config.height ?? null,
    altShippingAddress ?? null,
  ))

  return { orderNumber, orderId: tx.order_id }
}
