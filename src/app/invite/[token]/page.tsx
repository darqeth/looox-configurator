import { createAdminClient } from '@/lib/supabase/admin'
import Image from 'next/image'
import InviteRegisterForm from './invite-register-form'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Gebruik admin client — invite-tabel heeft RLS die auth vereist,
  // maar de bezoeker van de invite-link is nog niet ingelogd.
  const admin = createAdminClient()

  // Valideer de token server-side
  const { data: invite } = await admin
    .from('company_invites')
    .select('id, email, company_id, invited_by, expires_at, accepted_at, companies(name)')
    .eq('token', token)
    .single()

  // Token niet gevonden, verlopen of al geaccepteerd
  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-lx-divider flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <Image src="/logo-looox-grey.svg" alt="LoooX" width={200} height={96} unoptimized className="h-20 mx-auto mb-8" style={{ width: 'auto' }} />
          <div className="bg-white rounded-2xl shadow-md border border-black/5 p-8">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="text-red-500" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 className="text-[16px] font-bold text-lx-text-primary mb-2">Uitnodiging verlopen</h2>
            <p className="text-[13px] text-lx-text-secondary">
              Deze uitnodigingslink is ongeldig of verlopen. Vraag je collega om een nieuwe uitnodiging te sturen.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const inviterName = invite.invited_by
    ? await admin.from('profiles').select('full_name').eq('id', invite.invited_by).single()
        .then(r => r.data?.full_name ?? null)
    : null

  // Supabase geeft joined table terug als array of object afhankelijk van de query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companiesData = invite.companies as any
  const companyName: string = Array.isArray(companiesData) ? (companiesData[0]?.name ?? '') : (companiesData?.name ?? '')

  return (
    <div className="min-h-screen bg-lx-divider flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo-looox-grey.svg" alt="LoooX" width={200} height={96} unoptimized className="h-24 mx-auto mb-2" style={{ width: 'auto' }} />
          <p className="text-sm text-lx-text-secondary">Configurator</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-lx-text-primary">
              Je bent uitgenodigd
            </h2>
            <p className="text-sm text-lx-text-secondary mt-1">
              {inviterName
                ? <><span className="font-medium text-lx-text-primary">{inviterName}</span> heeft je uitgenodigd voor <span className="font-medium text-lx-text-primary">{companyName}</span>.</>
                : <>Je bent uitgenodigd voor <span className="font-medium text-lx-text-primary">{companyName}</span>.</>
              }
              {' '}Na goedkeuring door LoooX heb je toegang.
            </p>
          </div>

          <InviteRegisterForm
            email={invite.email}
            company={companyName}
            inviteToken={token}
          />
        </div>
      </div>
    </div>
  )
}
