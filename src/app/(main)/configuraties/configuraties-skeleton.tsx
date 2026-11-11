// Losse, lichte skeleton (geen 'use client'): het laadscherm hoeft zo niet te
// wachten op de zware lijstcode (performance-audit 2026-11, B4).
export function ConfiguratiesContentSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Member tabs placeholder */}
      <div className="flex gap-1 mb-3 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        <div className="h-7 w-32 rounded-lg bg-lx-divider" />
        <div className="h-7 w-20 rounded-lg bg-lx-divider" />
      </div>

      {/* Product tabs (Spiegels / Alle) */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        <div className="h-7 w-20 rounded-lg bg-lx-text-primary/10" />
        <div className="h-7 w-14 rounded-lg bg-lx-divider" />
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
          <div className="w-9 flex-shrink-0" />
          <div className="flex-1 h-2.5 bg-lx-divider rounded" />
          <div className="hidden lg:block w-[152px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[92px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[96px] flex-shrink-0" />
          <div className="w-8 flex-shrink-0" />
        </div>
        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 bg-lx-divider rounded" />
                <div className="h-3 w-32 bg-lx-divider rounded" />
              </div>
              <div className="hidden lg:block w-[152px] flex-shrink-0 space-y-1.5">
                <div className="h-3.5 w-20 bg-lx-divider rounded" />
                <div className="h-3 w-16 bg-lx-divider rounded" />
              </div>
              <div className="hidden sm:block w-[92px] flex-shrink-0 space-y-1">
                <div className="h-3.5 w-full bg-lx-divider rounded" />
                <div className="h-3 w-12 bg-lx-divider rounded ml-auto" />
              </div>
              <div className="hidden sm:block w-[96px] flex-shrink-0">
                <div className="h-8 w-full bg-lx-divider rounded-xl" />
              </div>
              <div className="w-[68px] flex-shrink-0 flex justify-end gap-1">
                <div className="w-7 h-7 rounded-lg bg-lx-divider" />
                <div className="w-8 h-8 rounded-lg bg-lx-divider" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-[12px] text-lx-text-muted">Jouw data aan het ophalen…</p>
    </div>
  )
}
