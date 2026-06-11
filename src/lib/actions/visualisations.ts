'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { composeVisualisation, type VisualisationInput } from '@/lib/visualisation/compose'
import { getScene, SCENES } from '@/lib/visualisation/scenes'
import { z } from 'zod'
import { parseOrThrow } from '@/lib/validation'

// Badkamer-visualisatie (epic, sprint 2). Credits: 4/dag + bonustegoed,
// afgedwongen in claim_visualisation (SECURITY DEFINER, besluit V4).

const SUPPORTED_SHAPES = ['rechthoek', 'rounded-rect', 'rond'] as const

const generateSchema = z.object({
  configurationId: z.string().uuid().nullish(),
  sceneId: z.string().max(40),
  config: z.object({
    shape: z.enum(SUPPORTED_SHAPES),
    width: z.number().min(20).max(300),
    height: z.number().min(20).max(300),
    glasKleur: z.enum(['helder', 'smoke-zwart', 'smoke-brons']),
    directPositions: z.array(z.string().max(30)).max(6),
    indirect: z.boolean(),
    lichtKelvin: z.union([z.literal(3000), z.literal(4000)]),
    frameColor: z.enum(['aluminium', 'zwart', 'gun-metal', 'brushed-brass', 'brushed-copper']).nullish(),
  }),
})

export type VisualisationStatus = {
  dailyUsed: number
  dailyLimit: number
  bonus: number
  scenes: { id: string; name: string }[]
}

export async function getVisualisationStatus(): Promise<VisualisationStatus> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) throw new Error('Niet ingelogd')

  const [{ count }, { data: profile }] = await Promise.all([
    supabase
      .from('visualisations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', amsterdamDayStartIso()),
    supabase.from('profiles').select('visualisation_bonus_credits').eq('id', userId).single(),
  ])

  return {
    dailyUsed: count ?? 0,
    dailyLimit: 4,
    bonus: profile?.visualisation_bonus_credits ?? 0,
    scenes: SCENES.map(s => ({ id: s.id, name: s.name })),
  }
}

function amsterdamDayStartIso(): string {
  const nu = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }))
  const offsetMs = Date.now() - nu.getTime()
  const dagStart = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())
  return new Date(dagStart.getTime() + offsetMs).toISOString()
}

export async function generateVisualisation(rawInput: unknown): Promise<{
  url: string
  visualisationId: string
  dailyUsed: number
  dailyLimit: number
  bonus: number
}> {
  const input = parseOrThrow(generateSchema, rawInput)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Alleen maatwerk-toegang (besluit V6)
  const { data: profile } = await supabase
    .from('profiles').select('configurator_access').eq('id', user.id).single()
  const access = profile?.configurator_access ?? 'maatwerk'
  if (access !== 'maatwerk' && access !== 'beide') {
    throw new Error('Visualisaties zijn beschikbaar voor maatwerk-configuraties')
  }

  const scene = getScene(input.sceneId)
  if (!scene) throw new Error('Onbekende stijl')

  // Eerst componeren (kost niets) — pas daarna het tegoed claimen
  const buffer = await composeVisualisation(scene, input.config as VisualisationInput)

  const { data: claim, error: claimError } = await supabase.rpc('claim_visualisation', {
    p_scene_id: input.sceneId,
    p_configuration_id: input.configurationId ?? null,
  })
  if (claimError || !claim) {
    throw new Error(claimError?.message?.includes('beschikbaar')
      ? 'Je hebt geen visualisaties meer beschikbaar vandaag. Morgen weer 4 nieuwe, of verdien er 2 met een bestelling.'
      : claimError?.message ?? 'Visualisatie claimen mislukt')
  }
  const claimResult = claim as { id: string; daily_used: number; daily_limit: number; bonus: number }

  // Upload via service role (bucket is public-read, schrijven alleen server-side)
  const admin = createAdminClient()
  const imagePath = `${user.id}/${claimResult.id}.jpg`
  const { error: uploadError } = await admin.storage
    .from('visualisations')
    .upload(imagePath, buffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error('Opslaan van het beeld mislukt: ' + uploadError.message)

  await supabase.from('visualisations').update({ image_path: imagePath }).eq('id', claimResult.id)

  const { data: { publicUrl } } = admin.storage.from('visualisations').getPublicUrl(imagePath)

  return {
    url: publicUrl,
    visualisationId: claimResult.id,
    dailyUsed: claimResult.daily_used,
    dailyLimit: claimResult.daily_limit,
    bonus: claimResult.bonus,
  }
}

// Vinkje "toon in consumentenofferte" (besluit V3). Exclusief per
// configuratie: maar één sfeerbeeld in de offerte.
export async function setVisualisationInPdf(visualisationId: string, inPdf: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  if (inPdf) {
    const { data: viz } = await supabase
      .from('visualisations')
      .select('configuration_id')
      .eq('id', visualisationId)
      .eq('user_id', user.id)
      .single()
    // Andere beelden van dezelfde configuratie eerst uit de offerte halen
    if (viz?.configuration_id) {
      await supabase
        .from('visualisations')
        .update({ in_pdf: false })
        .eq('user_id', user.id)
        .eq('configuration_id', viz.configuration_id)
        .neq('id', visualisationId)
    }
  }

  const { error } = await supabase
    .from('visualisations')
    .update({ in_pdf: inPdf })
    .eq('id', visualisationId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
}
