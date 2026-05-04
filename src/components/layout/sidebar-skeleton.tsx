export default function SidebarSkeleton() {
  return (
    <>
      {/* Desktop sidebar skeleton */}
      <aside className="hidden lg:flex w-60 min-h-screen fixed top-0 left-0 bottom-0 z-40 flex-col bg-lx-sidebar-bg">
        {/* Logo area */}
        <div className="px-5 py-6 border-b border-white/8 flex flex-col items-center gap-2">
          <div className="h-14 w-32 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-2.5 w-28 rounded bg-white/10 animate-pulse" />
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {/* Search button placeholder */}
          <div className="h-9 w-full rounded-xl bg-white/10 animate-pulse mb-2" />
          {/* Section label */}
          <div className="h-2 w-10 rounded bg-white/10 animate-pulse px-3 mb-2 mt-1 ml-3" />
          {/* Nav items */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-xl bg-white/10 animate-pulse" />
          ))}
        </div>

        {/* Circle widget */}
        <div className="px-3 pb-3">
          <div className="rounded-xl bg-white/10 animate-pulse p-3 h-20" />
        </div>

        {/* CTA button */}
        <div className="px-3 pb-3">
          <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
        </div>

        {/* User section */}
        <div className="border-t border-white/8 px-4 py-3.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/10 animate-pulse" />
        </div>
      </aside>

      {/* Mobile top bar skeleton */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white border-b border-black/7">
        <div className="w-8 h-8 rounded bg-black/8 animate-pulse" />
        <div className="h-14 w-24 rounded bg-black/8 animate-pulse" />
        <div className="w-8 h-8 rounded bg-black/8 animate-pulse" />
      </div>
    </>
  )
}
