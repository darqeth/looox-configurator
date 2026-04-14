import { Suspense } from 'react'
import { BestellingenContent, BestellingenContentSkeleton } from './bestellingen-content'

export default async function BestellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams

  return (
    <div className="p-4 sm:p-6 lg:p-7">

      {/* Header — rendert direct, geen DB queries nodig */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Bestellingen</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Overzicht van je offerteaanvragen en bestellingen</p>
      </div>

      {/* Lijst — streamt zodra DB query klaar is */}
      <Suspense fallback={<BestellingenContentSkeleton />}>
        <BestellingenContent page={page ?? '1'} />
      </Suspense>

    </div>
  )
}
