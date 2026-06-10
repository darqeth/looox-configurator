'use server'

import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 20

type TeamMember = { userId: string; name: string; count: number }

export type OrderRow = {
  id: string
  order_number: string
  quantity: number
  unit_price: number
  total_price: number
  status: string
  notes: string | null
  afkeur_reden: string | null
  created_at: string
  configurations: {
    id: string
    name: string | null
    width: number | null
    height: number | null
    selected_options: Record<string, unknown>
  } | null
  order_drawings: { file_url: string; file_name: string }[]
}

export type OrdersData = {
  orders: OrderRow[]
  count: number
  totalPages: number
  currentPage: number
  isManager: boolean
  teamMembers: TeamMember[]
  validView: boolean
  viewingName: string | null
  ownCount: number
}

export async function fetchOrders(params: { view: string; page: number }): Promise<OrdersData> {
  const supabase = await createClient()
  // Lokale JWT-verificatie — geen auth-roundtrip per aanroep
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) throw new Error('Unauthorized')

  const currentPage = Math.max(1, params.page || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: memberPerms } = await supabase
    .from('company_members')
    .select('role, company_id')
    .eq('user_id', userId)
    .maybeSingle()

  const isManager = !memberPerms || memberPerms.role === 'manager'

  const loadTeamMembers = async (): Promise<TeamMember[]> => {
    if (!isManager || !memberPerms?.company_id) return []

    const { data: rawMembers } = await supabase
      .from('company_members')
      .select('user_id, profiles!inner(full_name)')
      .eq('company_id', memberPerms.company_id)
      .neq('user_id', userId)

    const memberUserIds = (rawMembers ?? []).map(m => m.user_id as string)

    const { data: memberOrderRows } = memberUserIds.length > 0
      ? await supabase.from('orders').select('user_id').in('user_id', memberUserIds)
      : { data: [] as { user_id: string }[] }

    const memberOrderCounts = (memberOrderRows ?? []).reduce<Record<string, number>>((acc, row) => {
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
        count: memberOrderCounts[uid] ?? 0,
      }
    })
  }

  const loadMain = (viewUserId: string) => Promise.all([
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        quantity,
        unit_price,
        total_price,
        status,
        notes,
        afkeur_reden,
        created_at,
        configurations (
          id,
          name,
          width,
          height,
          selected_options
        ),
        order_drawings (
          file_url,
          file_name
        )
      `, { count: 'exact' })
      .eq('user_id', viewUserId)
      .order('created_at', { ascending: false })
      .range(from, to),
    isManager
      ? supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId)
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

  const [{ data: orders, count }, { count: ownCountRaw }] = mainResult
  const ownCount = isManager ? ownCountRaw ?? 0 : 0

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const viewingName = validView
    ? teamMembers.find(m => m.userId === params.view)?.name.split(' ')[0] ?? 'collega'
    : null

  return {
    orders: (orders ?? []) as unknown as OrderRow[],
    count: count ?? 0,
    totalPages,
    currentPage,
    isManager,
    teamMembers,
    validView,
    viewingName,
    ownCount,
  }
}
