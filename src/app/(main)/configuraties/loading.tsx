export default function ConfiguratiesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-36 bg-lx-divider rounded-lg" />
          <div className="h-4 w-52 bg-lx-divider rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-lx-divider rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {[72, 88, 72].map((w, i) => (
          <div key={i} className="h-7 rounded-lg bg-lx-divider" style={{ width: w }} />
        ))}
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-lx-divider rounded" />
              <div className="h-3 w-72 bg-lx-divider rounded" />
            </div>
            <div className="w-16 space-y-1">
              <div className="h-4 w-full bg-lx-divider rounded" />
              <div className="h-3 w-10 bg-lx-divider rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-lx-divider" />
              <div className="w-7 h-7 rounded-lg bg-lx-divider" />
              <div className="w-16 h-7 rounded-lg bg-lx-divider" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
