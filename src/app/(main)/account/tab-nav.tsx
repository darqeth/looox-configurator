import Link from 'next/link'

export function TabNav({ active }: { active: 'profiel' | 'collegas' }) {
  return (
    <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
      <Link
        href="/account"
        className={`px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
          active === 'profiel'
            ? 'bg-lx-text-primary text-white'
            : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
        }`}
      >
        Mijn profiel
      </Link>
      <Link
        href="/account/collegas"
        className={`px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
          active === 'collegas'
            ? 'bg-lx-text-primary text-white'
            : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
        }`}
      >
        Collega&apos;s
      </Link>
    </div>
  )
}
