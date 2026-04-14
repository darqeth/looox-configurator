export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-44 bg-lx-divider rounded-lg" />
          <div className="h-4 w-32 bg-lx-divider rounded-lg" />
        </div>
        <div className="w-9 h-9 rounded-xl bg-lx-divider" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm p-4 space-y-2">
            <div className="h-3 w-20 bg-lx-divider rounded" />
            <div className="h-7 w-12 bg-lx-divider rounded" />
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent configs — neemt 2 kolommen */}
        <div className="lg:col-span-2 bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-3">
          <div className="h-4 w-36 bg-lx-divider rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-lx-divider rounded" />
                <div className="h-3 w-56 bg-lx-divider rounded" />
              </div>
              <div className="h-3 w-12 bg-lx-divider rounded" />
            </div>
          ))}
        </div>

        {/* Sidebar widget */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-4">
          <div className="h-4 w-24 bg-lx-divider rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-32 bg-lx-divider rounded" />
                <div className="h-2 w-full bg-lx-divider rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
