'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { composeVisualisationWithLayers, type VisualisationInput } from '@/lib/visualisation/compose'
import { applyAiPass } from '@/lib/visualisation/ai-pass'
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
  aiEnabled: boolean
}

export async function getVisualisationStatus(): Promise<VisualisationStatus> {
  const supabase = await createClient()
  // Eén bron van waarheid voor de Amsterdamse dag: dezelfde SQL-logica als
  // claim_visualisation (een JS-benadering week af rond de klokwissel)
  const { data, error } = await supabase.rpc('get_visualisation_status')
  if (error || !data) throw new Error(error?.message ?? 'Status ophalen mislukt')
  const status = data as { daily_used: number; daily_limit: number; bonus: number }

  return {
    dailyUsed: status.daily_used,
    dailyLimit: status.daily_limit,
    bonus: status.bonus,
    scenes: SCENES.map(s => ({ id: s.id, name: s.name })),
    aiEnabled: !!process.env.OPENAI_API_KEY && process.env.VISUALISATION_AI_PASS === '1',
  }
}

// Fouten als return-waarde, niet als throw: Next.js verbergt geworpen
// action-errors in productie (digest-melding) en de gebruiker ziet dan
// een cryptische fout i.p.v. onze nette boodschap.
export type GenerateVisualisationResult =
  | { ok: true; url: string; visualisationId: string; dailyUsed: number; dailyLimit: number; bonus: number; aiApplied: boolean }
  | { ok: false; error: string }

export async function generateVisualisation(rawInput: unknown): Promise<GenerateVisualisationResult> {
  try {
    const input = parseOrThrow(generateSchema, rawInput)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Je bent niet (meer) ingelogd. Ververs de pagina en log opnieuw in.' }

    // Alleen maatwerk-toegang (besluit V6)
    const { data: profile } = await supabase
      .from('profiles').select('configurator_access').eq('id', user.id).single()
    const access = profile?.configurator_access ?? 'maatwerk'
    if (access !== 'maatwerk' && access !== 'beide') {
      return { ok: false, error: 'Visualisaties zijn beschikbaar voor maatwerk-configuraties' }
    }

    const scene = getScene(input.sceneId)
    if (!scene) return { ok: false, error: 'Onbekende stijl' }

    // Eerst componeren (kost niets) — pas daarna het tegoed claimen
    const composed = await composeVisualisationWithLayers(scene, input.config as VisualisationInput)

    // AI-fotorealisme-pas (fase 2): uitgeschakeld na evaluatie 2026-06-11 —
    // op de render-scènes voegt hij niets zichtbaars toe (V7). Aanzetten:
    // VISUALISATION_AI_PASS=1 + OPENAI_API_KEY. Herevalueren bij echte
    // fotografie-scènes, daar kan harmonisatie wél verschil maken.
    let buffer = composed.jpeg
    let aiApplied = false
    if (process.env.OPENAI_API_KEY && process.env.VISUALISATION_AI_PASS === '1') {
      try {
        buffer = await applyAiPass(composed)
        aiApplied = true
      } catch (e) {
        console.error('[visualisatie-ai-pas]', e)
      }
    }

    const { data: claim, error: claimError } = await supabase.rpc('claim_visualisation', {
      p_scene_id: input.sceneId,
      p_configuration_id: input.configurationId ?? null,
    })
    if (claimError || !claim) {
      const msg = claimError?.message ?? ''
      if (msg.includes('beschikbaar')) {
        return { ok: false, error: 'Je hebt geen visualisaties meer beschikbaar vandaag. Morgen weer 4 nieuwe, of verdien er 2 met een bestelling.' }
      }
      if (msg.includes('foreign key') || msg.includes('configuration_id')) {
        return { ok: false, error: 'Deze configuratie bestaat niet meer. Ververs de pagina.' }
      }
      console.error('[visualisatie-claim]', claimError)
      return { ok: false, error: 'Visualisatie claimen mislukt. Probeer het opnieuw.' }
    }
    const claimResult = claim as { id: string; daily_used: number; daily_limit: number; bonus: number }

    // Upload via service role (bucket is public-read, schrijven alleen server-side)
    const admin = createAdminClient()
    const imagePath = `${user.id}/${claimResult.id}.jpg`
    const { error: uploadError } = await admin.storage
      .from('visualisations')
      .upload(imagePath, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) {
      console.error('[visualisatie-upload]', uploadError)
      return { ok: false, error: 'Opslaan van het beeld mislukt. Probeer het opnieuw.' }
    }

    await supabase.from('visualisations').update({ image_path: imagePath }).eq('id', claimResult.id)

    const { data: { publicUrl } } = admin.storage.from('visualisations').getPublicUrl(imagePath)

    return {
      ok: true,
      url: publicUrl,
      visualisationId: claimResult.id,
      dailyUsed: claimResult.daily_used,
      dailyLimit: claimResult.daily_limit,
      bonus: claimResult.bonus,
      aiApplied,
    }
  } catch (e) {
    console.error('[visualisatie-genereren]', e)
    return { ok: false, error: 'Genereren mislukt. Probeer het opnieuw.' }
  }
}

// Vinkje "toon in consumentenofferte" (besluit V3). Exclusief per
// configuratie: maar één sfeerbeeld in de offerte.
export async function setVisualisationInPdf(visualisationId: string, inPdf: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Je bent niet (meer) ingelogd' }

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
  if (error) {
    console.error('[visualisatie-inpdf]', error)
    return { error: 'Opslaan van de offerte-keuze mislukt' }
  }
  return {}
}
