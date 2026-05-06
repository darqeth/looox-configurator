import { Suspense } from 'react'
import Link from 'next/link'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { ConfiguratiesContent, ConfiguratiesContentSkeleton } from './configuraties-content'
import { fetchConfigurations } from '@/lib/queries/fetch-configurations'

export default async function ConfiguratiesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; view?: string }>
}) {
  const { filter, page, view } = await searchParams
  const f = filter ?? ''
  const p = page ?? '1'
  const v = view ?? ''

  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['configurations', { filter: f, view: v, page: p }],
    queryFn: () => fetchConfigurations({ filter: f, view: v, page: Number(p) }),
  })

  return (
    <div className="p-4 sm:p-6 lg:p-7">

      {/* Header — rendert direct, geen DB queries nodig */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Configuraties</h1>
          <p className="text-[13px] text-lx-text-secondary mt-0.5">Jouw opgeslagen spiegelconfiguraties</p>
        </div>
        <Link
          href="/configurator/nieuw"
          className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Nieuwe spiegel
        </Link>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<ConfiguratiesContentSkeleton />}>
          <ConfiguratiesContent filter={f} page={p} view={v} />
        </Suspense>
      </HydrationBoundary>

    </div>
  )
}
