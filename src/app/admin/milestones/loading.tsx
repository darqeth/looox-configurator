export default function MilestonesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-28 bg-lx-divider rounded-lg" />
        <div className="h-4 w-52 bg-lx-divider rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 bg-lx-divider rounded" />
              <div className="h-9 w-full bg-lx-divider rounded-xl" />
            </div>
          ))}
          <div className="h-9 w-28 bg-lx-divider rounded-xl" />
        </div>

        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 bg-lx-divider rounded" />
                <div className="h-3 w-24 bg-lx-divider rounded" />
              </div>
              <div className="w-7 h-7 rounded-lg bg-lx-divider" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
