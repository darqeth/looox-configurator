import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CollegasPanel from './collegas-panel'

export default async function CollegasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, company')
    .eq('id', user.id)
    .single()

  // Gebruiker heeft geen bedrijfskoppeling
  if (!profile?.company_id) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
        <TabNav active="collegas" />
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-8 text-center mt-4">
          <p className="text-lx-text-secondary text-[13px]">Je bent nog niet gekoppeld aan een bedrijf.</p>
        </div>
      </div>
    )
  }

  const { data: myMember } = await supabase
    .from('company_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isManager = myMember?.role === 'manager'

  // Haal alle leden op
  const { data: members } = await supabase
    .from('company_members')
    .select(`
      id, role, can_order, can_see_purchase_prices, can_configure, own_configs_only, created_at,
      profiles!inner(id, full_name, email, avatar_url, approval_status)
    `)
    .eq('company_id', profile.company_id)
    .order('created_at')

  // Haal openstaande invites op (alleen voor managers)
  const { data: invites } = isManager
    ? await supabase
        .from('company_invites')
        .select('id, email, token, expires_at, created_at')
        .eq('company_id', profile.company_id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Supabase geeft joined records als array terug — we casten via unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberList = ((members ?? []) as any[]).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.id as string,
      role: m.role as 'manager' | 'member',
      can_order: m.can_order as boolean,
      can_see_purchase_prices: m.can_see_purchase_prices as boolean,
      can_configure: m.can_configure as boolean,
      own_configs_only: m.own_configs_only as boolean,
      userId: profile?.id as string,
      name: (profile?.full_name as string | null) ?? '—',
      email: (profile?.email as string | null) ?? '—',
      avatarUrl: profile?.avatar_url as string | null,
      approvalStatus: profile?.approval_status as string | null,
      isSelf: profile?.id === user.id,
    }
  })

  const inviteList = (invites ?? []).map(i => ({
    id: i.id,
    email: i.email,
    token: i.token,
    expiresAt: i.expires_at,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
      <TabNav active="collegas" />
      <CollegasPanel
        isManager={isManager}
        members={memberList}
        invites={inviteList}
        companyId={profile.company_id}
      />
    </div>
  )
}

function TabNav({ active }: { active: 'profiel' | 'collegas' }) {
  return (
    <div className="flex gap-1 mb-6">
      <Link
        href="/account"
        className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          active === 'profiel'
            ? 'bg-lx-icon-bg text-lx-cta'
            : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-icon-bg/50'
        }`}
      >
        Mijn profiel
      </Link>
      <Link
        href="/account/collegas"
        className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          active === 'collegas'
            ? 'bg-lx-icon-bg text-lx-cta'
            : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-icon-bg/50'
        }`}
      >
        Collega&apos;s
      </Link>
    </div>
  )
}

export { TabNav }
