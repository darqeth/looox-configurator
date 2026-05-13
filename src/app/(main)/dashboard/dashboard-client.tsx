'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '@/lib/queries/fetch-dashboard'
import { DashboardContent, DashboardContentSkeleton } from './dashboard-content'
import NotificationBell from './notification-bell'

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

export function DashboardClient() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  })

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <div className="h-7 w-48 bg-lx-divider rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-lx-divider rounded animate-pulse" />
          </div>
        </div>
        <DashboardContentSkeleton />
        <p className="mt-5 text-center text-[12px] text-lx-text-muted">Jouw data aan het ophalen…</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">
            {getGreeting()}, {data.firstName}
          </h1>
          <p className="text-lx-text-secondary text-[13px] mt-1">
            {capitalize(formatDate())}{data.company ? ` · ${data.company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell
            notifications={data.notifications}
            readAt={data.notificationsReadAt}
          />
        </div>
      </div>
      <DashboardContent data={data} />
    </div>
  )
}
