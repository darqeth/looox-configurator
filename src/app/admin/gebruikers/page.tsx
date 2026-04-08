import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateApprovalStatus } from '@/lib/actions/admin'

const statusConfig = {
  pending:  { label: 'Wacht op goedkeuring', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Goedgekeurd',          className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Afgewezen',            className: 'bg-red-50 text-red-600' },
}

export default async function GebruikersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!self?.is_admin) redirect('/dashboard')

  const [{ data: profiles }, { data: pendingColleagues }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, company, phone, tier, approval_status, created_at, price_factor, price_factor_enabled, company_id')
      .order('created_at', { ascending: false }),
    // Collega-aanvragen: goedgekeurde company + nog niet goedgekeurd
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
  ])

  // Splits pending in: collega-aanvragen (hebben company_id) en nieuwe dealers
  const pendingColleagueIds = new Set((pendingColleagues ?? []).map(p => p.id))
  const pending  = (profiles?.filter(p => p.approval_status === 'pending' && !pendingColleagueIds.has(p.id))) ?? []
  const approved = profiles?.filter(p => p.approval_status === 'approved') ?? []
  const rejected = profiles?.filter(p => p.approval_status === 'rejected') ?? []

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

      {/* Collega-uitnodigingen (apart van nieuwe dealers) */}
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
                  profile={{ ...p, company: companyName, phone: null, tier: null, price_factor: null, price_factor_enabled: null }}
                  showActions
                  isColleague
                  inviterName={inviterName}
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
              <UserRow key={p.id} profile={p} showActions />
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
              <UserRow key={p.id} profile={p} />
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
              <UserRow key={p.id} profile={p} showApprove />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function UserRow({ profile, showActions = false, showApprove = false, isColleague = false, inviterName = null }: {
  profile: {
    id: string
    full_name: string | null
    email: string | null
    company: string | null
    phone: string | null
    tier: string | null
    approval_status: string | null
    created_at: string | null
    price_factor: number | null
    price_factor_enabled: boolean | null
  }
  showActions?: boolean
  showApprove?: boolean
  isColleague?: boolean
  inviterName?: string | null
}) {
  const status = statusConfig[profile.approval_status as keyof typeof statusConfig] ?? statusConfig.pending
  const date = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const firstLetter = profile.full_name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0 text-lx-cta text-sm font-semibold">
        {firstLetter}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-lx-text-primary">{profile.full_name ?? '—'}</p>
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
          {isColleague && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              Collega
            </span>
          )}
          {(profile.price_factor ?? 1) > 1 && (
            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
              profile.price_factor_enabled
                ? 'bg-lx-icon-bg text-lx-cta'
                : 'bg-lx-panel-bg text-lx-text-secondary'
            }`}>
              ×{Number(profile.price_factor).toFixed(2)} consument{profile.price_factor_enabled ? '' : ' (uit)'}
            </span>
          )}
        </div>
        <p className="text-[12px] text-lx-text-secondary mt-0.5">
          {profile.company ?? '—'} · {profile.email ?? '—'}
          {profile.phone ? ` · ${profile.phone}` : ''}
        </p>
        {isColleague && inviterName && (
          <p className="text-[11px] text-lx-text-secondary mt-0.5 opacity-70">
            Uitgenodigd door {inviterName}
          </p>
        )}
      </div>

      {/* Datum */}
      <p className="text-[11.5px] text-lx-text-secondary flex-shrink-0 hidden sm:block">{date}</p>

      {/* Acties */}
      {showActions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <form action={updateApprovalStatus.bind(null, profile.id, 'approved')}>
            <button
              type="submit"
              className="bg-lx-cta hover:bg-lx-cta-hover text-white text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Goedkeuren
            </button>
          </form>
          <form action={updateApprovalStatus.bind(null, profile.id, 'rejected')}>
            <button
              type="submit"
              className="text-lx-text-secondary hover:text-red-600 hover:bg-red-50 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              Afwijzen
            </button>
          </form>
        </div>
      )}

      {showApprove && (
        <form action={updateApprovalStatus.bind(null, profile.id, 'approved')} className="flex-shrink-0">
          <button
            type="submit"
            className="text-lx-cta hover:bg-lx-icon-bg text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
          >
            Alsnog goedkeuren
          </button>
        </form>
      )}
    </div>
  )
}
