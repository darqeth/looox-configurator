import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'
import { getExtraOptionTooltips, getControlTooltips } from '@/lib/actions/admin'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let korting = 50
  let canOrder = true
  let isInternational = false
  let isGroothandel = false

  const [
    optionTooltips,
    controlTooltips,
    profileResult,
    memberResult,
  ] = await Promise.all([
    getExtraOptionTooltips(),
    getControlTooltips(),
    user ? supabase.from('profiles').select('is_international, is_groothandel, configurator_access, korting').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  if (user) {
    const profile = profileResult.data
    const memberData = memberResult.data
    const isManager = !memberData || memberData.role === 'manager'
    canOrder = isManager || (memberData?.can_order ?? true)
    isInternational = profile?.is_international ?? false
    // Sprint 1: alleen 'project' routeert naar de projectconfigurator;
    // 'beide' krijgt in sprint 2 een typekeuze en gedraagt zich nu als maatwerk
    isGroothandel = (profile as { configurator_access?: string | null } | null)?.configurator_access === 'project'
    korting = profile?.korting ?? 50
  }

  if (isGroothandel) {
    return <ProjectspiegelConfigurator />
  }

  return (
    <ConfiguratorWizard
      korting={korting}
      canOrder={canOrder}
      isInternational={isInternational}
      optionTooltips={optionTooltips}
      controlTooltips={controlTooltips}
    />
  )
}
