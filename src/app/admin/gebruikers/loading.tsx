export default function GebruikersLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-28 bg-lx-divider rounded-lg" />
        <div className="h-4 w-48 bg-lx-divider rounded-lg" />
      </div>

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-lx-divider flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 bg-lx-divider rounded" />
              <div className="h-3 w-56 bg-lx-divider rounded" />
            </div>
            <div className="h-6 w-20 rounded-lg bg-lx-divider" />
            <div className="w-7 h-7 rounded-lg bg-lx-divider" />
          </div>
        ))}
      </div>
    </div>
  )
}
