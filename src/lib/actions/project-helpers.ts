import type { SupabaseClient } from '@supabase/supabase-js'
import { leesKlant, projectKop, type ProjectKlant } from '@/lib/project'

// Gedeeld door de opslag-acties van spiegels, projectspiegels en meubels: bepaalt
// bij welk project (winkelmandje) een nieuwe regel komt. Geen 'use server': dit is
// een helper, geen aanroepbare actie.

export type ProjectDoel = { projectId: string; naam: string; referentie: string; klant?: ProjectKlant | null } | null

/** Wat een regel van het project overneemt: de referentie en de klant voor de offerte. */
export function projectVelden(doel: NonNullable<ProjectDoel>): Record<string, unknown> {
  return { reference: doel.referentie, ...(doel.klant && { klant: doel.klant }) }
}

/** Bij het bewerken van een regel blijft de klant van het project staan. */
export async function behoudKlant(supabase: SupabaseClient, configId: string): Promise<{ klant?: ProjectKlant }> {
  const { data } = await supabase.from('configurations').select('selected_options').eq('id', configId).maybeSingle()
  const klant = leesKlant(data?.selected_options)
  return klant ? { klant } : {}
}

/**
 * projectId: de regel komt bij dit bestaande project; naam en referentie volgen
 * het project. RLS bepaalt of de aanroeper het project mag zien.
 * nieuwProject: de regel wordt de eerste van een nieuw project.
 */
export async function bepaalProjectDoel(
  supabase: SupabaseClient,
  opties: { projectId?: string | null; nieuwProject?: boolean; naam: string; referentie: string },
): Promise<ProjectDoel> {
  if (opties.projectId) {
    const { data: regels } = await supabase
      .from('configurations')
      .select('id, name, total_price, status, width, height, selected_options')
      .eq('project_id', opties.projectId)
      .order('created_at')
    if (!regels || regels.length === 0) throw new Error('Project niet gevonden')
    if (regels.some((r) => r.status === 'ordered')) throw new Error('Dit project is al besteld; er kan geen regel meer bij')
    const kop = projectKop(regels)
    return { projectId: opties.projectId, naam: kop.naam, referentie: kop.referentie, klant: kop.klant }
  }
  if (opties.nieuwProject) return { projectId: crypto.randomUUID(), naam: opties.naam, referentie: opties.referentie }
  return null
}
