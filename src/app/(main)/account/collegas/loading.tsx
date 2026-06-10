import { TabNav } from '../tab-nav'

// Eigen skeleton die de echte pagina spiegelt (tabs + ledenlijst) —
// voorheen leunde deze route op de generieke account-skeleton.
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
      <TabNav active="collegas" />
      <div className="animate-pulse mt-4">
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-lx-divider">
            <div className="h-4 w-40 bg-lx-divider rounded" />
          </div>
          <div className="divide-y divide-lx-divider">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-lx-divider flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 bg-lx-divider rounded" />
                  <div className="h-3 w-48 bg-lx-divider rounded" />
                </div>
                <div className="h-7 w-20 bg-lx-divider rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
