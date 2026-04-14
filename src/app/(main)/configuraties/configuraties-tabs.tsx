'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

interface Tab {
  key: string
  label: string
  count: number
}

export default function ConfiguratiesTabs({ tabs, currentFilter }: { tabs: Tab[]; currentFilter: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleTab(key: string) {
    startTransition(() => {
      router.push(key ? `/configuraties?filter=${key}` : '/configuraties')
    })
  }

  return (
    <div
      className={`flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}
    >
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => handleTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              isActive
                ? 'bg-lx-text-primary text-white'
                : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
