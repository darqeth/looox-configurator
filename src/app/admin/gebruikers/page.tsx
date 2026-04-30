import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import { UserRow } from './user-row'
import type { UserRowProfile } from './user-row'

type RawMember = {
  role: string
  can_order: boolean
  can_see_purchase_prices: boolean
  can_configure: boolean
  own_configs_only: boolean
}

export default async function GebruikersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

  const [{ data: rawProfiles }, { data: pendingColleagues }, { data: companies }, { data: streaks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, company, phone, tier, approval_status, created_at, korting, company_id, is_international, is_groothandel, is_admin, is_sub_admin, company_members(role, can_order, can_see_purchase_prices, can_configure, own_configs_only)')
      .order('created_at', { ascending: false }),
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

  const totalPending = pending.length + (pendingColleagues?.length ?? 0)

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

      {/* Collega-uitnodigingen */}
      {(pendingColleagues?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">
            Collega-aanvragen ({pendingColleagues!.length})
          </h2>
          <div className="space-y-2">
            {pendingColleagues!.map(p => {
              type RawColleague = typeof p & {
                companies: { name: string } | null
                company_members: Array<{ invited_by: string; profiles: { full_name: string | null } | null }>
              }
              const colleague = p as RawColleague
              const companyName = colleague.companies?.name ?? '—'
              const inviterName = colleague.company_members?.[0]?.profiles?.full_name ?? null
              return (
                <UserRow
                  key={p.id}
                  profile={{ id: p.id, full_name: p.full_name, email: p.email, company: companyName, phone: null, tier: null, korting: null, is_international: null, is_groothandel: null, is_admin: false, is_sub_admin: false, company_id: p.company_id ?? null, approval_status: p.approval_status, created_at: p.created_at, member: null }}
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
      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Wacht op goedkeuring</h2>
          <div className="space-y-2">
            {pending.map(p => (
              <UserRow key={p.id} profile={p} showActions companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* Goedgekeurde gebruikers */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Goedgekeurd ({approved.length})</h2>
        {approved.length > 0 ? (
          <div className="space-y-2">
            {approved.map(p => (
              <UserRow key={p.id} profile={p} companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-lx-text-secondary">Nog geen goedgekeurde gebruikers</p>
        )}
      </section>

      {/* Afgewezen */}
      {rejected.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Afgewezen ({rejected.length})</h2>
          <div className="space-y-2">
            {rejected.map(p => (
              <UserRow key={p.id} profile={p} showApprove companies={companies ?? []} currentUserIsAdmin totalDays={streakMap[p.id]?.totalDays ?? 0} lastLogin={streakMap[p.id]?.lastLogin ?? null} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
