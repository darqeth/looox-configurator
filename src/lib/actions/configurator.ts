'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShapeSlug, LightType, calcTotalPrice } from '@/lib/configurator-config'

// Fixed product UUID for the default LoooX spiegel product
// Run the seed SQL in Supabase to create this product
const DEFAULT_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'

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
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  projectName: string
  reference: string
  description: string
  quantity: number
  status: 'draft' | 'saved'
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
    reference: input.reference,
    description: input.description,
    quantity: input.quantity,
  }

  const { error } = await supabase.from('configurations').insert({
    user_id: user.id,
    product_id: DEFAULT_PRODUCT_ID,
    name: input.projectName,
    width: input.width,
    height: input.height,
    selected_options: selectedOptionsJson,
    total_price: totalPrice.toString(),
    status: input.status,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}
