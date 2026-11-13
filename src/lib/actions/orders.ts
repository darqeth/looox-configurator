'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { clampMmsQuantity, getMmsUnitPrice, isMmsAllowed, resolveMmsUnitPrice } from '@/lib/mms'
import { buildSelectedOptionsJson, DEFAULT_PRODUCT_ID, assertSolLunaMaat, assertKraangat, resolveStoredDims } from '@/lib/actions/configurator-helpers'
import { computeOrderTotals, type OrderDiscount } from '@/lib/order-pricing'
import { runAfterResponse } from '@/lib/after-response'
import { parseOrThrow, placeOrderInputSchema, orderFromConfigSchema } from '@/lib/validation'
import { sendOrderConfirmationEmail, sendInternalOrderEmail, sendProjectOrderConfirmationEmail, sendInternalProjectOrderEmail, type OrderEmailDetails, type ProjectOrderEmail } from '@/lib/email'
import { projectKop, moetNalopen } from '@/lib/project'
import { berekenProjectOrderRegel, type ProjectOrderRegel } from '@/lib/project-order'
import { getNotificationEmails } from '@/lib/actions/settings'
import type { ConfigOptions } from '@/lib/pdf/helpers'
import { z } from 'zod'
import { hasMeubelAccess } from '@/lib/meubel-access'
import { leesMeubel, meubelPrijsInput, meubelExtraPrijs } from '@/lib/meubel-opslag'
import { MEUBEL_AANTAL_MAX, calcMeubelNettoCents, formatPct, getMeubelOrderOpbouw, indelingLabel, indelingTekst, kleurLabel, meubelAfmeting, meubelOptiesTekst, waskomTekst } from '@/lib/meubel-config'

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
  mmsQuantity?: number
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

  // PDF-renderer (react-pdf + sharp) pas laden als er echt een order-PDF gemaakt
  // wordt: dit bestand hangt via de bestelknop aan dashboard en lijsten, en zou
  // anders bij elke koude start van die pagina's meegeladen worden.
  const { renderOrderPDF } = await import('@/lib/pdf/render-order')
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
  // can_order is leidend, óók voor een manager (superadmin kan de eerste/enige
  // persoon van een bedrijf zo het bestellen ontzeggen). Geen member-rij = solo
  // gebruiker zonder bedrijf → mag bestellen.
  if (member?.can_order === false) {
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
  assertKraangat(input)
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
    mmsQuantity: isMmsAllowed(input.shape) ? clampMmsQuantity(input.mmsQuantity) : 0,
    mmsUnitPrice: getMmsUnitPrice(isInternational),
  })
  const resolvedDiscountUseType = resolved?.useType ?? 'single'

  const selectedOptionsJson = {
    ...buildSelectedOptionsJson(input, { isInternational }),
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
      ...resolveStoredDims(input),
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
    mmsQuantity: totals.mmsQuantity,
    mmsNetto: totals.mmsNetto,
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
  /** Aantal Mirror Maintenance Sets uit de bestelmodal; leeg = het aantal van de offerte */
  rawMmsQuantity?: number | null,
): Promise<{ orderNumber: string; orderId: string }> {
  const { configId, quantity, notes, discountCodeId, altShippingAddress, mmsQuantity: requestedMms } = parseOrThrow(orderFromConfigSchema, {
    configId: rawConfigId,
    quantity: rawQuantity,
    notes: rawNotes,
    discountCodeId: rawDiscountCodeId,
    altShippingAddress: rawAltShippingAddress,
    mmsQuantity: rawMmsQuantity,
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
  // Meubels (configurator 2.0) hebben een eigen bestelstroom met nettoprijzen; die
  // komt in fase 3. Via de spiegelstroom zou de dealerkorting er ten onrechte overheen gaan.
  if ((opts.shape as string | undefined) === 'meubel') throw new Error('Meubels zijn nog niet te bestellen')
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

  // Mirror Maintenance Set: het aantal uit de bestelmodal is leidend, anders dat
  // van de offerte. Nooit bij projectspiegels en spiegel op aanvraag.
  const savedMms = clampMmsQuantity(opts.mmsQuantity)
  const mmsQuantity = isProjectspiegel || !isMmsAllowed(opts.shape as string | undefined)
    ? 0
    : clampMmsQuantity(requestedMms ?? savedMms)
  // Stuksprijs van de set is bij het opslaan vastgelegd (incl. buitenlandtoeslag)
  const mmsUnitPrice = resolveMmsUnitPrice(opts.mmsUnitPrice)

  const totals = computeOrderTotals({
    brutoUnitPrice: unitPrice,
    dealerKortingPct,
    quantity: effectiveQuantity,
    isProjectspiegel,
    discount: resolved?.discount ?? null,
    mmsQuantity,
    mmsUnitPrice,
  })
  const staffelKortingPct = totals.staffelPct
  const discountAmount = totals.discountAmount
  const resolvedDiscountUseType = resolved?.useType ?? 'single'
  // Het bestelde aantal sets vastleggen bij de configuratie: PDF en e-mail lezen het daar
  const mmsGewijzigd = mmsQuantity !== savedMms || (mmsQuantity > 0 && opts.mmsUnitPrice == null)

  const configPatch = (discountAmount > 0 || staffelKortingPct > 0 || altShippingAddress || mmsGewijzigd)
    ? {
        ...(mmsGewijzigd && { mmsQuantity, mmsUnitPrice }),
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
    mmsQuantity: totals.mmsQuantity,
    mmsNetto: totals.mmsNetto,
  }

  // De PDF in de mail moet dezelfde opties zien als de opgeslagen bestelling:
  // inclusief staffel, kortingscode en het bestelde aantal sets uit de patch.
  const orderOpts = { ...opts, ...(configPatch ?? {}) } as ConfigOptions

  runAfterResponse('order-emails', sendOrderEmails(
    supabase, user.id, user.email ?? '',
    orderNumber, orderDate,
    (config as { article_number?: string | null }).article_number ?? null,
    emailDetails,
    notes || null,
    (opts.attachmentUrl as string | null) ?? null,
    orderOpts,
    config.width ?? null,
    config.height ?? null,
    altShippingAddress ?? null,
  ))

  return { orderNumber, orderId: tx.order_id }
}

// ─── Tailor-Made meubel bestellen (configurator 2.0) ────────────────────────
// Eigen stroom naast de spiegels: de order gaat tegen de nettoprijs uit de
// prijslijst, zonder dealerkorting, staffel of kortingscode. De server rekent
// de prijs opnieuw uit de opgeslagen keuzes; de client stuurt alleen het aantal.
// Een meubel op aanvraag wordt een offerteaanvraag zonder prijs (OFF-nummer).

const meubelOrderSchema = z.object({
  configId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MEUBEL_AANTAL_MAX),
  notes: z.string().max(5000),
  altShippingAddress: z.string().max(500).nullish(),
})

export async function placeMeubelOrder(
  rawConfigId: string,
  rawQuantity: number,
  rawNotes: string,
  rawAltShippingAddress?: string | null,
): Promise<{ orderNumber: string; orderId: string; isOfferte: boolean }> {
  const { configId, quantity, notes, altShippingAddress } = parseOrThrow(meubelOrderSchema, {
    configId: rawConfigId,
    quantity: rawQuantity,
    notes: rawNotes,
    altShippingAddress: rawAltShippingAddress?.trim() || null,
  })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await hasMeubelAccess(supabase, user.id)) throw new Error('Dit account heeft geen toegang tot meubels')

  const { data: config, error: configError } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, status, selected_options, user_id')
    .eq('id', configId)
    .single()
  if (configError || !config) throw new Error('Configuratie niet gevonden')
  if (config.status === 'ordered') throw new Error('Deze configuratie is al besteld')

  await assertCanOrder(supabase, user.id, config.user_id as string)

  const meubel = leesMeubel(config.selected_options)
  if (!meubel) throw new Error('Dit is geen meubelconfiguratie')
  if (meubel.tekeningOntbreekt) throw new Error(meubel.tekenwijze === 'module' ? 'De waskom staat nog niet in de tekening. Plaats hem en probeer het opnieuw.' : 'De maattekening ontbreekt. Voeg hem toe en probeer het opnieuw.')
  if (moetNalopen(config.selected_options)) throw new Error('Deze configuratie is door het hulpje ingevuld. Open hem, controleer de keuzes en sla hem op.')

  const isOfferte = meubel.opAanvraag
  const nettoCents = isOfferte ? 0 : calcMeubelNettoCents(meubelPrijsInput(meubel))
  if (nettoCents === null) throw new Error('Dit meubel is met de huidige prijslijst niet meer te bestellen. Open de configuratie en sla hem opnieuw op.')
  const unitPrice = nettoCents / 100
  const totalPrice = (nettoCents * quantity) / 100

  const opts = (config.selected_options ?? {}) as ConfigOptions
  // Het bestelde aantal en een afwijkend afleveradres horen bij de order: PDF en lijsten lezen ze uit de configuratie
  const configPatch = { quantity, ...(altShippingAddress && { altShippingAddress }) }

  const orderDate = new Date().toISOString()
  const tx = await createOrderAtomic(supabase, {
    configId: config.id,
    newConfig: null,
    configPatch,
    quantity,
    unitPrice,
    totalPrice,
    notes: notes || '',
    discountCodeId: null,
    discountUseType: 'single',
    isOfferte,
  })

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')

  const emailDetails: OrderEmailDetails = {
    orderNumber: tx.order_number,
    projectName: config.name ?? 'Meubel',
    shape: 'meubel',
    width: config.width ?? null,
    height: config.height ?? null,
    diameter: null,
    organicSizeKey: null,
    quantity,
    unitPrice,
    totalPrice,
    meubel: {
      opAanvraag: isOfferte,
      ...(!isOfferte && {
        brutoUnitPrice: getMeubelOrderOpbouw(nettoCents, meubel.factor, meubelExtraPrijs(meubel)).brutoCents / 100,
        kortingLabel: formatPct(getMeubelOrderOpbouw(nettoCents, meubel.factor, meubelExtraPrijs(meubel)).kortingPct),
      }),
      regels: [
        ['Model', meubel.model.naam],
        ['Afmeting', meubelAfmeting(meubel.model, meubel.lengte)],
        [indelingLabel(meubel.model), indelingTekst(meubel.model, meubel.lades, meubel.ladeBreedtes, meubel.ladeRuimte, meubel)],
        ...(meubel.waskomVorm ? [['Waskom', waskomTekst(meubel)] as [string, string]] : []),
        ...(meubel.regaalBreedte > 0 ? [['Regaalkast', `${meubel.regaalBreedte} mm breed, ${meubel.regaalZijde}`] as [string, string]] : []),
        [kleurLabel(meubel.model), meubel.houtkleurNaam || 'Geen'],
        ['Opties', meubelOptiesTekst(meubel)],
      ],
    },
  }

  runAfterResponse('order-emails', sendOrderEmails(
    supabase, user.id, user.email ?? '',
    tx.order_number, orderDate,
    (config as { article_number?: string | null }).article_number ?? null,
    emailDetails,
    notes || null,
    meubel.attachmentUrl,
    { ...opts, ...configPatch } as ConfigOptions,
    config.width ?? null,
    config.height ?? null,
    altShippingAddress ?? null,
  ))

  return { orderNumber: tx.order_number, orderId: tx.order_id, isOfferte }
}

// ─── Project bestellen (winkelmandje) ────────────────────────────────────────
// Alle regels van een project in één keer, onder één ordernummer. Per regel
// gelden dezelfde rekenregels als bij een losse bestelling: spiegels met
// dealerkorting en staffel, projectspiegels netto, meubels tegen de tabelprijs.
// Geen kortingscode op projectniveau. De server rekent alles zelf uit.

const projectOrderSchema = z.object({
  projectId: z.string().uuid(),
  notes: z.string().max(5000),
  altShippingAddress: z.string().max(500).nullish(),
})

export async function placeProjectOrder(
  rawProjectId: string,
  rawNotes: string,
  rawAltShippingAddress?: string | null,
): Promise<{ orderNumber: string; isOfferte: boolean }> {
  const { projectId, notes, altShippingAddress } = parseOrThrow(projectOrderSchema, {
    projectId: rawProjectId,
    notes: rawNotes,
    altShippingAddress: rawAltShippingAddress?.trim() || null,
  })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // RLS bepaalt welke regels de aanroeper mag zien
  const { data: configs, error: configError } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, status, selected_options, user_id, created_at')
    .eq('project_id', projectId)
    .order('created_at')
  if (configError || !configs || configs.length === 0) throw new Error('Project niet gevonden')
  if (configs.some((c) => c.status === 'ordered')) throw new Error('Dit project is al besteld')
  if (configs.some((c) => c.status !== 'saved')) throw new Error('Dit project bevat een regel die nog niet is opgeslagen')

  for (const eigenaar of new Set(configs.map((c) => c.user_id as string))) {
    await assertCanOrder(supabase, user.id, eigenaar)
  }

  const { data: profiel } = await supabase.from('profiles').select('korting').eq('id', user.id).single()
  const dealerKortingPct = profiel?.korting ?? 50
  const heeftMeubel = configs.some((c) => leesMeubel(c.selected_options))
  if (heeftMeubel && !await hasMeubelAccess(supabase, user.id)) throw new Error('Dit account heeft geen toegang tot Tailor-Made')

  const regels = configs.map((config) => berekenProjectOrderRegel(config, dealerKortingPct))
  const fout = regels.find((r) => r.fout)?.fout
  if (fout) throw new Error(fout)
  // Per regel vastleggen wat bij de order hoort: afleveradres en toegepaste staffel
  const patch = (r: ProjectOrderRegel) => ({
    ...(altShippingAddress && { altShippingAddress }),
    ...(r.staffelPct > 0 && { staffelKortingPct: r.staffelPct }),
  })

  const isOfferte = regels.every((r) => r.regel.opAanvraag)
  const { data: tx, error: txError } = await supabase.rpc('create_project_order_atomic', {
    p_project_id: projectId,
    p_lines: regels.map((r) => ({
      config_id: r.configId,
      quantity: r.quantity,
      unit_price: r.unitPrice,
      total_price: r.totalPrice,
      config_patch: patch(r),
    })),
    p_notes: notes || '',
    p_is_offerte: isOfferte,
  })
  if (txError || !tx) throw new Error(txError?.message ?? 'Bestelling plaatsen mislukt')
  const groep = (tx as { order_group: string }).order_group
  const orderNummers = new Map(((tx as { orders: { config_id: string; order_number: string }[] }).orders ?? []).map((o) => [o.config_id, o.order_number]))

  revalidatePath('/bestellingen')
  revalidatePath('/dashboard')
  revalidatePath('/configuraties')
  revalidatePath(`/projecten/${projectId}`)

  const kop = projectKop(configs)
  const orderDate = new Date().toISOString()
  runAfterResponse('project-order-emails', (async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, company, phone, address, shipping_address, korting')
      .eq('id', user.id)
      .single()
    const p = profile as Profile | null
    const email = p?.email ?? user.email ?? ''
    const dealer = {
      name: p?.full_name ?? null,
      company: p?.company ?? null,
      email,
      phone: p?.phone ?? null,
      address: p?.address ?? null,
      shippingAddress: altShippingAddress ?? p?.shipping_address ?? null,
    }
    const totaal = regels.reduce((som, r) => som + Math.round(r.totalPrice * 100), 0) / 100

    // PDF-renderer pas laden als hij nodig is (zie sendOrderEmails)
    const pdfBuffer = await import('@/lib/pdf/render-project-order').then(({ renderProjectOrderPdf }) => renderProjectOrderPdf({
      groep,
      datum: orderDate,
      projectNaam: kop.naam,
      referentie: kop.referentie,
      notes: notes || null,
      dealer,
      regels: configs.map((config, i) => ({
        config: { ...config, selected_options: { ...(config.selected_options as Record<string, unknown>), ...patch(regels[i]) } },
        orderNumber: orderNummers.get(config.id) ?? groep,
        quantity: regels[i].quantity,
        unitPrice: regels[i].unitPrice,
        totalPrice: regels[i].totalPrice,
        korting: regels[i].korting,
        status: 'pending',
      })),
    })).catch((e) => {
      console.error('[project-order-pdf]', groep, e)
      return undefined
    })

    const order: ProjectOrderEmail = {
      orderNumber: groep,
      projectName: kop.naam,
      reference: kop.referentie,
      isOfferte,
      regels: regels.map((r) => ({ titel: r.regel.titel, omschrijving: r.regel.omschrijving, quantity: r.quantity, totaal: r.totalPrice, opAanvraag: r.regel.opAanvraag })),
      totaal,
    }
    // Beide mails afwachten en fouten loggen: een bestelling zonder interne notificatie mag niet onzichtbaar blijven
    const results = await Promise.allSettled([
      sendProjectOrderConfirmationEmail({ to: email, name: p?.full_name ?? 'Gebruiker', order, pdfBuffer }),
      getNotificationEmails().then((to) => sendInternalProjectOrderEmail({ to, order, customer: dealer, pdfBuffer })),
    ])
    results.forEach((res, i) => {
      if (res.status === 'rejected') console.error(`[project-order-email:${i === 0 ? 'klant' : 'intern'}]`, groep, res.reason)
    })
  })())

  return { orderNumber: groep, isOfferte }
}
