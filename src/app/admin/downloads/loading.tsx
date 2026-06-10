export default function AdminDownloadsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-36 bg-lx-divider rounded mb-2" />
        <div className="h-4 w-52 bg-lx-divider rounded" />
      </div>

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-44 bg-lx-divider rounded" />
                <div className="h-3 w-24 bg-lx-divider rounded" />
              </div>
              <div className="h-7 w-20 bg-lx-divider rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
