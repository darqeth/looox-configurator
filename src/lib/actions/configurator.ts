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

  const totalPrice = calcTotalPrice({
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

  const totalPrice = calcTotalPrice({
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
