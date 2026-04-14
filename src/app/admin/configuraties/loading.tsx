export default function AdminConfiguratiesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-48 bg-lx-divider rounded-lg" />
        <div className="h-4 w-36 bg-lx-divider rounded-lg" />
      </div>

      {/* Zoekbalk + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="h-10 w-72 bg-lx-divider rounded-xl" />
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {[48, 72, 88, 64].map((w, i) => (
            <div key={i} className="h-7 rounded-lg bg-lx-divider" style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-44 bg-lx-divider rounded" />
              <div className="h-3 w-64 bg-lx-divider rounded" />
            </div>
            <div className="h-3 w-24 bg-lx-divider rounded" />
            <div className="h-6 w-20 rounded-lg bg-lx-divider" />
          </div>
        ))}
      </div>
    </div>
  )
}
