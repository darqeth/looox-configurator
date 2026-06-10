import { z } from 'zod'

// Runtime-validatie aan de server-randen (audit C6). De UI valideert al,
// maar server actions zijn publieke endpoints — een aangepaste request kon
// negatieve aantallen of onzinnige afmetingen insturen.

export const shapeSchema = z.enum([
  'rechthoek', 'rond', 'organic', 'op-aanvraag', 'rounded-rect',
  'ovaal', 'arc', 'projectspiegel', 'sol', 'luna',
])

export const glasKleurSchema = z.enum(['helder', 'smoke-zwart', 'smoke-brons'])

const lightConfigSchema = z.object({
  position: z.string().max(40),
  type: z.string().max(40).nullable(),
  control: z.string().max(40).nullable(),
})

export const quantitySchema = z.number().int().min(1).max(9999)

// Afmetingen ruim gevalideerd (RECHTHOEK_CONSTRAINTS = 40-300; rond/organic
// kleiner mogelijk) — dit vangt negatief/0/absurd, de UI doet de fijne grenzen
const dimensionSchema = z.number().min(0).max(1000)

export const configInputSchema = z.object({
  shape: shapeSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  diameter: z.number().min(0).max(1000).nullable(),
  organicSizeKey: z.string().max(20).nullable(),
  glasKleur: glasKleurSchema.nullish(),
  directLight: lightConfigSchema,
  indirectLight: lightConfigSchema,
  selectedOptions: z.array(z.string().max(60)).max(50),
  optionSubChoices: z.record(z.string().max(60), z.string().max(60)).optional(),
  projectName: z.string().min(1, 'Projectnaam is verplicht').max(200),
  reference: z.string().max(200),
  description: z.string().max(5000),
  quantity: quantitySchema,
  attachmentUrl: z.string().max(1000).nullish(),
  solMeubelHoogte: z.number().min(0).max(200).optional(),
  solOnderkant: z.number().min(0).max(200).optional(),
  lunaMeubelHoogte: z.number().min(0).max(200).optional(),
  lunaOnderkant: z.number().min(0).max(200).optional(),
  lunaAfstand: z.number().min(0).max(200).optional(),
  lunaMuurZijde: z.enum(['links', 'rechts']).optional(),
})

export const placeOrderInputSchema = configInputSchema.extend({
  discountCodeId: z.string().uuid().nullish(),
  discountType: z.enum(['pct', 'fixed']).nullish(),
  discountValue: z.number().nullish(),
  discountUseType: z.enum(['single', 'per_user']).nullish(),
})

export const orderFromConfigSchema = z.object({
  configId: z.string().uuid(),
  quantity: quantitySchema,
  notes: z.string().max(5000),
  discountCodeId: z.string().uuid().nullish(),
  altShippingAddress: z.string().max(500).nullish(),
})

// Geeft een nette Nederlandse foutmelding i.p.v. een zod-stacktrace
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new Error(`Ongeldige invoer: ${first.path.join('.')} — ${first.message}`)
  }
  return result.data
}
