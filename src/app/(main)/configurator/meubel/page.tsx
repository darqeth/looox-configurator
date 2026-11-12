import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'
import MeubelConfigurator from './meubel-configurator'

export const metadata = { title: 'Nieuw meubel | LoooX Configurator' }

export default async function MeubelPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  // Servercheck: ook een directe link werkt niet zonder toegang
  const [toegang, factor] = await Promise.all([
    hasMeubelAccess(supabase, userId),
    getMeubelFactor(supabase, userId),
  ])
  if (!toegang) redirect('/configurator/nieuw')

  return <MeubelConfigurator factor={factor} />
}
