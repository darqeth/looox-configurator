'use client'

import { useTransition } from 'react'
import { deleteNotification } from '@/lib/actions/notifications'

export default function DeleteNotificationButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteNotification(id))}
      disabled={isPending}
      title="Verwijderen"
      className="flex-shrink-0 w-7 h-7 rounded-lg text-lx-text-secondary hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-40"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  )
}
