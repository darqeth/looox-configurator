import { createClient } from '@/lib/supabase/server'
import { ProfileForm, PasswordForm } from './profile-form'
import AvatarUpload from './avatar-upload'

const tierInfo: Record<string, { label: string; description: string; color: string }> = {
  Studio: {
    label: 'Studio',
    description: 'Standaard dealertoegang met vaste prijzen.',
    color: 'bg-gray-100 text-lx-text-secondary',
  },
  Signature: {
    label: 'Signature',
    description: 'Uitgebreide toegang met staffelkorting.',
    color: 'bg-blue-50 text-blue-700',
  },
  Atelier: {
    label: 'Atelier',
    description: 'Volledige toegang met maximale kortingen en prioriteit.',
    color: 'bg-amber-50 text-amber-700',
  },
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-lx-divider">
        <h2 className="text-[14px] font-bold text-lx-text-primary">{title}</h2>
        {description && <p className="text-[12px] text-lx-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AccountContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[120, 220, 100, 80].map((h, i) => (
        <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-lx-divider">
            <div className="h-4 w-32 bg-lx-divider rounded" />
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              <div className="h-3 w-full bg-lx-divider rounded" />
              <div className="h-3 w-3/4 bg-lx-divider rounded" />
              {h > 150 && <div className="h-3 w-1/2 bg-lx-divider rounded" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data component ───────────────────────────────────────────────────────────

export async function AccountContent({ userId, userEmail }: { userId: string; userEmail: string }) {
  const supabase = await createClient()

  const [
    { data: profile },
    { data: _memberData },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, phone, address, tier, created_at, avatar_url, company_id').eq('id', userId).single(),
    supabase.from('company_members').select('role, can_see_purchase_prices').eq('user_id', userId).maybeSingle(),
  ])

  const tier = tierInfo[profile?.tier ?? 'Studio'] ?? tierInfo.Studio
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-4">

      {/* Accountniveau */}
      <Card title="Accountniveau">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
                {tier.label}
              </span>
            </div>
            <p className="text-[13px] text-lx-text-secondary">{tier.description}</p>
            <p className="text-[11.5px] text-lx-placeholder mt-1">Lid sinds {memberSince}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>
      </Card>

      {/* Profielgegevens */}
      <Card title="Profielgegevens" description="Je naam en bedrijfsgegevens zijn zichtbaar voor LoooX.">
        <div className="mb-5 pb-5 border-b border-lx-divider">
          <AvatarUpload
            userId={userId}
            currentUrl={profile?.avatar_url ?? null}
            name={profile?.full_name ?? null}
          />
        </div>
        <ProfileForm profile={{
          full_name: profile?.full_name ?? null,
          company: profile?.company ?? null,
          phone: profile?.phone ?? null,
          address: profile?.address ?? null,
          email: userEmail,
        }} />
      </Card>

      {/* Beveiliging */}
      <Card title="Beveiliging" description="Kies een sterk wachtwoord van minimaal 8 tekens.">
        <PasswordForm />
      </Card>

    </div>
  )
}
