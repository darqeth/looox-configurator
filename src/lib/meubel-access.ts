import type { SupabaseClient } from '@supabase/supabase-js'
import { MEUBEL_FACTOR_DEFAULT, parseMeubelFactor } from '@/lib/meubel-config'

// Toegang tot Tailor-Made meubels: per account aangezet door admin, en
// voorlopig niet voor internationale dealers. Altijd op de server controleren.
// De kolommen komen uit supabase/meubels-migration.sql; zolang die niet is
// gedraaid geeft de query een fout en is het antwoord gewoon "geen toegang".

export async function hasMeubelAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('meubel_access, is_international')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return false
  return data.meubel_access === true && data.is_international !== true
}

/** Brutofactor van het bedrijf van deze gebruiker; standaard 2. */
export async function getMeubelFactor(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!member?.company_id) return MEUBEL_FACTOR_DEFAULT
  const { data, error } = await supabase
    .from('companies')
    .select('meubel_factor')
    .eq('id', member.company_id)
    .maybeSingle()
  if (error || !data) return MEUBEL_FACTOR_DEFAULT
  return parseMeubelFactor(data.meubel_factor)
}
