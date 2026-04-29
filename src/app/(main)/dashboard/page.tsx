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
    supabase.from('profiles').select('full_name, company, notifications_read_at, is_international, is_groothandel').eq('id', user.id).single(),
    supabase.from('company_members').select('company_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }).limit(20),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'daar'
  const company = profile?.company ?? ''
  const isInternational = profile?.is_international ?? false
  const isGroothandel = profile?.is_groothandel ?? false
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
          <NotificationBell
            notifications={notificationItems ?? []}
            readAt={profile?.notifications_read_at ?? null}
          />
        </div>
      </div>

      {/* Content — streamt zodra DB queries klaar zijn */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent
          userId={user.id}
          companyId={companyId}
          isInternational={isInternational}
          isGroothandel={isGroothandel}
        />
      </Suspense>

    </div>
  )
}
