import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'
import { ConfiguratorTypeChooser } from './type-selector'
import { getExtraOptionTooltips, getControlTooltips } from '@/lib/actions/admin'
import { parseConfiguratorAccess } from '@/lib/configurator-access'
import { hasMeubelAccess } from '@/lib/meubel-access'
import { isUuid, projectKop } from '@/lib/project'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Nieuwe configuratie | LoooX Configurator' }

export default async function NieuweConfiguratiePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project: projectParam } = await searchParams
  const supabase = await createClient()
  // Leespad: lokale JWT-verificatie (middleware bewaakt de sessie, RLS de data)
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null

  let korting = 50
  let canOrder = true
  let isInternational = false
  let access: ReturnType<typeof parseConfiguratorAccess> = 'maatwerk'

  const [
    optionTooltips,
    controlTooltips,
    profileResult,
    memberResult,
    meubel,
  ] = await Promise.all([
    getExtraOptionTooltips(),
    getControlTooltips(),
    user ? supabase.from('profiles').select('is_international, configurator_access, korting').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? hasMeubelAccess(supabase, user.id) : Promise.resolve(false),
  ])

  if (user) {
    const profile = profileResult.data
    const memberData = memberResult.data
    // can_order is leidend, ook voor een manager; geen member-rij = mag bestellen
    canOrder = memberData ? (memberData.can_order ?? true) : true
    isInternational = profile?.is_international ?? false
    access = parseConfiguratorAccess((profile as { configurator_access?: string | null } | null)?.configurator_access)
    korting = profile?.korting ?? 50
  }

  // ?project=<id>: het nieuwe product komt als regel bij dit project (RLS bepaalt of dat mag)
  let project: { id: string; naam: string; referentie: string } | null = null
  if (user && isUuid(projectParam)) {
    const { data: regels } = await supabase
      .from('configurations')
      .select('id, name, total_price, status, width, height, selected_options')
      .eq('project_id', projectParam)
      .order('created_at')
    if (!regels || regels.length === 0 || regels.some((r) => r.status === 'ordered')) redirect('/projecten')
    const kop = projectKop(regels)
    project = { id: projectParam, naam: kop.naam, referentie: kop.referentie }
  }

  if (access === 'project') {
    // Met meubeltoegang eerst kiezen tussen projectspiegel en meubel
    if (meubel) return <ConfiguratorTypeChooser project={<ProjectspiegelConfigurator project={project} />} meubel projectId={project?.id} />
    return <ProjectspiegelConfigurator project={project} />
  }

  const wizard = (
    <ConfiguratorWizard
      korting={korting}
      canOrder={canOrder}
      isInternational={isInternational}
      optionTooltips={optionTooltips}
      controlTooltips={controlTooltips}
      project={project}
    />
  )

  // 'beide': eerst typekeuze (besluit B2); maatwerk-stand direct de wizard
  if (access === 'beide') {
    return <ConfiguratorTypeChooser wizard={wizard} project={<ProjectspiegelConfigurator project={project} />} meubel={meubel} projectId={project?.id} />
  }
  if (meubel) return <ConfiguratorTypeChooser wizard={wizard} meubel projectId={project?.id} />

  return wizard
}
