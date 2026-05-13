import { BestellingenContent } from './bestellingen-content'

export default async function BestellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const { page, view } = await searchParams

  return (
    <div className="p-4 sm:p-6 lg:p-7 overflow-x-hidden">

      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Bestellingen</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Overzicht van je offerteaanvragen en bestellingen</p>
      </div>

      <BestellingenContent page={page ?? '1'} view={view ?? ''} />

    </div>
  )
}
