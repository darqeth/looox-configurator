'use client'

import { useTransition } from 'react'
import { deleteDownload, moveDownload } from '@/lib/actions/downloads'

export function DeleteDownloadButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteDownload(id))}
      disabled={isPending}
      title="Verwijderen"
      className="flex-shrink-0 w-7 h-7 rounded-lg text-lx-text-secondary hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  )
}

export function MoveDownloadButtons({ id, isFirst, isLast }: { id: string; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => startTransition(() => moveDownload(id, 'up'))}
        disabled={isPending || isFirst}
        title="Omhoog"
        className="w-6 h-5 rounded text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg flex items-center justify-center transition-all disabled:opacity-25 cursor-pointer"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
      <button
        onClick={() => startTransition(() => moveDownload(id, 'down'))}
        disabled={isPending || isLast}
        title="Omlaag"
        className="w-6 h-5 rounded text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg flex items-center justify-center transition-all disabled:opacity-25 cursor-pointer"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
  )
}
