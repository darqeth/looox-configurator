'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function MeldingenTabs({ active }: { active: 'meldingen' | 'updates' }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const tabs = [
    { key: 'meldingen', label: 'Meldingen' },
    { key: 'updates',   label: 'Updates' },
  ] as const

  return (
    <div className={`flex gap-1 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit mb-7 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => startTransition(() => router.push(tab.key === 'meldingen' ? '/admin/meldingen' : '/admin/meldingen?tab=updates'))}
          className={`px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
            active === tab.key
              ? 'bg-lx-text-primary text-white'
              : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
