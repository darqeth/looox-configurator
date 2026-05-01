'use client'

import { useState, useTransition } from 'react'
import { createChangelog } from '@/lib/actions/changelogs'

export default function CreateChangelogForm() {
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      await createChangelog({ version, title, body, sendEmail })
      setVersion('')
      setTitle('')
      setBody('')
      setSendEmail(false)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
      <p className="text-[13.5px] font-semibold text-lx-text-primary">Nieuwe update plaatsen</p>

      {/* Versie + titel */}
      <div className="flex gap-3">
        <div className="w-28 flex-shrink-0">
          <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
            Versie
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            maxLength={12}
            placeholder="v1.2"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
            Titel <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Bijv. Suspense streaming op alle pagina's"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
            required
          />
        </div>
      </div>

      {/* Preview */}
      {(version.trim() || title.trim()) && (
        <p className="text-[11.5px] text-lx-text-muted -mt-1">
          Wordt getoond als: <span className="font-medium text-lx-text-secondary">
            {version.trim() ? `${version.trim()} — ` : ''}{title.trim() || '…'}
          </span>
        </p>
      )}

      {/* Body */}
      <div>
        <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
          Toelichting <span className="text-lx-text-muted font-normal">(optioneel)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder="Korte omschrijving van de wijzigingen…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors resize-none"
        />
        <p className="text-[10.5px] text-lx-text-muted mt-1 text-right">{body.length}/400</p>
      </div>

      {/* E-mail notificatie */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sendEmail}
          onChange={e => setSendEmail(e.target.checked)}
          className="w-4 h-4 rounded accent-lx-cta cursor-pointer"
        />
        <span className="text-[13px] text-lx-text-secondary">
          Stuur e-mailnotificatie naar marketing@rmsanitair.nl
        </span>
      </label>

      <button
        type="submit"
        disabled={!title.trim() || isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-60 transition-all"
      >
        {isPending ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        ) : done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
        )}
        {done ? 'Geplaatst!' : isPending ? 'Plaatsen…' : 'Update plaatsen'}
      </button>
    </form>
  )
}
