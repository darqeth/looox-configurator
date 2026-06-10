'use client'

import { useState, useTransition } from 'react'
import { approveOrder, rejectOrder } from '@/lib/actions/order-approval'
import { toast } from '@/components/toast'

export function OrderApprovalButtons({
  orderId,
  orderNumber,
  drawings,
}: {
  orderId: string
  orderNumber: string
  drawings: { file_url: string; file_name: string }[]
}) {
  const [done, setDone] = useState<'goedgekeurd' | 'afgekeurd' | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [reden, setReden] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (done === 'goedgekeurd') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span className="text-[12.5px] font-semibold text-[#15803D]">Tekeningen goedgekeurd</span>
      </div>
    )
  }

  if (done === 'afgekeurd') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        <span className="text-[12.5px] font-semibold text-red-600">Tekeningen afgekeurd — LoooX neemt contact op</span>
      </div>
    )
  }

  return (
    <>
      <div className="mt-3 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
        <div className="flex items-start gap-2.5 mb-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-[12.5px] font-bold text-[#92400E]">Technische tekeningen ter goedkeuring</p>
            <p className="text-[11.5px] text-[#B45309] mt-0.5">Bestelling {orderNumber} — bekijk de tekeningen en geef je goedkeuring</p>
          </div>
        </div>

        {/* PDF links */}
        <div className="space-y-1.5 mb-3">
          {drawings.map(d => (
            <a
              key={d.file_url}
              href={d.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#FDE68A] hover:border-[#B45309] transition-colors group"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-[12px] font-medium text-[#92400E] group-hover:text-[#78350F] truncate">{d.file_name}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto flex-shrink-0">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ))}
        </div>

        {error && (
          <p className="text-[12px] text-red-600 mb-2">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              setError('')
              // Optimistic (audit 2.6): direct als goedgekeurd tonen,
              // rollback + toast als de server weigert
              setDone('goedgekeurd')
              startTransition(async () => {
                const result = await approveOrder(orderId)
                if (!result.success) {
                  setDone(null)
                  toast(result.error ?? 'Goedkeuren mislukt. Probeer het opnieuw.')
                }
              })
            }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-lx-cta text-white text-[12px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-60"
          >
            {isPending ? 'Bezig…' : 'Goedkeuren'}
          </button>
          <button
            onClick={() => { setShowRejectModal(true); setError('') }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-[12px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Afkeuren
          </button>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl border border-black/8 shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-lx-divider">
              <h2 className="text-[15px] font-bold text-lx-text-primary">Tekeningen afkeuren</h2>
              <button onClick={() => setShowRejectModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[13px] text-lx-text-secondary">Geef aan wat er gewijzigd moet worden. LoooX neemt daarna contact met je op.</p>
              <textarea
                value={reden}
                onChange={e => setReden(e.target.value)}
                placeholder="Beschrijf de gewenste wijziging..."
                rows={4}
                className="w-full text-[13px] border border-black/12 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta placeholder:text-lx-text-secondary/60"
              />
              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2.5 px-5 pb-5">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-[13px] font-semibold text-lx-text-primary hover:bg-lx-panel-bg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  if (!reden.trim()) { setError('Vul een reden in'); return }
                  setError('')
                  startTransition(async () => {
                    const result = await rejectOrder(orderId, reden.trim())
                    if (result.success) { setDone('afgekeurd'); setShowRejectModal(false) }
                    else setError(result.error ?? 'Er ging iets mis')
                  })
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Bezig…' : 'Afkeuren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
