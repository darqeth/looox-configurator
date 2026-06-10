'use client'

import { useEffect, useState } from 'react'

// Mini-toast zonder dependencies (audit U8): één feedback-patroon voor
// optimistic-update-rollbacks en succesmeldingen, ter vervanging van
// alert()/confirm() en stille fouten.

export type ToastItem = {
  id: number
  message: string
  type: 'error' | 'success'
}

type Listener = (t: ToastItem) => void
let listeners: Listener[] = []
let nextId = 1

export function toast(message: string, type: ToastItem['type'] = 'error') {
  const item: ToastItem = { id: nextId++, message, type }
  for (const l of listeners) l(item)
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item])
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      }, 5000)
    }
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 inset-x-0 z-[300] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-2.5 max-w-md w-fit px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white ${
            item.type === 'error' ? 'bg-red-600' : 'bg-lx-text-primary'
          }`}
        >
          {item.type === 'error' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {item.message}
        </div>
      ))}
    </div>
  )
}
