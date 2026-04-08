'use client'

import { useState, useTransition } from 'react'
import { deleteUser, generatePasswordResetLink, updateApprovalStatus } from '@/lib/actions/admin'

const statusConfig = {
  pending:  { label: 'Wacht op goedkeuring', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Goedgekeurd',          className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Afgewezen',            className: 'bg-red-50 text-red-600' },
}

export type UserRowProfile = {
  id: string
  full_name: string | null
  email: string | null
  company: string | null
  phone: string | null
  tier: string | null
  approval_status: string | null
  created_at: string | null
  price_factor: number | null
  price_factor_enabled: boolean | null
}

export function UserRow({
  profile,
  showActions = false,
  showApprove = false,
  isColleague = false,
  inviterName = null,
}: {
  profile: UserRowProfile
  showActions?: boolean
  showApprove?: boolean
  isColleague?: boolean
  inviterName?: string | null
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const status = statusConfig[profile.approval_status as keyof typeof statusConfig] ?? statusConfig.pending
  const date = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const firstLetter = profile.full_name?.charAt(0)?.toUpperCase() ?? '?'

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(profile.id)
      if (!result.success) {
        setError(result.error ?? 'Verwijderen mislukt.')
        setConfirmDelete(false)
      }
    })
  }

  function handleGenerateResetLink() {
    if (!profile.email) return
    startTransition(async () => {
      const result = await generatePasswordResetLink(profile.email!)
      if (result.error) {
        setError(result.error)
      } else {
        setResetLink(result.link ?? null)
      }
    })
  }

  function handleCopy() {
    if (!resetLink) return
    navigator.clipboard.writeText(resetLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0 text-lx-cta text-sm font-semibold">
          {firstLetter}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13.5px] font-semibold text-lx-text-primary">{profile.full_name ?? '—'}</p>
            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
              {status.label}
            </span>
            {isColleague && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                Collega
              </span>
            )}
            {(profile.price_factor ?? 1) > 1 && (
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                profile.price_factor_enabled
                  ? 'bg-lx-icon-bg text-lx-cta'
                  : 'bg-lx-panel-bg text-lx-text-secondary'
              }`}>
                ×{Number(profile.price_factor).toFixed(2)} consument{profile.price_factor_enabled ? '' : ' (uit)'}
              </span>
            )}
          </div>
          <p className="text-[12px] text-lx-text-secondary mt-0.5">
            {profile.company ?? '—'} · {profile.email ?? '—'}
            {profile.phone ? ` · ${profile.phone}` : ''}
          </p>
          {isColleague && inviterName && (
            <p className="text-[11px] text-lx-text-secondary mt-0.5 opacity-70">
              Uitgenodigd door {inviterName}
            </p>
          )}
          {error && (
            <p className="text-[11px] text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Datum */}
        <p className="text-[11.5px] text-lx-text-secondary flex-shrink-0 hidden sm:block">{date}</p>

        {/* Acties */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {showActions && (
            <>
              <button
                onClick={() => updateApprovalStatus(profile.id, 'approved')}
                disabled={isPending}
                className="bg-lx-cta hover:bg-lx-cta-hover text-white text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Goedkeuren
              </button>
              <button
                onClick={() => updateApprovalStatus(profile.id, 'rejected')}
                disabled={isPending}
                className="text-lx-text-secondary hover:text-red-600 hover:bg-red-50 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Afwijzen
              </button>
            </>
          )}

          {showApprove && (
            <button
              onClick={() => updateApprovalStatus(profile.id, 'approved')}
              disabled={isPending}
              className="text-lx-cta hover:bg-lx-icon-bg text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Alsnog goedkeuren
            </button>
          )}

          {/* Wachtwoord reset */}
          <button
            onClick={handleGenerateResetLink}
            disabled={isPending || !profile.email}
            title="Genereer wachtwoord-resetlink"
            className="text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg p-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </button>

          {/* Verwijderen */}
          {!confirmDelete ? (
            <button
              onClick={() => { setConfirmDelete(true); setError(null) }}
              disabled={isPending}
              title="Gebruiker verwijderen"
              className="text-lx-text-secondary hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] text-red-600 font-medium">Zeker?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? '...' : 'Verwijderen'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="text-lx-text-secondary hover:text-lx-text-primary text-[12px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              >
                Annuleren
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reset-link modal */}
      {resetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setResetLink(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-lx-text-primary mb-1">Wachtwoord resetlink</h3>
            <p className="text-[12.5px] text-lx-text-secondary mb-4">
              Stuur deze link handmatig naar <span className="font-medium text-lx-text-primary">{profile.email}</span>. De link is eenmalig geldig.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={resetLink}
                className="flex-1 min-w-0 text-[11.5px] text-lx-text-secondary bg-lx-panel-bg border border-black/8 rounded-xl px-3 py-2 focus:outline-none"
                onFocus={e => e.target.select()}
              />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 bg-lx-cta hover:bg-lx-cta-hover text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-xl transition-colors"
              >
                {copied ? 'Gekopieerd!' : 'Kopiëren'}
              </button>
            </div>
            <button
              onClick={() => setResetLink(null)}
              className="mt-4 w-full text-center text-[12.5px] text-lx-text-secondary hover:text-lx-text-primary transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  )
}
