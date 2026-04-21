export default function AdminConfiguratiesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      {/* Header */}
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-44 bg-lx-divider rounded-lg" />
        <div className="h-4 w-40 bg-lx-divider rounded-lg" />
      </div>

      {/* Zoekbalk + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="h-10 flex-1 max-w-sm bg-white rounded-xl border border-black/10 shadow-sm" />
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {[48, 72, 96].map((w, i) => (
            <div key={i} className="h-7 rounded-lg bg-lx-divider" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        {/* Kolomkoppen — tablet+ */}
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
          <div className="w-9 flex-shrink-0" />
          <div className="flex-1 h-2.5 bg-lx-divider rounded" />
          <div className="hidden lg:block w-[148px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[156px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[88px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[96px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-4 flex-shrink-0" />
        </div>

        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3.5 w-44 bg-lx-divider rounded" />
                <div className="h-3 w-32 bg-lx-divider rounded" />
              </div>
              <div className="hidden lg:block w-[148px] flex-shrink-0 space-y-1.5">
                <div className="h-3.5 w-20 bg-lx-divider rounded" />
                <div className="h-3 w-16 bg-lx-divider rounded" />
              </div>
              <div className="hidden sm:block w-[156px] flex-shrink-0 space-y-1.5">
                <div className="h-3.5 w-24 bg-lx-divider rounded" />
                <div className="h-3 w-20 bg-lx-divider rounded" />
              </div>
              <div className="hidden sm:block w-[88px] flex-shrink-0 text-right space-y-1.5">
                <div className="h-3.5 w-full bg-lx-divider rounded" />
              </div>
              <div className="hidden sm:flex w-[96px] flex-shrink-0 justify-center">
                <div className="h-6 w-20 bg-lx-divider rounded-lg" />
              </div>
              <div className="w-4 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
