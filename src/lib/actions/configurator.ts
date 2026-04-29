'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, GlasKleur, LightType, calcTotalPrice } from '@/lib/configurator-config'
import { DEFAULT_PRODUCT_ID, buildSelectedOptionsJson } from '@/lib/actions/configurator-helpers'

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
}

export async function saveConfiguration(input: SaveConfigInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

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
    directControl: input.directLight.control,
    indirectPosition: input.indirectLight.position,
    indirectType: input.indirectLight.type,
    indirectControl: input.indirectLight.control,
    selectedOptions: input.selectedOptions,
  })
  const totalPrice = isInternational ? Math.round(calcPrice * 1.05) : calcPrice

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

  const { error } = await supabase
    .from('configurations')
    .delete()
    .eq('id', configId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

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

export async function updateConfiguration(input: UpdateConfigInput) {
  if (!(['draft', 'saved'] as const).includes(input.status)) {
    throw new Error('Ongeldige status')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

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
    directControl: input.directLight.control,
    indirectPosition: input.indirectLight.position,
    indirectType: input.indirectLight.type,
    indirectControl: input.indirectLight.control,
    selectedOptions: input.selectedOptions,
  })
  const totalPrice = isInternational ? Math.round(calcPrice * 1.05) : calcPrice

  const selectedOptionsJson = buildSelectedOptionsJson(input)

  const { error } = await supabase.from('configurations').update({
    name: input.projectName,
    width: input.width,
    height: input.height,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: input.status,
    updated_at: new Date().toISOString(),
  }).eq('id', input.configId).eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath(`/configurator/${input.configId}`)
}

export async function updateProjectspiegelConfiguration(configId: string, input: SaveProjectspiegelInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

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

  const { error } = await supabase.from('configurations').update({
    name: input.projectName,
    width: input.lengte,
    height: input.hoogte,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    updated_at: new Date().toISOString(),
  }).eq('id', configId).eq('user_id', user.id)

  if (error) throw new Error(error.message)

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
