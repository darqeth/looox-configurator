'use client'

import { useState, useTransition } from 'react'
import { updateNotificationEmails } from '@/lib/actions/settings'

export default function NotificatieEmailsForm({ initialEmails }: { initialEmails: string[] }) {
  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [newEmail, setNewEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function add() {
    const e = newEmail.trim().toLowerCase()
    if (!e || emails.includes(e)) return
    setEmails(prev => [...prev, e])
    setNewEmail('')
    setSaved(false)
  }

  function remove(email: string) {
    setEmails(prev => prev.filter(e => e !== email))
    setSaved(false)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateNotificationEmails(emails)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Huidig lijst */}
      <div className="space-y-2">
        {emails.map(email => (
          <div key={email} className="flex items-center gap-3 px-3.5 py-2.5 bg-lx-panel-bg rounded-xl border border-black/8">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <span className="flex-1 text-[13px] text-lx-text-primary font-medium">{email}</span>
            <button
              onClick={() => remove(email)}
              disabled={emails.length <= 1}
              className="text-lx-text-muted hover:text-red-500 disabled:opacity-30 transition-colors"
              title="Verwijderen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
        {emails.length === 0 && (
          <p className="text-[12.5px] text-lx-text-muted italic px-1">Geen e-mailadressen — voeg er minimaal één toe.</p>
        )}
      </div>

      {/* Nieuw adres toevoegen */}
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="nieuw@voorbeeld.nl"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
        />
        <button
          onClick={add}
          disabled={!newEmail.trim()}
          className="px-4 py-2.5 rounded-xl bg-lx-panel-bg border border-black/12 text-[13px] font-semibold text-lx-text-secondary hover:border-lx-cta/50 hover:text-lx-cta disabled:opacity-40 transition-all"
        >
          Toevoegen
        </button>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      {/* Opslaan */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={isPending || emails.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-40 transition-all"
        >
          {isPending && (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          )}
          {isPending ? 'Opslaan…' : 'Opslaan'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[12.5px] text-lx-cta font-medium">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Opgeslagen
          </span>
        )}
      </div>
    </div>
  )
}
