'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseOrThrow } from '@/lib/validation'
import { DEFAULT_PRODUCT_ID, generateArticleNumber, assertValidAttachmentUrl } from '@/lib/actions/configurator-helpers'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'
import {
  MEUBEL_AANTAL_MAX, UITSPARING_MAX, calcMeubelBrutoCents, heeftExtras, getPlankExtraArtikel, kanLogo, kanLadeAccessoire, getMeubelHoogte, getMeubelDiepte, getMeubelModel, valideerMeubelConfig,
} from '@/lib/meubel-config'
import { MEUBEL_SHAPE, leesMeubel, meubelPrijsInput } from '@/lib/meubel-opslag'
import { betaaldeGaten, valideerGaten, type Gat } from '@/lib/meubel-gaten'
import { bepaalProjectDoel } from '@/lib/actions/project-helpers'

const mm = z.number().finite().min(-5000).max(5000)
const gatSchema = z.discriminatedUnion('soort', [
  z.object({ soort: z.literal('sifon'), vak: z.number().int().min(0).max(20), y: mm, d: mm }),
  z.object({ soort: z.literal('kraan'), x: mm, y: mm, d: mm }),
  z.object({ soort: z.literal('kom'), vak: z.number().int().min(0).max(20) }),
  z.object({ soort: z.literal('kraan-kom'), vak: z.number().int().min(0).max(20), dx: mm, d: mm }),
])
const gatenSchema = z.array(gatSchema).max(20)

const meubelInputSchema = z.object({
  modelId: z.string().max(40),
  lengte: z.number().int().min(0).max(10000),
  lades: z.number().int().min(0).max(10),
  ladeBreedtes: z.array(z.number().int().min(1).max(10000)).max(10).nullable(),
  houtkleur: z.string().max(40),
  opAanvraag: z.boolean().optional(),
  hoogte: z.number().int().min(0).max(3000).optional(),
  diepte: z.number().int().min(1).max(1000).optional(),
  handdoekhouders: z.number().int().min(0).max(2).optional(),
  lampen: z.number().int().min(0).max(1).optional(),
  organizer: z.string().max(20).nullish(),
  divider: z.string().max(20).nullish(),
  handdoekType: z.enum(['A', 'B']).optional(),
  extra: z.enum(['rail', 'rail-curved', 'roll', 'roll-curved']).nullish(),
  extraArtikel: z.string().max(20).nullish(),
  variant: z.string().max(40).optional(),
  logo: z.boolean().optional(),
  waskomVorm: z.enum(['ovaal', 'vierkant']).optional(),
  waskomAantal: z.number().int().min(1).max(2).optional(),
  regaalBreedte: z.number().int().min(1).max(2000).optional(),
  regaalZijde: z.enum(['links', 'rechts', 'midden']).optional(),
  uitsparingen: z.number().int().min(0).max(UITSPARING_MAX).optional(),
  tekenwijze: z.enum(['module', 'upload']).optional(),
  gaten: gatenSchema.optional(),
  waskomMaat: z.union([z.literal(500), z.literal(850)]).optional(),
  handdoekUitsparing: z.boolean().optional(),
  attachmentUrl: z.string().max(1000).nullish(),
  /** Door het hulpje ingevuld: bestellen kan pas nadat de dealer de regel heeft nagelopen en opgeslagen */
  nalopen: z.boolean().optional(),
  aiNotities: z.array(z.string().max(200)).max(8).optional(),
  /** Toevoegen aan een bestaand project (winkelmandje) */
  projectId: z.string().uuid().nullish(),
  /** Opslaan als eerste regel van een nieuw project */
  nieuwProject: z.boolean().optional(),
  quantity: z.number().int().min(1).max(MEUBEL_AANTAL_MAX),
  projectName: z.string().trim().min(1, 'Projectnaam is verplicht').max(200),
  reference: z.string().max(200),
  description: z.string().max(5000),
})

export type SaveMeubelInput = z.infer<typeof meubelInputSchema>

// De server rekent zelf: de client stuurt alleen de keuzes, nooit een prijs.
async function bouwRij(rawInput: SaveMeubelInput) {
  const ruw = parseOrThrow(meubelInputSchema, rawInput)
  // Zelf getekend: het aantal uitsparingen komt uit de tekening, niet uit wat de client meestuurt,
  // en een geüploade tekening telt dan niet. Eigen tekening: geen gaten.
  const zelfGetekend = ruw.tekenwijze === 'module'
  const input = zelfGetekend
    ? { ...ruw, uitsparingen: 0, attachmentUrl: null }
    : { ...ruw, tekenwijze: 'upload' as const, gaten: undefined }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await hasMeubelAccess(supabase, user.id)) throw new Error('Dit account heeft geen toegang tot meubels')

  const fout = valideerMeubelConfig(input)
  if (fout) throw new Error(fout)
  const model = getMeubelModel(input.modelId)!

  // Maattekening (waskom, kraan, afvoer, uitsparingen): een offerte opslaan kan zonder,
  // bestellen niet. Die controle zit in de bestelstap (project-order.ts en placeMeubelOrder).
  const uitsparingen = zelfGetekend ? betaaldeGaten(input.gaten ?? []) : input.uitsparingen ?? 0
  const attachmentUrl = assertValidAttachmentUrl(input.attachmentUrl)

  const factor = await getMeubelFactor(supabase, user.id)
  // Op aanvraag heeft geen prijs vanuit de configurator: 0 opslaan, net als bij een spiegel op aanvraag
  const opAanvraag = input.opAanvraag === true
  const brutoCents = opAanvraag ? 0 : calcMeubelBrutoCents(input, factor)!

  return {
    supabase,
    userId: user.id,
    input,
    rij: {
      name: input.projectName,
      // De kolommen zijn in cm, zoals bij spiegels; de exacte mm staan in de opties
      width: Math.round(input.lengte / 10),
      height: Math.round(getMeubelHoogte(model, input.hoogte) / 10),
      // Bruto per stuk, net als bij maatwerk spiegels; het aantal staat in de opties.
      total_price: (brutoCents / 100).toFixed(2),
      selected_options: {
        shape: MEUBEL_SHAPE,
        // De factor van dit moment hoort bij de offerte: wijzigt de manager hem
        // later, dan verandert een bestaande offerte niet stilletjes mee.
        meubel: {
          eenheid: 'mm',
          modelId: input.modelId,
          lengte: input.lengte,
          hoogte: getMeubelHoogte(model, input.hoogte),
          ...((model.kast || model.plank) && { diepte: getMeubelDiepte(model, input.diepte) }),
          ...(model.lamp && { lampen: input.lampen ?? 0 }),
          ...(kanLadeAccessoire(model) && { organizer: input.organizer ?? null, divider: input.divider ?? null }),
          ...(model.plank?.handdoekhouder && { handdoekhouders: input.handdoekhouders ?? 0, handdoekType: input.handdoekType ?? 'A' }),
          ...(heeftExtras(model, input.variant) && { extra: input.extra ?? null, extraArtikel: getPlankExtraArtikel(input.extra, input.extraArtikel)?.id ?? null }),
          ...(model.artikel && { variant: input.variant }),
          lades: input.lades,
          ladeBreedtes: input.ladeBreedtes,
          houtkleur: input.houtkleur,
          factor,
          opAanvraag,
          logo: input.logo === true && kanLogo(model),
          ...(model.regaal && { regaalBreedte: input.regaalBreedte, regaalZijde: input.regaalZijde }),
          ...(model.waskom && { waskomVorm: input.waskomVorm, waskomAantal: input.waskomAantal, ...(input.waskomVorm === 'vierkant' && { waskomMaat: input.waskomMaat ?? 500 }) }),
          uitsparingen,
          tekenwijze: zelfGetekend ? 'module' : 'upload',
          ...(zelfGetekend && { gaten: input.gaten ?? [] }),
          ...(input.handdoekUitsparing && { handdoekUitsparing: true }),
        },
        quantity: input.quantity,
        reference: input.reference,
        description: input.description,
        // Velden die de gedeelde lijsten en zoekfunctie bij elk type verwachten
        diameter: null,
        organicSizeKey: null,
        glasKleur: 'helder',
        directLight: { position: 'geen', type: null, control: null },
        indirectLight: { position: 'geen', type: null, control: null },
        extras: [],
        optionSubChoices: {},
        attachmentUrl,
        ...(input.nalopen && { nalopen: true, aiNotities: input.aiNotities ?? [] }),
      },
    },
  }
}

export async function saveMeubelConfiguration(rawInput: SaveMeubelInput): Promise<{ id: string; projectId: string | null }> {
  const { supabase, userId, rij, input } = await bouwRij(rawInput)

  // Project (winkelmandje): een regel erbij in een bestaand project, of de eerste regel van een nieuw
  const doel = await bepaalProjectDoel(supabase, { projectId: input.projectId, nieuwProject: input.nieuwProject, naam: rij.name, referentie: input.reference })
  const projectId = doel?.projectId ?? null
  const naam = doel?.naam ?? rij.name
  const opties = doel ? { ...rij.selected_options, reference: doel.referentie } : rij.selected_options

  const { data, error } = await supabase.from('configurations').insert({
    ...rij,
    name: naam,
    selected_options: opties,
    project_id: projectId,
    user_id: userId,
    product_id: DEFAULT_PRODUCT_ID,
    status: 'saved',
    article_number: generateArticleNumber(),
  }).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Opslaan mislukt')
  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  if (projectId) revalidatePath(`/projecten/${projectId}`)
  return { id: data.id as string, projectId }
}

export async function updateMeubelConfiguration(configId: string, rawInput: SaveMeubelInput): Promise<{ projectId: string | null }> {
  if (!z.string().uuid().safeParse(configId).success) throw new Error('Ongeldige configuratie')
  const { supabase, rij } = await bouwRij(rawInput)

  // Alleen een bestaand meubel bijwerken, nooit een spiegel omzetten
  const { data: bestaand } = await supabase.from('configurations').select('selected_options, status, name, project_id').eq('id', configId).maybeSingle()
  const opts = (bestaand?.selected_options ?? {}) as { shape?: string }
  if (!bestaand || opts.shape !== MEUBEL_SHAPE) throw new Error('Configuratie niet gevonden')
  if (bestaand.status === 'ordered') throw new Error('Een bestelde configuratie kan niet meer worden aangepast')

  // Geen .eq('user_id'): RLS staat eigenaar én manager binnen het bedrijf toe.
  const { data, error } = await supabase.from('configurations')
    .update({
      ...rij,
      // Een regel in een project houdt de naam en referentie van het project
      ...(bestaand.project_id && {
        name: bestaand.name,
        selected_options: { ...rij.selected_options, reference: (bestaand.selected_options as { reference?: string } | null)?.reference ?? '' },
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', configId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Configuratie niet gevonden of geen rechten om op te slaan')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath(`/configurator/${configId}`)
  const projectId = (bestaand.project_id as string | null) ?? null
  if (projectId) revalidatePath(`/projecten/${projectId}`)
  return { projectId }
}

/** Voegt alleen de maattekening toe aan een opgeslagen meubel, zonder de configuratie te openen. */
export async function setMeubelTekening(configId: string, rawUrl: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(configId).success) return { error: 'Ongeldige configuratie' }
  const attachmentUrl = assertValidAttachmentUrl(rawUrl)
  if (!attachmentUrl) return { error: 'Ongeldige maattekening' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  if (!await hasMeubelAccess(supabase, user.id)) return { error: 'Dit account heeft geen toegang tot Tailor-Made. Neem contact op met LoooX.' }

  const { data: bestaand } = await supabase.from('configurations').select('selected_options, status, project_id').eq('id', configId).maybeSingle()
  const opts = (bestaand?.selected_options ?? {}) as Record<string, unknown>
  if (!bestaand || opts.shape !== MEUBEL_SHAPE) return { error: 'Configuratie niet gevonden' }
  if (bestaand.status === 'ordered') return { error: 'Een bestelde configuratie kan niet meer worden aangepast' }

  // Geen .eq('user_id'): RLS staat eigenaar én manager binnen het bedrijf toe.
  const { data, error } = await supabase.from('configurations')
    .update({ selected_options: { ...opts, attachmentUrl, meubel: naarEigenTekening(opts) }, updated_at: new Date().toISOString() })
    .eq('id', configId)
    .select('id')
  if (error) { console.error('[meubel-tekening]', error); return { error: 'Opslaan van de maattekening is mislukt. Probeer het opnieuw.' } }
  if (!data || data.length === 0) return { error: 'Configuratie niet gevonden of geen rechten om op te slaan' }

  revalidatePath('/configuraties')
  revalidatePath(`/configurator/${configId}`)
  if (bestaand.project_id) revalidatePath(`/projecten/${bestaand.project_id}`)
  return {}
}

/** Stapt over op een eigen tekening: de gaten vervallen, het aantal blijft staan als teller zodat de prijs gelijk blijft. */
function naarEigenTekening(opts: Record<string, unknown>): Record<string, unknown> {
  const meubel = { ...((opts.meubel ?? {}) as Record<string, unknown>) }
  const gelezen = leesMeubel(opts)
  if (gelezen?.tekenwijze === 'module') meubel.uitsparingen = Math.min(UITSPARING_MAX, betaaldeGaten(gelezen.gaten))
  delete meubel.gaten
  meubel.tekenwijze = 'upload'
  return meubel
}

/** Slaat de tekening uit de tekenmodule op bij een bestaand meubel, zonder de configuratie te openen. */
export async function setMeubelGaten(configId: string, rawGaten: Gat[]): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(configId).success) return { error: 'Ongeldige configuratie' }
  const parsed = gatenSchema.safeParse(rawGaten)
  if (!parsed.success) return { error: 'Ongeldige tekening' }
  const gaten = parsed.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }
  if (!await hasMeubelAccess(supabase, user.id)) return { error: 'Dit account heeft geen toegang tot Tailor-Made. Neem contact op met LoooX.' }

  const { data: bestaand } = await supabase.from('configurations').select('selected_options, status, project_id').eq('id', configId).maybeSingle()
  const opts = (bestaand?.selected_options ?? {}) as Record<string, unknown>
  const meubel = bestaand ? leesMeubel(opts) : null
  if (!bestaand || !meubel) return { error: 'Configuratie niet gevonden' }
  if (bestaand.status === 'ordered') return { error: 'Een bestelde configuratie kan niet meer worden aangepast' }
  if (!meubel.gatenContext) return { error: 'Bij dit product kan geen tekening gemaakt worden.' }
  const fout = valideerGaten(gaten, meubel.gatenContext)
  if (fout) return { error: fout }

  // De prijs volgt de tekening; de factor van de offerte blijft zoals hij was opgeslagen
  const brutoCents = meubel.opAanvraag ? 0 : calcMeubelBrutoCents({
    ...meubelPrijsInput(meubel), uitsparingen: 0, tekenwijze: 'module', gaten, handdoekUitsparing: meubel.handdoekUitsparing,
  }, meubel.factor)
  if (brutoCents === null) return { error: 'De prijs kon niet berekend worden. Open de configuratie en sla hem opnieuw op.' }

  const { data, error } = await supabase.from('configurations')
    .update({
      total_price: (brutoCents / 100).toFixed(2),
      selected_options: { ...opts, attachmentUrl: null, meubel: { ...((opts.meubel ?? {}) as Record<string, unknown>), tekenwijze: 'module', gaten, uitsparingen: betaaldeGaten(gaten) } },
      updated_at: new Date().toISOString(),
    })
    .eq('id', configId)
    .select('id')
  if (error) { console.error('[meubel-gaten]', error); return { error: 'Opslaan van de tekening is mislukt. Probeer het opnieuw.' } }
  if (!data || data.length === 0) return { error: 'Configuratie niet gevonden of geen rechten om op te slaan' }

  revalidatePath('/configuraties')
  revalidatePath(`/configurator/${configId}`)
  if (bestaand.project_id) revalidatePath(`/projecten/${bestaand.project_id}`)
  return {}
}
