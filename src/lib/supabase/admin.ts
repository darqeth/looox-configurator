import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS volledig.
 * Alleen gebruiken voor server-side operaties die geen user-context hebben
 * (bv. invite-validatie bij registratie, systeem-updates).
 * Nooit blootstellen aan de client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
