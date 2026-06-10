export default function AdminProductenLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-44 bg-lx-divider rounded mb-2" />
        <div className="h-4 w-56 bg-lx-divider rounded" />
      </div>

      {/* Shape tabs */}
      <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-lx-divider rounded-lg" />
        ))}
      </div>

      {/* Prijstabel */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-lx-divider">
          <div className="h-3.5 w-32 bg-lx-divider rounded" />
        </div>
        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-3.5 w-36 bg-lx-divider rounded flex-1" />
              <div className="h-3.5 w-16 bg-lx-divider rounded" />
              <div className="h-3.5 w-16 bg-lx-divider rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
