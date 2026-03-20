'use client'

import { useState, useTransition } from 'react'
import { createNotification } from '@/lib/actions/notifications'

export default function CreateNotificationForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<'info' | 'feature' | 'promo'>('info')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      await createNotification({ title, body, type })
      setTitle('')
      setBody('')
      setType('info')
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
      <p className="text-[13.5px] font-semibold text-lx-text-primary">Nieuwe melding aanmaken</p>

      {/* Type */}
      <div className="flex gap-2">
        {(['info', 'feature', 'promo'] as const).map((t) => {
          const labels = { info: 'Info', feature: 'Nieuw', promo: 'Actie' }
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${
                type === t
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
              }`}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Titel */}
      <div>
        <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
          Titel <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Bijv. Black Friday — 15% korting deze week"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          required
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
          Omschrijving <span className="text-lx-text-muted font-normal">(optioneel, max 2 regels)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Korte toelichting bij de melding…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors resize-none"
        />
        <p className="text-[10.5px] text-lx-text-muted mt-1 text-right">{body.length}/200</p>
      </div>

      <button
        type="submit"
        disabled={!title.trim() || isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-40 transition-all"
      >
        {isPending ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        ) : done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
        )}
        {done ? 'Aangemaakt!' : isPending ? 'Aanmaken…' : 'Melding aanmaken'}
      </button>
    </form>
  )
}
