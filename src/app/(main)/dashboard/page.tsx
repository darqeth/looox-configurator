import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  DashboardHeader, HeaderSkeleton,
  KpiRow, KpiRowSkeleton,
  RecentConfigsRows, ConfigRowsSkeleton,
  NewsRows, NewsRowsSkeleton,
  UpdatesRows, UpdatesRowsSkeleton, UpdatesHeaderExtra,
  DownloadsRows, DownloadsRowsSkeleton,
  SnelStartenCard,
  CircleSection, CircleSkeleton,
} from './dashboard-sections'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Minimale fetch om Circle conditioneel te tonen zonder skeleton flash
  const { data: flags } = await supabase
    .from('profiles').select('is_international, is_groothandel')
    .eq('id', user.id).single()
  const showCircle = !(flags?.is_international || flags?.is_groothandel)

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">

      {/* Header — groet + notificaties */}
      <Suspense fallback={<HeaderSkeleton />}>
        <DashboardHeader userId={user.id} />
      </Suspense>

      {/* KPI cards */}
      <Suspense fallback={<KpiRowSkeleton />}>
        <KpiRow userId={user.id} />
      </Suspense>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Recente configuraties — shell direct zichtbaar */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Recente configuraties</span>
            <Link href="/configuraties" className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors">
              Alles bekijken →
            </Link>
          </div>
          <Suspense fallback={<ConfigRowsSkeleton />}>
            <RecentConfigsRows userId={user.id} />
          </Suspense>
        </div>

        {/* Nieuws — shell direct zichtbaar */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Laatste nieuws</span>
            <span className="text-[12px] text-lx-text-secondary">looox.nl</span>
          </div>
          <Suspense fallback={<NewsRowsSkeleton />}>
            <NewsRows />
          </Suspense>
        </div>

      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

        {/* Updates — shell direct, ChangelogModal streamt mee met data */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Updates</span>
            <Suspense fallback={null}>
              <UpdatesHeaderExtra />
            </Suspense>
          </div>
          <Suspense fallback={<UpdatesRowsSkeleton />}>
            <UpdatesRows />
          </Suspense>
        </div>

        {/* Downloads — shell direct zichtbaar */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Downloads</span>
          </div>
          <Suspense fallback={<DownloadsRowsSkeleton />}>
            <DownloadsRows />
          </Suspense>
        </div>

        {/* Snel starten — 100% statisch, geen Suspense */}
        <SnelStartenCard />

      </div>

      {/* LoooX Circle */}
      {showCircle && (
        <Suspense fallback={<CircleSkeleton />}>
          <CircleSection userId={user.id} />
        </Suspense>
      )}

    </div>
  )
}
