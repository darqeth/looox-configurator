'use client'

import { useState, useEffect } from 'react'

type Changelog = {
  id: string
  title: string
  body: string
  published_at: string
}

export default function ChangelogModal({ changelogs }: { changelogs: Changelog[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors"
      >
        Alle updates →
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-lx-divider flex-shrink-0">
                <div>
                  <h2 className="text-[15px] font-bold text-lx-text-primary">Alle updates</h2>
                  <p className="text-[12px] text-lx-text-secondary mt-0.5">Overzicht van alle wijzigingen</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Lijst */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                {changelogs.map((item) => {
                  const parts = item.title.split(' — ')
                  const version = parts.length > 1 && parts[0].startsWith('v') ? parts[0] : null
                  const title = version ? parts.slice(1).join(' — ') : item.title
                  const date = new Date(item.published_at).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <span className="text-[10px] font-bold bg-lx-icon-bg text-lx-cta px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 tabular-nums">
                        {version ?? '•'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] font-semibold text-lx-text-primary">{title}</p>
                          <span className="text-[11px] text-lx-placeholder flex-shrink-0">{date}</span>
                        </div>
                        {item.body && (
                          <p className="text-[12.5px] text-lx-text-secondary mt-1 leading-relaxed">{item.body}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
