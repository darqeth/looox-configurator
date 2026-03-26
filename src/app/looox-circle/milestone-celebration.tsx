'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

type Milestone = {
  id: string
  title: string
  perk: string
  done: boolean
}

const STORAGE_KEY = 'lx_celebrated_milestones'

export default function MilestoneCelebration({ milestones }: { milestones: Milestone[] }) {
  const [celebrating, setCelebrating] = useState<Milestone | null>(null)
  const [queue, setQueue] = useState<Milestone[]>([])
  const launched = useRef(false)

  useEffect(() => {
    if (launched.current) return
    launched.current = true

    const seen: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    const newlyDone = milestones.filter(m => m.done && !seen.includes(m.id))

    if (newlyDone.length === 0) return

    // Sla ze allemaal direct op — zodat ze niet nogmaals getoond worden
    const updated = [...new Set([...seen, ...newlyDone.map(m => m.id)])]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    setQueue(newlyDone)
    setCelebrating(newlyDone[0])
  }, [milestones])

  useEffect(() => {
    if (!celebrating) return

    // Confetti burst
    let cancelled = false
    const end = Date.now() + 900

    const frame = () => {
      if (cancelled) return
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3D6B4F', '#A7C4B0', '#1C1C1E', '#ffffff'],
      })
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3D6B4F', '#A7C4B0', '#1C1C1E', '#ffffff'],
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)

    return () => { cancelled = true }
  }, [celebrating])

  function dismiss() {
    const remaining = queue.slice(1)
    if (remaining.length > 0) {
      setQueue(remaining)
      setCelebrating(remaining[0])
    } else {
      setCelebrating(null)
      setQueue([])
    }
  }

  if (!celebrating) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={dismiss} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto text-center px-8 py-8 animate-in fade-in zoom-in-95 duration-300">

          {/* Icoon */}
          <div className="w-16 h-16 rounded-full bg-lx-icon-bg flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>

          {/* Tekst */}
          <p className="text-[11px] font-bold text-lx-cta uppercase tracking-widest mb-2">Mijlpaal behaald</p>
          <h2 className="text-[20px] font-bold text-lx-text-primary mb-2">{celebrating.title}</h2>
          <p className="text-[13px] text-lx-text-secondary leading-relaxed mb-1">Je hebt een nieuwe mijlpaal bereikt!</p>
          <p className="text-[13px] text-lx-cta font-semibold mb-6">Voordeel: {celebrating.perk}</p>

          {/* Knop */}
          <button
            onClick={dismiss}
            className="w-full bg-lx-cta hover:bg-lx-cta-hover text-white text-[14px] font-semibold py-3 rounded-xl transition-colors"
          >
            {queue.length > 1 ? `Volgende (${queue.length - 1} meer)` : 'Doorgaan'}
          </button>
        </div>
      </div>
    </>
  )
}
