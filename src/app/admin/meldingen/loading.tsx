export default function MeldingenLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-24 bg-lx-divider rounded-lg" />
        <div className="h-4 w-44 bg-lx-divider rounded-lg" />
      </div>

      {/* Formulier skeleton */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 mb-5 space-y-4 max-w-lg">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 bg-lx-divider rounded" />
            <div className="h-9 w-full bg-lx-divider rounded-xl" />
          </div>
        ))}
        <div className="h-9 w-28 bg-lx-divider rounded-xl" />
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-5 py-4">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-lx-divider rounded" />
              <div className="h-3 w-72 bg-lx-divider rounded" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-lx-divider" />
          </div>
        ))}
      </div>
    </div>
  )
}
