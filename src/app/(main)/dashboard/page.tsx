import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import NotificationBell from './notification-bell'
import { DashboardContent, DashboardContentSkeleton } from './dashboard-content'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDate() {
  return new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: memberData },
    { data: notificationItems },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, notifications_read_at, price_factor, price_factor_enabled').eq('id', user.id).single(),
    supabase.from('company_members').select('company_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }).limit(20),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'daar'
  const company = profile?.company ?? ''
  const priceFactor = profile?.price_factor ?? 1
  const priceFactorEnabled = profile?.price_factor_enabled ?? false
  // company_members is bron van waarheid — profile.company_id kan stale zijn
  const companyId = memberData?.company_id ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">

      {/* Header — rendert direct, geen zware DB queries nodig */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-lx-text-secondary text-[13px] mt-1">
            {capitalize(formatDate())}{company ? ` · ${company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {priceFactorEnabled && priceFactor > 1 && (
            <span className="hidden sm:flex items-center gap-1.5 bg-lx-icon-bg text-lx-cta text-[11.5px] font-semibold px-3 py-1.5 rounded-xl border border-lx-cta/20">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4m0 4h.01"/></svg>
              Consumentenprijzen actief
            </span>
          )}
          <NotificationBell
            notifications={notificationItems ?? []}
            readAt={profile?.notifications_read_at ?? null}
          />
        </div>
      </div>

      {/* Consumentenprijzen banner — alleen mobiel */}
      {priceFactorEnabled && priceFactor > 1 && (
        <div className="sm:hidden mb-4 flex items-center gap-2 bg-lx-icon-bg text-lx-cta text-[12px] font-semibold px-3.5 py-2.5 rounded-xl border border-lx-cta/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4m0 4h.01"/></svg>
          Consumentenprijzen actief
        </div>
      )}

      {/* Content — streamt zodra DB queries klaar zijn */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent
          userId={user.id}
          companyId={companyId}
          priceFactor={priceFactor}
          priceFactorEnabled={priceFactorEnabled}
        />
      </Suspense>

    </div>
  )
}
