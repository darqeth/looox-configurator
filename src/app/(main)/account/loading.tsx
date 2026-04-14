export default function AccountLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 animate-pulse">
      <div className="mb-6 space-y-1.5">
        <div className="h-6 w-24 bg-lx-divider rounded-lg" />
      </div>
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-6 space-y-5 max-w-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-lx-divider" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-lx-divider rounded" />
            <div className="h-3 w-20 bg-lx-divider rounded" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 bg-lx-divider rounded" />
            <div className="h-9 w-full bg-lx-divider rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
