export default function AdminInstellingenLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-36 bg-lx-divider rounded mb-2" />
        <div className="h-4 w-52 bg-lx-divider rounded" />
      </div>

      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-3">
            <div className="h-4 w-40 bg-lx-divider rounded" />
            <div className="h-3 w-64 bg-lx-divider rounded" />
            <div className="h-10 w-full bg-lx-divider rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
