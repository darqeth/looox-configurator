import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CollegasPanel from './collegas-panel'
import { TabNav } from '../tab-nav'

export default async function CollegasPage() {
  const supabase = await createClient()
  // Lokale JWT-verificatie — geen auth-roundtrip
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  // company_members is bron van waarheid
  const { data: myMember } = await supabase
    .from('company_members')
    .select('role, company_id')
    .eq('user_id', userId)
    .single()

  // Geen actief lidmaatschap → geen bedrijfspagina tonen
  if (!myMember?.company_id) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
        <TabNav active="collegas" />
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-8 text-center mt-4">
          <p className="text-lx-text-secondary text-[13px]">Je bent nog niet gekoppeld aan een bedrijf.</p>
        </div>
      </div>
    )
  }

  const isManager = myMember.role === 'manager'
  const activeCompanyId = myMember.company_id

  // Haal alle leden op
  const { data: members } = await supabase
    .from('company_members')
    .select(`
      id, role, can_order, can_configure, own_configs_only, created_at,
      profiles!inner(id, full_name, email, avatar_url, approval_status)
    `)
    .eq('company_id', activeCompanyId)
    .order('created_at')

  // Haal openstaande invites op (alleen voor managers)
  const { data: invites } = isManager
    ? await supabase
        .from('company_invites')
        .select('id, email, token, expires_at, created_at, can_order, can_configure, own_configs_only')
        .eq('company_id', activeCompanyId)
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
      can_configure: m.can_configure as boolean,
      own_configs_only: m.own_configs_only as boolean,
      userId: profile?.id as string,
      name: (profile?.full_name as string | null) ?? '—',
      email: (profile?.email as string | null) ?? '—',
      avatarUrl: profile?.avatar_url as string | null,
      approvalStatus: profile?.approval_status as string | null,
      isSelf: profile?.id === userId,
    }
  })

  const inviteList = (invites ?? []).map(i => ({
    id: i.id,
    email: i.email,
    token: i.token,
    expiresAt: i.expires_at,
    can_order: i.can_order as boolean,
    can_configure: i.can_configure as boolean,
    own_configs_only: i.own_configs_only as boolean,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
      <TabNav active="collegas" />
      <CollegasPanel
        isManager={isManager}
        members={memberList}
        invites={inviteList}
        companyId={activeCompanyId}
      />
    </div>
  )
}

