import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { fetchOrders } from '@/lib/queries/fetch-orders'
import { BestellingenContent } from './bestellingen-content'

export default async function BestellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const { page, view } = await searchParams
  const p = page ?? '1'
  const v = view ?? ''

  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['orders', { view: v, page: p }],
    queryFn: () => fetchOrders({ view: v, page: Number(p) }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="p-4 sm:p-6 lg:p-7 overflow-x-hidden">

        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Bestellingen</h1>
          <p className="text-[13px] text-lx-text-secondary mt-0.5">Overzicht van je offerteaanvragen en bestellingen</p>
        </div>

        <BestellingenContent page={p} view={v} />

      </div>
    </HydrationBoundary>
  )
}
