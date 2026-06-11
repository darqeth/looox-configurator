import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import { UserRow } from './user-row'
import type { UserRowProfile } from './user-row'
import { AdminPagination } from '@/components/admin-pagination'
import UserTabs from './user-tabs'

const PAGE_SIZE = 20

type RawMember = {
  role: string
  can_order: boolean
  can_configure: boolean
  own_configs_only: boolean
}

export default async function GebruikersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

  const { page: pageParam, q, status } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))

  const [{ data: rawProfiles }, { data: pendingColleagues }, { data: companies }, { data: streaks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, company, phone, tier, approval_status, created_at, korting, company_id, is_international, is_groothandel, configurator_access, is_admin, is_sub_admin, company_members(role, can_order, can_configure, own_configs_only)')
      .order('created_at', { ascending: false })
      .limit(500), // TODO: pagination
    supabase
      .from('profiles')
      .select(`
        id, full_name, email, approval_status, created_at,
        company_id,
        companies(name),
        company_members!inner(invited_by, profiles!company_members_invited_by_fkey(full_name))
      `)
      .eq('approval_status', 'pending')
      .not('company_id', 'is', null),
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('login_streaks').select('user_id, total_days, last_login_date'),
  ])

  const streakMap: Record<string, { totalDays: number; lastLogin: string | null }> = {}
  for (const s of streaks ?? []) streakMap[s.user_id] = { totalDays: s.total_days ?? 0, lastLogin: s.last_login_date ?? null }

  // Normalize profiles: extract first company_members row
  const profiles: UserRowProfile[] = (rawProfiles ?? []).map(p => {
    const rawP = p as typeof p & { company_members?: RawMember[] | null }
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      company: p.company,
      phone: p.phone,
      tier: p.tier,
      approval_status: p.approval_status,
      created_at: p.created_at,
      korting: p.korting,
      is_international: p.is_international,
      is_groothandel: (p as typeof p & { is_groothandel?: boolean | null }).is_groothandel ?? null,
      configurator_access: (p as typeof p & { configurator_access?: string | null }).configurator_access ?? null,
      is_admin: (p as typeof p & { is_admin?: boolean }).is_admin ?? false,
      is_sub_admin: (p as typeof p & { is_sub_admin?: boolean }).is_sub_admin ?? false,
      company_id: p.company_id,
      member: rawP.company_members?.[0] ?? null,
    }
  })

  const pendingColleagueIds = new Set((pendingColleagues ?? []).map(p => p.id))
  const pending  = profiles.filter(p => p.approval_status === 'pending' && !pendingColleagueIds.has(p.id))
  const approved = profiles.filter(p => p.approval_status === 'approved')
  const rejected = profiles.filter(p => p.approval_status === 'rejected')

  // Zoekfilter
  function matchesQ(name: string | null, email: string | null, company: string | null) {
    if (!q) return true
    const term = q.toLowerCase()
    return (
      (name ?? '').toLowerCase().includes(term) ||
      (email ?? '').toLowerCase().includes(term) ||
      (company ?? '').toLowerCase().includes(term)
    )
  }

  type RawColleague = {
    id: string
    full_name: string | null
    email: string | null
    approval_status: string | null
    created_at: string | null
    company_id: string | null
    companies: { name: string } | null
    company_members: Array<{ invited_by: string; profiles: { full_name: string | null } | null }>
  }

  const filteredColleagues = (pendingColleagues ?? []).filter(p => {
    const c = p as unknown as RawColleague
    return matchesQ(p.full_name, p.email, c.companies?.name ?? null)
  })
  const filteredPending  = pending.filter(p => matchesQ(p.full_name, p.email, p.company))
  const filteredApproved = approved.filter(p => matchesQ(p.full_name, p.email, p.company))
  const filteredRejected = rejected.filter(p => matchesQ(p.full_name, p.email, p.company))

  const totalPending = pending.length + (pendingColleagues?.length ?? 0)

  const tabs = [
    { key: '', label: 'Alle', count: profiles.length + (pendingColleagues?.length ?? 0) },
    { key: 'pending', label: 'In afwachting', count: totalPending },
    { key: 'approved', label: 'Goedgekeurd', count: approved.length },
    { key: 'rejected', label: 'Afgewezen', count: rejected.length },
  ]

  const showPending  = !status || status === 'pending'
  const showApproved = !status || status === 'approved'
  const showRejected = !status || status === 'rejected'

  const approvedTotalPages = Math.ceil(filteredApproved.length / PAGE_SIZE)
  const approvedPage = Math.min(currentPage, Math.max(1, approvedTotalPages))
  const pagedApproved = filteredApproved.slice((approvedPage - 1) * PAGE_SIZE, approvedPage * PAGE_SIZE)

  const hrefParams: Record<string, string> = {}
  if (status) hrefParams.status = status
  if (q) hrefParams.q = q

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">Gebruikers</h1>
        <p className="text-lx-text-secondary text-[13px] mt-1">
          {totalPending > 0
            ? <><span className="text-amber-600 font-medium">{totalPending} aanvra{totalPending === 1 ? 'ag' : 'gen'}</span> wacht{totalPending === 1 ? '' : 'en'} op goedkeuring</>
            : 'Geen openstaande aanvragen'}
        </p>
      </div>

      {/* Zoekbalk + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form method="get" action="/admin/gebruikers" className="relative flex-1 max-w-sm">
          {status && <input type="hidden" name="status" value={status} />}
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lx-text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Zoek op naam, e-mail of bedrijf…"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/30 outline-none transition-colors"
          />
        </form>
        <UserTabs tabs={tabs} currentStatus={status ?? ''} currentQ={q ?? ''} />
      </div>

      {/* Collega-uitnodigingen */}
      {showPending && filteredColleagues.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">
            Collega-aanvragen ({filteredColleagues.length})
          </h2>
          <div className="space-y-2">
            {filteredColleagues.map(p => {
              const colleague = p as unknown as RawColleague
              const companyName = colleague.companies?.name ?? '—'
              const inviterName = colleague.company_members?.[0]?.profiles?.full_name ?? null
              return (
                <UserRow
                  key={p.id}
                  profile={{ id: p.id, full_name: p.full_name, email: p.email, company: companyName, phone: null, tier: null, korting: null, is_international: null, is_groothandel: null, configurator_access: null, is_admin: false, is_sub_admin: false, company_id: p.company_id ?? null, approval_status: p.approval_status, created_at: p.created_at, member: null }}
                  showActions
                  isColleague
                  inviterName={inviterName}
                  companies={companies ?? []}
                  currentUserIsAdmin
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Wacht op goedkeuring — nieuwe dealers */}
      {showPending && filteredPending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Wacht op goedkeuring ({filteredPending.length})</h2>
          <div className="space-y-2">
            {filteredPending.map(p => (
              <UserRow key={p.id} profile={p} showActions companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* Goedgekeurde gebruikers */}
      {showApproved && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Goedgekeurd ({filteredApproved.length})</h2>
          {filteredApproved.length > 0 ? (
            <>
              <div className="space-y-2">
                {pagedApproved.map(p => (
                  <UserRow key={p.id} profile={p} companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
                ))}
              </div>
              <AdminPagination
                currentPage={approvedPage}
                totalPages={approvedTotalPages}
                total={filteredApproved.length}
                pageSize={PAGE_SIZE}
                basePath="/admin/gebruikers"
                hrefParams={hrefParams}
              />
            </>
          ) : (
            <p className="text-[13px] text-lx-text-secondary">
              {q ? `Geen resultaten voor "${q}"` : 'Nog geen goedgekeurde gebruikers'}
            </p>
          )}
        </section>
      )}

      {/* Afgewezen */}
      {showRejected && filteredRejected.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Afgewezen ({filteredRejected.length})</h2>
          <div className="space-y-2">
            {filteredRejected.map(p => (
              <UserRow key={p.id} profile={p} showApprove companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* Leeg bericht als niets gevonden bij zoeken */}
      {q && filteredColleagues.length === 0 && filteredPending.length === 0 && filteredApproved.length === 0 && filteredRejected.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Geen resultaten voor &ldquo;{q}&rdquo;</p>
          <p className="text-[13px] text-lx-text-secondary">Probeer een andere zoekterm.</p>
        </div>
      )}
    </div>
  )
}
