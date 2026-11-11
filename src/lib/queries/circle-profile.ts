import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Profiel voor de LoooX Circle-pagina, één keer per request opgehaald en gedeeld
// tussen de toegangscheck in de pagina en de data-fetch (performance-audit 2026-11).
export const getCircleProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, company, created_at, company_id, configurator_access, is_international')
    .eq('id', userId)
    .single()
  return data
})
