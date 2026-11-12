import type { SupabaseClient } from '@supabase/supabase-js'
import { projectKop } from '@/lib/project'

// Gedeeld door de opslag-acties van spiegels, projectspiegels en meubels: bepaalt
// bij welk project (winkelmandje) een nieuwe regel komt. Geen 'use server': dit is
// een helper, geen aanroepbare actie.

export type ProjectDoel = { projectId: string; naam: string; referentie: string } | null

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
    return { projectId: opties.projectId, naam: kop.naam, referentie: kop.referentie }
  }
  if (opties.nieuwProject) return { projectId: crypto.randomUUID(), naam: opties.naam, referentie: opties.referentie }
  return null
}
