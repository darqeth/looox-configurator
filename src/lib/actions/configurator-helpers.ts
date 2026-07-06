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
  lunaAfstand?: number
  lunaMuurZijde?: 'links' | 'rechts'
}

// attachmentUrl wordt later server-side gefetcht bij PDF-render. Alleen onze
// eigen publieke storage-bucket toestaan voorkomt SSRF naar interne endpoints
// (audit S3).
export function assertValidAttachmentUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/`
  if (!url.startsWith(prefix)) {
    throw new Error('Ongeldige bijlage-URL')
  }
  return url
}

export function buildSelectedOptionsJson(input: OptionsJsonBase) {
  return {
    shape: input.shape,
    diameter: input.diameter,
    organicSizeKey: input.organicSizeKey,
    glasKleur: input.glasKleur ?? 'helder',
    directLight: input.directLight,
    indirectLight: input.indirectLight,
    // Gedeeld lichttype/bediening (gespiegeld op beide lichten) — gebruikt door PDF's en overzichten.
    lightType: input.directLight.type ?? input.indirectLight.type ?? null,
    lightControl: input.directLight.control ?? input.indirectLight.control ?? null,
    extras: input.selectedOptions,
    optionSubChoices: input.optionSubChoices ?? {},
    reference: input.reference,
    description: input.description,
    quantity: input.quantity,
    attachmentUrl: assertValidAttachmentUrl(input.attachmentUrl),
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
    lunaOnderkant: input.lunaOnderkant,
    lunaAfstand: input.lunaAfstand,
    lunaMuurZijde: input.lunaMuurZijde,
  }
}
