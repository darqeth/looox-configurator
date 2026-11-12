'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseOrThrow } from '@/lib/validation'
import { DEFAULT_PRODUCT_ID, generateArticleNumber, assertValidAttachmentUrl } from '@/lib/actions/configurator-helpers'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'
import {
  MEUBEL_AANTAL_MAX, UITSPARING_MAX, calcMeubelBrutoCents, getMeubelHoogte, getMeubelModel, valideerMeubelConfig,
} from '@/lib/meubel-config'
import { MEUBEL_SHAPE } from '@/lib/meubel-opslag'
import { bepaalProjectDoel } from '@/lib/actions/project-helpers'

const meubelInputSchema = z.object({
  modelId: z.string().max(40),
  lengte: z.number().int().min(1).max(10000),
  lades: z.number().int().min(1).max(10),
  ladeBreedtes: z.array(z.number().int().min(1).max(10000)).max(10).nullable(),
  houtkleur: z.string().max(40),
  opAanvraag: z.boolean().optional(),
  hoogte: z.number().int().min(1).max(3000).optional(),
  logo: z.boolean().optional(),
  regaalBreedte: z.number().int().min(1).max(2000).optional(),
  regaalZijde: z.enum(['links', 'rechts', 'midden']).optional(),
  uitsparingen: z.number().int().min(0).max(UITSPARING_MAX).optional(),
  attachmentUrl: z.string().max(1000).nullish(),
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
  const input = parseOrThrow(meubelInputSchema, rawInput)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  if (!await hasMeubelAccess(supabase, user.id)) throw new Error('Dit account heeft geen toegang tot meubels')

  const fout = valideerMeubelConfig(input)
  if (fout) throw new Error(fout)
  const model = getMeubelModel(input.modelId)!

  // Bij elk meubel hoort een maattekening (waskom, kraan, afvoer, uitsparingen): zonder tekening niet opslaan
  const uitsparingen = input.uitsparingen ?? 0
  const attachmentUrl = assertValidAttachmentUrl(input.attachmentUrl)
  if (!attachmentUrl) throw new Error('Voeg een maattekening toe.')

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
          lades: input.lades,
          ladeBreedtes: input.ladeBreedtes,
          houtkleur: input.houtkleur,
          factor,
          opAanvraag,
          logo: input.logo === true,
          ...(model.regaal && { regaalBreedte: input.regaalBreedte, regaalZijde: input.regaalZijde }),
          uitsparingen,
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
