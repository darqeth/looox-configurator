'use server'

import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 20

type TeamMember = { userId: string; name: string; count: number }

export type ConfigRow = {
  id: string
  name: string | null
  article_number: string | null
  total_price: number
  status: string
  created_at: string
  updated_at: string
  width: number | null
  height: number | null
  selected_options: Record<string, unknown> | null
  user_id: string
}

export type ConfigurationsData = {
  configs: ConfigRow[]
  filteredCount: number
  savedCount: number
  ownCount: number
  permissions: { isManager: boolean; canOrder: boolean; canConfigure: boolean }
  teamMembers: TeamMember[]
  validView: boolean
  viewingName: string | null
  korting: number
  currentPage: number
  totalPages: number
  currentUserId: string
}

export async function fetchConfigurations(params: {
  filter: string
  view: string
  page: number
}): Promise<ConfigurationsData> {
  const supabase = await createClient()
  // Lokale JWT-verificatie — geen auth-roundtrip per aanroep
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) throw new Error('Unauthorized')

  const currentPage = Math.max(1, params.page || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: memberPerms }, { data: profileData }] = await Promise.all([
    supabase
      .from('company_members')
      .select('role, can_order, can_configure, own_configs_only, company_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('korting').eq('id', userId).single(),
  ])

  const korting = profileData?.korting ?? 50
  const isManager = !memberPerms || memberPerms.role === 'manager'
  // can_order is leidend, ook voor een manager; geen member-rij = mag bestellen
  const canOrder = memberPerms ? (memberPerms.can_order ?? true) : true
  const canConfigure = isManager || (memberPerms?.can_configure ?? true)

  const loadTeamMembers = async (): Promise<TeamMember[]> => {
    if (!isManager || !memberPerms?.company_id) return []

    const { data: rawMembers } = await supabase
      .from('company_members')
      .select('user_id, profiles!inner(full_name)')
      .eq('company_id', memberPerms.company_id)
      .neq('user_id', userId)

    const memberUserIds = (rawMembers ?? []).map(m => m.user_id as string)

    const { data: memberConfigRows } = memberUserIds.length > 0
      ? await supabase.from('configurations').select('user_id').in('user_id', memberUserIds).eq('status', 'saved')
      : { data: [] as { user_id: string }[] }

    const memberConfigCounts = (memberConfigRows ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.user_id] = (acc[row.user_id] ?? 0) + 1
      return acc
    }, {})

    return (rawMembers ?? []).map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = Array.isArray(m.profiles) ? (m.profiles as any[])[0] : m.profiles
      const uid = m.user_id as string
      return {
        userId: uid,
        name: (profile?.full_name as string | null) ?? 'Onbekend',
        count: memberConfigCounts[uid] ?? 0,
      }
    })
  }

  const loadMain = (viewUserId: string) => Promise.all([
    supabase
      .from('configurations')
      .select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options, user_id', { count: 'exact' })
      .eq('user_id', viewUserId)
      .eq('status', 'saved')
      .order('updated_at', { ascending: false })
      .range(from, to),
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', viewUserId).eq('status', 'saved'),
    isManager
      ? supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'saved')
      : Promise.resolve({ count: 0 }),
  ])

  // Zonder ?view= staat de doelgebruiker al vast → hoofdqueries parallel met
  // de teamleden-queries. Met ?view= moeten teamleden eerst (validatie).
  let teamMembers: TeamMember[]
  let validView: boolean
  let mainResult: Awaited<ReturnType<typeof loadMain>>

  if (params.view) {
    teamMembers = await loadTeamMembers()
    validView = teamMembers.some(m => m.userId === params.view)
    mainResult = await loadMain(isManager && validView ? params.view : userId)
  } else {
    ;[mainResult, teamMembers] = await Promise.all([loadMain(userId), loadTeamMembers()])
    validView = false
  }

  const [
    { data: configs, count: filteredCount },
    { count: savedCount },
    { count: ownCountRaw },
  ] = mainResult

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE)
  const ownCount = isManager ? ownCountRaw ?? 0 : 0

  const viewingName = validView
    ? teamMembers.find(m => m.userId === params.view)?.name.split(' ')[0] ?? 'collega'
    : null

  return {
    configs: (configs ?? []) as ConfigRow[],
    filteredCount: filteredCount ?? 0,
    savedCount: savedCount ?? 0,
    ownCount,
    permissions: { isManager, canOrder, canConfigure },
    teamMembers,
    validView,
    viewingName,
    korting,
    currentPage,
    totalPages,
    currentUserId: userId,
  }
}
