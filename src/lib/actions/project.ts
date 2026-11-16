'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateArticleNumber } from '@/lib/actions/configurator-helpers'

// Projecten (winkelmandje): zie src/lib/project.ts. Alle toegang loopt via de
// bestaande RLS op configurations; hier staan geen eigen rechtenregels.

/**
 * Maakt van een losse configuratie de eerste regel van een project, of geeft
 * het bestaande project terug. Daarna kan er een product aan worden toegevoegd.
 */
export async function startProjectVanConfig(configId: string): Promise<{ projectId: string }> {
  if (!z.string().uuid().safeParse(configId).success) throw new Error('Ongeldige configuratie')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: config } = await supabase.from('configurations').select('id, project_id, status').eq('id', configId).maybeSingle()
  if (!config) throw new Error('Configuratie niet gevonden')
  if (config.project_id) return { projectId: config.project_id as string }
  if (config.status === 'ordered') throw new Error('Een bestelde configuratie kan geen project meer worden')

  const projectId = crypto.randomUUID()
  // .select() maakt van een door RLS geblokkeerde update een expliciete fout
  const { data, error } = await supabase.from('configurations').update({ project_id: projectId }).eq('id', configId).is('project_id', null).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Geen rechten om dit project te starten')

  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  return { projectId }
}

/** Kopie van een regel in hetzelfde project, om daarna aan te passen (tweede spiegel, andere maat). */
export async function kopieerRegel(configId: string): Promise<void> {
  if (!z.string().uuid().safeParse(configId).success) throw new Error('Ongeldige configuratie')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: bron } = await supabase.from('configurations').select('*').eq('id', configId).maybeSingle()
  if (!bron || !bron.project_id) throw new Error('Regel niet gevonden')
  const { data: regels } = await supabase.from('configurations').select('status').eq('project_id', bron.project_id)
  if ((regels ?? []).some((r) => r.status === 'ordered')) throw new Error('Aan een besteld project kan niets meer worden toegevoegd')

  // Eigen nummer en eigen datums; de inhoud (ook een geüploade tekening) is gelijk aan de bron
  const { id: _id, created_at: _aangemaakt, updated_at: _bijgewerkt, ...rest } = bron as Record<string, unknown>
  void _id; void _aangemaakt; void _bijgewerkt
  const { error } = await supabase.from('configurations').insert({ ...rest, user_id: user.id, status: 'saved', article_number: generateArticleNumber() })
  if (error) throw new Error(error.message)

  revalidatePath(`/projecten/${bron.project_id}`)
  revalidatePath('/dashboard')
}

/** Naam en referentie van het project wijzigen: dat zijn de naam en referentie van elke regel. */
export async function hernoemProject(projectId: string, rawNaam: string, rawReferentie: string): Promise<void> {
  const parsed = z.object({
    projectId: z.string().uuid(),
    naam: z.string().trim().min(1, 'Projectnaam is verplicht').max(200),
    referentie: z.string().trim().max(200),
  }).safeParse({ projectId, naam: rawNaam, referentie: rawReferentie })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Ongeldige invoer')
  const { naam, referentie } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { data: regels } = await supabase.from('configurations').select('id, status, selected_options').eq('project_id', projectId)
  if (!regels || regels.length === 0) throw new Error('Project niet gevonden')
  if (regels.some((r) => r.status === 'ordered')) throw new Error('Een besteld project kan niet meer worden aangepast')

  for (const regel of regels) {
    const { data, error } = await supabase.from('configurations')
      .update({ name: naam, selected_options: { ...(regel.selected_options as Record<string, unknown>), reference: referentie }, updated_at: new Date().toISOString() })
      .eq('id', regel.id)
      .select('id')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('Geen rechten om dit project aan te passen')
  }

  revalidatePath(`/projecten/${projectId}`)
  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
}
