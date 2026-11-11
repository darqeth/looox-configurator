import { clampMmsQuantity, getMmsUnitPrice, isMmsAllowed } from '@/lib/mms'
import { ShapeSlug, GlasKleur, LightType, computeSolMainPiece, computeLunaMainPiece, solLunaExceedsMax, KRAANGAT_OPTIE_ID, KRAANGAT_DIAMETER_KEY, KRAANGAT_DIAMETER_MM, KRAANGAT_MAX_GATEN, isValidKraangatDiameter, getOrganicDims } from '@/lib/configurator-config'

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
  mmsQuantity?: number
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

// Vangnet: de UI blokkeert "Volgende" al bij een te grote Sol/Luna, maar de
// server is de echte poortwachter. Beide zijden van het bovendeel > 150 cm =
// niet te produceren (zie configurator-config).
export function assertSolLunaMaat(input: {
  shape: ShapeSlug
  diameter: number | null
  width?: number | null
  height?: number | null
  solMeubelHoogte?: number
  solOnderkant?: number
  lunaMeubelHoogte?: number
  lunaOnderkant?: number
  lunaAfstand?: number
}) {
  // Elips: kortste zijde ≥ 40, langste ≤ 200 (verhouding 1:2 wordt in de UI
  // afgedwongen; hier alleen de grenzen als vangnet).
  if (input.shape === 'elips') {
    const w = input.width ?? 0
    const h = input.height ?? 0
    const lo = Math.min(w, h)
    const hi = Math.max(w, h)
    if (!(lo >= 40 && hi <= 200 && lo > 0)) {
      throw new Error('Ellips-maat ongeldig: kortste zijde min. 40 cm, langste zijde max. 200 cm.')
    }
    return
  }
  if (input.diameter == null) return
  if (input.shape === 'sol') {
    if (solLunaExceedsMax(computeSolMainPiece(input.diameter, input.solMeubelHoogte ?? 0, input.solOnderkant ?? 0)))
      throw new Error('Deze Sol-spiegel is te groot om te produceren: breedte en hoogte zijn beide groter dan 150 cm.')
  } else if (input.shape === 'luna') {
    if (solLunaExceedsMax(computeLunaMainPiece(input.diameter, input.lunaMeubelHoogte ?? 0, input.lunaOnderkant ?? 0, input.lunaAfstand ?? 0)))
      throw new Error('Deze Luna-spiegel is te groot om te produceren: breedte en hoogte zijn beide groter dan 150 cm.')
  }
}

// Kolommen width/height: bij organic de echte maat uit de maat-key opslaan.
// De wizard stuurt daar de (irrelevante) rechthoek-invoer mee, waardoor organic
// voorheen altijd als 80 × 60 in de database stond.
export function resolveStoredDims(input: { shape: ShapeSlug; width: number; height: number; organicSizeKey: string | null }) {
  return input.shape === 'organic'
    ? getOrganicDims(input.organicSizeKey)
    : { width: input.width, height: input.height }
}

// Vangnet voor de kraangat-optie: de UI dwingt aantal, gatdiameter en tekening
// al af, maar de server is de echte poortwachter (prijs hangt af van het aantal).
export function assertKraangat(input: {
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  attachmentUrl?: string | null
  status?: 'draft' | 'saved'
}) {
  if (!input.selectedOptions.includes(KRAANGAT_OPTIE_ID)) return
  const aantal = input.optionSubChoices?.[KRAANGAT_OPTIE_ID]
  if (!aantal || !/^\d$/.test(aantal) || Number(aantal) < 1 || Number(aantal) > KRAANGAT_MAX_GATEN) {
    throw new Error(`Kies het aantal kraangaten (1 t/m ${KRAANGAT_MAX_GATEN}).`)
  }
  if (!isValidKraangatDiameter(input.optionSubChoices?.[KRAANGAT_DIAMETER_KEY])) {
    throw new Error(`Vul de gatdiameter van het kraangat in (${KRAANGAT_DIAMETER_MM.min} t/m ${KRAANGAT_DIAMETER_MM.max} mm).`)
  }
  if (input.status !== 'draft' && !input.attachmentUrl) {
    throw new Error('Upload een tekening met de positie van het kraangat.')
  }
}

export function buildSelectedOptionsJson(input: OptionsJsonBase, ctx: { isInternational: boolean }) {
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
    // Mirror Maintenance Set: aparte regel, niet in total_price (zie lib/mms.ts)
    mmsQuantity: isMmsAllowed(input.shape) ? clampMmsQuantity(input.mmsQuantity) : 0,
    // Stuksprijs vastleggen op het moment van opslaan (incl. eventuele buitenlandtoeslag),
    // net als total_price. Ook bij 0 sets: de dealer kan er in de bestelmodal nog bij kiezen.
    ...(isMmsAllowed(input.shape) && { mmsUnitPrice: getMmsUnitPrice(ctx.isInternational) }),
    attachmentUrl: assertValidAttachmentUrl(input.attachmentUrl),
    solMeubelHoogte: input.solMeubelHoogte,
    solOnderkant: input.solOnderkant,
    lunaMeubelHoogte: input.lunaMeubelHoogte,
    lunaOnderkant: input.lunaOnderkant,
    lunaAfstand: input.lunaAfstand,
    lunaMuurZijde: input.lunaMuurZijde,
  }
}
