'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseOrThrow } from '@/lib/validation'
import { DEFAULT_PRODUCT_ID, generateArticleNumber } from '@/lib/actions/configurator-helpers'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'
import {
  MEUBEL_AANTAL_MAX, calcMeubelBrutoCents, getMeubelModel, valideerMeubelConfig,
} from '@/lib/meubel-config'
import { MEUBEL_SHAPE } from '@/lib/meubel-opslag'

const meubelInputSchema = z.object({
  modelId: z.string().max(40),
  lengte: z.number().int().min(1).max(1000),
  lades: z.number().int().min(1).max(10),
  ladeBreedtes: z.array(z.number().int().min(1).max(1000)).max(10).nullable(),
  houtkleur: z.string().max(40),
  opAanvraag: z.boolean().optional(),
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

  const factor = await getMeubelFactor(supabase, user.id)
  // Op aanvraag heeft geen prijs vanuit de configurator: 0 opslaan, net als bij een spiegel op aanvraag
  const opAanvraag = input.opAanvraag === true
  const brutoCents = opAanvraag ? 0 : calcMeubelBrutoCents(input, factor)!

  return {
    supabase,
    userId: user.id,
    rij: {
      name: input.projectName,
      width: input.lengte,
      height: model.hoogte,
      // Bruto per stuk, net als bij maatwerk spiegels; het aantal staat in de opties.
      total_price: (brutoCents / 100).toFixed(2),
      selected_options: {
        shape: MEUBEL_SHAPE,
        // De factor van dit moment hoort bij de offerte: wijzigt de manager hem
        // later, dan verandert een bestaande offerte niet stilletjes mee.
        meubel: {
          modelId: input.modelId,
          lengte: input.lengte,
          lades: input.lades,
          ladeBreedtes: input.ladeBreedtes,
          houtkleur: input.houtkleur,
          factor,
          opAanvraag,
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
        attachmentUrl: null,
      },
    },
  }
}

export async function saveMeubelConfiguration(rawInput: SaveMeubelInput) {
  const { supabase, userId, rij } = await bouwRij(rawInput)
  const { error } = await supabase.from('configurations').insert({
    ...rij,
    user_id: userId,
    product_id: DEFAULT_PRODUCT_ID,
    status: 'saved',
    article_number: generateArticleNumber(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}

export async function updateMeubelConfiguration(configId: string, rawInput: SaveMeubelInput) {
  if (!z.string().uuid().safeParse(configId).success) throw new Error('Ongeldige configuratie')
  const { supabase, rij } = await bouwRij(rawInput)

  // Alleen een bestaand meubel bijwerken, nooit een spiegel omzetten
  const { data: bestaand } = await supabase.from('configurations').select('selected_options, status').eq('id', configId).maybeSingle()
  const opts = (bestaand?.selected_options ?? {}) as { shape?: string }
  if (!bestaand || opts.shape !== MEUBEL_SHAPE) throw new Error('Configuratie niet gevonden')
  if (bestaand.status === 'ordered') throw new Error('Een bestelde configuratie kan niet meer worden aangepast')

  // Geen .eq('user_id'): RLS staat eigenaar én manager binnen het bedrijf toe.
  const { data, error } = await supabase.from('configurations')
    .update({ ...rij, updated_at: new Date().toISOString() })
    .eq('id', configId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Configuratie niet gevonden of geen rechten om op te slaan')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  revalidatePath(`/configurator/${configId}`)
}
