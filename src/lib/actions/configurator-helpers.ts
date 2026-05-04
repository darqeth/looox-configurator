import { ShapeSlug, GlasKleur, LightType } from '@/lib/configurator-config'

// Fixed product UUID for the default LoooX spiegel product
// Run the seed SQL in Supabase to create this product
export const DEFAULT_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'

type LightConfig = {
  position: string
  type: LightType | null
  control: string | null
}

export type OptionsJsonBase = {
  shape: ShapeSlug
  diameter: number | null
  organicSizeKey: string | null
  glasKleur?: GlasKleur | null
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  reference: string
  description: string
  quantity: number
  attachmentUrl?: string | null
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstandLinks?: number
  lunaAfstandRechts?: number
}

export function buildSelectedOptionsJson(input: OptionsJsonBase) {
  return {
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
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
    lunaOnderkant: input.lunaOnderkant,
    lunaAfstandLinks: input.lunaAfstandLinks,
    lunaAfstandRechts: input.lunaAfstandRechts,
  }
}
