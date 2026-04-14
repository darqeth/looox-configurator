export default function LooooXCircleLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-32 bg-lx-divider rounded-lg" />
        <div className="h-4 w-56 bg-lx-divider rounded-lg" />
      </div>

      {/* Streak card */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lx-divider" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 bg-lx-divider rounded" />
            <div className="h-3 w-40 bg-lx-divider rounded" />
          </div>
        </div>
      </div>

      {/* Milestone cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lx-divider" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-lx-divider rounded" />
                <div className="h-3 w-20 bg-lx-divider rounded" />
              </div>
            </div>
            <div className="h-2 w-full bg-lx-divider rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
