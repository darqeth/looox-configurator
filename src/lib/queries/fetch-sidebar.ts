'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchSidebarData } from '@/lib/sidebar-data'
import type { SidebarData } from '@/lib/sidebar-data'

export async function fetchSidebarQueryData(): Promise<SidebarData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return fetchSidebarData(supabase, user.id)
}
