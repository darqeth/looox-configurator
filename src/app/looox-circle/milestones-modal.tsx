'use client'

import { useState, useEffect } from 'react'

type Milestone = {
  id: string
  title: string
  description: string
  perk: string
  goal: number
  type: 'configs' | 'orders'
  current: number
  pct: number
  done: boolean
}

export default function MilestonesModal({ milestones }: { milestones: Milestone[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const done = milestones.filter(m => m.done)
  const active = milestones.filter(m => !m.done && m.current > 0)
  const upcoming = milestones.filter(m => !m.done && m.current === 0)

  function Section({ title, items }: { title: string; items: Milestone[] }) {
    if (items.length === 0) return null
    return (
      <div className="mb-5">
        <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-wide mb-2.5">{title}</p>
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className={`rounded-[12px] p-3.5 border ${
              m.done ? 'bg-white border-lx-cta/20' : 'bg-lx-panel-bg border-lx-divider'
            }`}>
              <div className="flex items-start gap-2.5">
                {m.done ? (
                  <span className="w-4 h-4 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                ) : (
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    m.current > 0 ? 'border-lx-cta/40' : 'border-lx-border'
                  }`} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold ${m.done ? 'text-lx-text-primary' : m.current > 0 ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
                    {m.title}
                  </p>
                  <p className={`text-[11.5px] mt-0.5 ${m.done || m.current > 0 ? 'text-lx-text-secondary' : 'text-lx-placeholder'}`}>
                    {m.description}
                  </p>
                  {!m.done && m.current > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10.5px] text-lx-text-secondary">{m.current} van {m.goal}</span>
                        <span className="text-[10.5px] text-lx-text-secondary">{m.pct}%</span>
                      </div>
                      <div className="h-1 bg-lx-divider rounded-full overflow-hidden">
                        <div className="h-full bg-lx-panel-bg rounded-full" style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  )}
                  <p className={`text-[11px] mt-1.5 ${m.done ? 'text-lx-cta font-medium' : 'text-lx-placeholder italic'}`}>
                    Voordeel: {m.perk}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors"
      >
        Alle mijlpalen →
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto">

              <div className="flex items-center justify-between px-6 py-4 border-b border-lx-divider flex-shrink-0">
                <div>
                  <h2 className="text-[15px] font-bold text-lx-text-primary">Alle mijlpalen</h2>
                  <p className="text-[12px] text-lx-text-secondary mt-0.5">
                    {done.length} behaald · {active.length} actief · {upcoming.length} nog te gaan
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4">
                <Section title="Behaald" items={done} />
                <Section title="In uitvoering" items={active} />
                <Section title="Nog te behalen" items={upcoming} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
