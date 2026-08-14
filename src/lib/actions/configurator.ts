'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { DEFAULT_PRODUCT_ID, buildSelectedOptionsJson, assertSolLunaMaat } from '@/lib/actions/configurator-helpers'
import { z } from 'zod'
import { parseOrThrow, configInputSchema } from '@/lib/validation'

const saveConfigSchema = configInputSchema.extend({
  status: z.enum(['draft', 'saved']),
})
const updateConfigSchema = saveConfigSchema.extend({
  configId: z.string().uuid(),
})

function generateArticleNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const year = new Date().getFullYear()
  const randomBytes = crypto.getRandomValues(new Uint8Array(6))
  let result = `LX-${year}-`
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}


type LightConfig = {
  position: string
  type: LightType | null
  control: string | null
}

type SaveConfigInput = {
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
  status: 'draft' | 'saved'
  attachmentUrl?: string | null
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstand?: number
  lunaMuurZijde?: 'links' | 'rechts'
}


// Server-side poort (epic EN/EN): de standen zijn niet via de API te omzeilen.
async function assertConfiguratorAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: 'maatwerk' | 'project',
) {
  const { data: profile } = await supabase
    .from('profiles').select('configurator_access').eq('id', userId).single()
  const access = profile?.configurator_access ?? 'maatwerk'
  const toegestaan = type === 'maatwerk'
    ? access === 'maatwerk' || access === 'beide'
    : access === 'project' || access === 'beide'
  if (!toegestaan) {
    throw new Error(type === 'maatwerk'
      ? 'Dit account heeft geen toegang tot de maatwerk-configurator'
      : 'Dit account heeft geen toegang tot de projectspiegel-configurator')
  }
}

export async function saveConfiguration(rawInput: SaveConfigInput) {
  const input = parseOrThrow(saveConfigSchema, rawInput) as SaveConfigInput
  assertSolLunaMaat(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  await assertConfiguratorAccess(supabase, user.id, 'maatwerk')

  const { data: profile } = await supabase.from('profiles').select('is_international').eq('id', user.id).single()
  const isInternational = profile?.is_international ?? false

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
    // opgeslagen prijs af van wat de klant zag (audit C1)
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
  })
  // Spiegel op aanvraag heeft geen prijs vanuit de configurator — die volgt
  // pas na offerte. Sla dus 0 op i.p.v. een misleidende rechthoek-prijs.
  const totalPrice = input.shape === 'op-aanvraag'
    ? 0
    : isInternational ? Math.round(calcPrice * 1.05) : calcPrice

  const selectedOptionsJson = buildSelectedOptionsJson(input)

  const { error } = await supabase.from('configurations').insert({
    user_id: user.id,
    product_id: DEFAULT_PRODUCT_ID,
    name: input.projectName,
    width: input.width,
    height: input.height,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: input.status,
    article_number: generateArticleNumber(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}

export async function deleteConfiguration(configId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Geen .eq('user_id') filter: RLS bepaalt wie mag verwijderen (eigenaar,
  // manager binnen hetzelfde bedrijf, of admin). .select() maakt van een
  // door RLS geblokkeerde/niet-bestaande rij een expliciete fout i.p.v. stil falen.
  const { data, error } = await supabase
    .from('configurations')
    .delete()
    .eq('id', configId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Configuratie niet gevonden of geen rechten om te verwijderen')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath('/looox-circle')
}

export async function adminDeleteConfiguration(configId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  if (!await isAdmin(supabase, user.id)) throw new Error('Geen toegang')

  const { error } = await supabase.from('configurations').delete().eq('id', configId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/configuraties')
  revalidatePath('/dashboard')
}

type UpdateConfigInput = SaveConfigInput & { configId: string }

export async function updateConfiguration(rawInput: UpdateConfigInput) {
  const input = parseOrThrow(updateConfigSchema, rawInput) as UpdateConfigInput
  assertSolLunaMaat(input)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  await assertConfiguratorAccess(supabase, user.id, 'maatwerk')

  const { data: profile } = await supabase.from('profiles').select('is_international').eq('id', user.id).single()
  const isInternational = profile?.is_international ?? false

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
    // opgeslagen prijs af van wat de klant zag (audit C1)
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
  })
  // Spiegel op aanvraag heeft geen prijs vanuit de configurator — die volgt
  // pas na offerte. Sla dus 0 op i.p.v. een misleidende rechthoek-prijs.
  const totalPrice = input.shape === 'op-aanvraag'
    ? 0
    : isInternational ? Math.round(calcPrice * 1.05) : calcPrice

  const selectedOptionsJson = buildSelectedOptionsJson(input)

  // Geen .eq('user_id') filter: RLS staat eigenaar én manager-binnen-bedrijf toe.
  // .select() zet een geblokkeerde/niet-bestaande rij om in een fout i.p.v. stil falen.
  const { data, error } = await supabase.from('configurations').update({
    name: input.projectName,
    width: input.width,
    height: input.height,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: input.status,
    updated_at: new Date().toISOString(),
  }).eq('id', input.configId).select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Configuratie niet gevonden of geen rechten om op te slaan')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath(`/configurator/${input.configId}`)
}

export async function updateProjectspiegelConfiguration(configId: string, input: SaveProjectspiegelInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  await assertConfiguratorAccess(supabase, user.id, 'project')

  const { calcBasisprijs, calcTotaal } = await import('@/lib/projectspiegel-config')
  const basisprijs = calcBasisprijs({
    lengte: input.lengte,
    hoogte: input.hoogte,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    verpakkingPerStuk: input.verpakkingPerStuk,
  })
  const totalPrice = calcTotaal(basisprijs, input.quantity)

  const selectedOptionsJson = {
    shape: 'projectspiegel' as const,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    voormonteren: input.voormonteren,
    verpakkingPerStuk: input.verpakkingPerStuk,
    quantity: input.quantity,
    reference: input.reference,
    description: '',
    diameter: null,
    organicSizeKey: null,
    glasKleur: 'helder',
    directLight: { position: 'geen', type: null, control: null },
    indirectLight: { position: 'geen', type: null, control: null },
    extras: [],
    optionSubChoices: {},
    attachmentUrl: null,
  }

  // Geen .eq('user_id') filter: RLS staat eigenaar én manager-binnen-bedrijf toe.
  const { data, error } = await supabase.from('configurations').update({
    name: input.projectName,
    width: input.lengte,
    height: input.hoogte,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    updated_at: new Date().toISOString(),
  }).eq('id', configId).select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Configuratie niet gevonden of geen rechten om op te slaan')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath(`/configurator/${configId}`)
}

export type SaveProjectspiegelInput = {
  lengte: number
  hoogte: number
  glasdikte: '4' | '5' | '6'
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
  reference: string
}

export async function saveProjectspiegelConfiguration(input: SaveProjectspiegelInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  await assertConfiguratorAccess(supabase, user.id, 'project')

  const { calcBasisprijs, calcTotaal } = await import('@/lib/projectspiegel-config')
  const basisprijs = calcBasisprijs({
    lengte: input.lengte,
    hoogte: input.hoogte,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    verpakkingPerStuk: input.verpakkingPerStuk,
  })
  const totalPrice = calcTotaal(basisprijs, input.quantity)

  const selectedOptionsJson = {
    shape: 'projectspiegel' as const,
    glasdikte: input.glasdikte,
    ophanging: input.ophanging,
    voormonteren: input.voormonteren,
    verpakkingPerStuk: input.verpakkingPerStuk,
    quantity: input.quantity,
    reference: input.reference,
    description: '',
    diameter: null,
    organicSizeKey: null,
    glasKleur: 'helder',
    directLight: { position: 'geen', type: null, control: null },
    indirectLight: { position: 'geen', type: null, control: null },
    extras: [],
    optionSubChoices: {},
    attachmentUrl: null,
  }

  const { error } = await supabase.from('configurations').insert({
    user_id: user.id,
    product_id: DEFAULT_PRODUCT_ID,
    name: input.projectName,
    width: input.lengte,
    height: input.hoogte,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: 'saved',
    article_number: generateArticleNumber(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}
