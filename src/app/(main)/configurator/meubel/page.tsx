import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'
import MeubelConfigurator from './meubel-configurator'
import { isUuid, projectKop } from '@/lib/project'
import { MEUBEL_CATEGORIEEN } from '@/lib/meubel-config'
import { zietInkoop } from '@/lib/inkoop'

export const metadata = { title: 'Tailor-Made | LoooX Configurator' }

export default async function MeubelPage({ searchParams }: { searchParams: Promise<{ project?: string; categorie?: string }> }) {
  const { project: projectParam, categorie } = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  // Servercheck: ook een directe link werkt niet zonder toegang
  const [toegang, factor, { data: lid }] = await Promise.all([
    hasMeubelAccess(supabase, userId),
    getMeubelFactor(supabase, userId),
    supabase.from('company_members').select('role, can_see_purchase_prices').eq('user_id', userId).maybeSingle(),
  ])
  if (!toegang) redirect('/configurator/nieuw')

  // ?project=<id>: dit product komt als regel bij een bestaand project (RLS bepaalt of dat mag)
  let project = null
  if (isUuid(projectParam)) {
    const { data: regels } = await supabase
      .from('configurations')
      .select('id, name, total_price, status, width, height, selected_options')
      .eq('project_id', projectParam)
      .order('created_at')
    if (!regels || regels.length === 0 || regels.some((r) => r.status === 'ordered')) redirect('/configuraties')
    const kop = projectKop(regels)
    project = { id: projectParam, naam: kop.naam, referentie: kop.referentie }
  }

  // ?categorie=waskommen: direct naar de modellen van die categorie (bijverkoop na een bestelling)
  const startCategorie = MEUBEL_CATEGORIEEN.find((c) => c.id === categorie)?.id

  // key: een andere ?project of ?categorie begint met een schone configurator, ook als je er vanuit de configurator zelf heen gaat
  return <MeubelConfigurator key={`${project?.id ?? ''}:${startCategorie ?? ''}`} factor={factor} magInkoopZien={zietInkoop(lid)} project={project} startCategorie={startCategorie} />
}
