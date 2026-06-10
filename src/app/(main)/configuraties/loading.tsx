import { ConfiguratiesContentSkeleton } from './configuraties-content'

// Zelfde skeleton als de content-component zelf gebruikt — voorkomt het
// "dubbele skeleton"-effect waarbij een generieke kaarten-grid werd
// vervangen door de echte lijst-layout.
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Configuraties</h1>
          <p className="text-[13px] text-lx-text-secondary mt-0.5">Jouw opgeslagen spiegelconfiguraties</p>
        </div>
        <div className="h-10 w-36 bg-white rounded-xl animate-pulse" />
      </div>
      <ConfiguratiesContentSkeleton />
    </div>
  )
}
