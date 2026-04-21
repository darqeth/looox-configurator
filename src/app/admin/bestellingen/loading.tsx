export default function AdminBestellingenLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-6 w-36 bg-lx-divider rounded mb-2" />
        <div className="h-4 w-24 bg-lx-divider rounded" />
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-black/6 shadow-sm px-3 py-2.5 text-center space-y-1.5">
            <div className="h-6 w-8 bg-lx-divider rounded mx-auto" />
            <div className="h-2.5 w-16 bg-lx-divider rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Zoekveld */}
      <div className="h-10 w-full bg-white rounded-xl border border-black/10 shadow-sm mb-4" />

      {/* Tabel */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="hidden lg:grid grid-cols-[36px_1fr_1fr_80px_96px_160px] gap-4 items-center px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
          <div />
          <div className="h-2.5 bg-lx-divider rounded" />
          <div className="h-2.5 bg-lx-divider rounded" />
          <div className="h-2.5 bg-lx-divider rounded" />
          <div className="h-2.5 bg-lx-divider rounded" />
          <div className="h-2.5 bg-lx-divider rounded" />
        </div>
        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 bg-lx-divider rounded" />
                <div className="h-3 w-20 bg-lx-divider rounded" />
              </div>
              <div className="hidden lg:block flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-lx-divider rounded" />
                <div className="h-3 w-24 bg-lx-divider rounded" />
              </div>
              <div className="hidden lg:block w-20 flex-shrink-0 space-y-1 text-right">
                <div className="h-3.5 w-full bg-lx-divider rounded" />
                <div className="h-3 w-12 bg-lx-divider rounded ml-auto" />
              </div>
              <div className="hidden lg:flex w-[160px] flex-shrink-0 justify-center">
                <div className="h-7 w-28 bg-lx-divider rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
