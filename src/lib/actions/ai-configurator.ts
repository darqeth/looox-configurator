'use server'
import { createClient } from '@/lib/supabase/server'
import { analyseerSpiegel } from '@/lib/ai/spiegel-analyse'
import type { AISuggestion } from '@/lib/types/ai-configurator'

export async function analyzeSpiegelWithAI(input: {
  description: string | null
  imageBase64: string | null
  imageMimeType: string | null
}): Promise<{ success: true; result: AISuggestion } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  if (!input.description && !input.imageBase64) {
    return { success: false, error: 'Geef een beschrijving of upload een afbeelding' }
  }

  // Rate limit (audit S9): Anthropic-calls kosten geld — max 20 per uur per
  // gebruiker. Fail-open als de RPC (nog) niet bestaat.
  const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
    p_key: `ai-intake:${user.id}`,
    p_max: 20,
    p_window_seconds: 3600,
  })
  if (rlError) {
    console.error('[rate-limit] check_rate_limit niet beschikbaar:', rlError.message)
  } else if (allowed === false) {
    return { success: false, error: 'Je hebt het maximum aantal AI-aanvragen voor dit uur bereikt. Probeer het later opnieuw.' }
  }

  return analyseerSpiegel(input)
}
