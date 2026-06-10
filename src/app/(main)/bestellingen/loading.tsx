import { BestellingenContentSkeleton } from './bestellingen-content'

// Zelfde skeleton als de content-component zelf gebruikt — voorkomt het
// "dubbele skeleton"-effect waarbij een generieke kaarten-grid werd
// vervangen door de echte tabel-layout.
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Bestellingen</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Overzicht van je offerteaanvragen en bestellingen</p>
      </div>
      <BestellingenContentSkeleton />
    </div>
  )
}
