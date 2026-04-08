import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRow } from './user-row'

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

