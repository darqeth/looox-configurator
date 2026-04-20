'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateApprovalStatus } from '@/lib/actions/admin'
import { UserEditModal } from './user-modal'

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
  korting: number | null
  is_international: boolean | null
  company_id: string | null
  member?: {
    role: string
    can_order: boolean
    can_see_purchase_prices: boolean
    can_configure: boolean
    own_configs_only: boolean
  } | null
}

export function UserRow({
  profile,
  showActions = false,
  showApprove = false,
  isColleague = false,
  inviterName = null,
  companies = [],
}: {
  profile: UserRowProfile
  showActions?: boolean
  showApprove?: boolean
  isColleague?: boolean
  inviterName?: string | null
  companies?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [localKorting] = useState(profile.korting)
  const [localIsInternational] = useState(profile.is_international ?? false)

  const status = statusConfig[profile.approval_status as keyof typeof statusConfig] ?? statusConfig.pending
  const date = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const firstLetter = profile.full_name?.charAt(0)?.toUpperCase() ?? '?'

  function handleApproval(s: 'approved' | 'rejected') {
    startTransition(async () => {
      await updateApprovalStatus(profile.id, s)
      router.refresh()
    })
  }

  return (
    <>
      <div
        className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-black/[0.12] hover:shadow-md transition-all duration-150"
        onClick={() => setModalOpen(true)}
      >
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
            {localKorting != null && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-lx-icon-bg text-lx-cta">
                Korting {localKorting}%
              </span>
            )}
            {localIsInternational && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                Buitenland +5%
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
        </div>

        {/* Datum */}
        <p className="text-[11.5px] text-lx-text-secondary flex-shrink-0 hidden sm:block">{date}</p>

        {/* Snelle acties — klik niet door naar modal */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {showActions && (
            <>
              <button
                onClick={() => handleApproval('approved')}
                disabled={isPending}
                className="bg-lx-cta hover:bg-lx-cta-hover text-white text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Goedkeuren
              </button>
              <button
                onClick={() => handleApproval('rejected')}
                disabled={isPending}
                className="text-lx-text-secondary hover:text-red-600 hover:bg-red-50 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Afwijzen
              </button>
            </>
          )}
          {showApprove && (
            <button
              onClick={() => handleApproval('approved')}
              disabled={isPending}
              className="text-lx-cta hover:bg-lx-icon-bg text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Alsnog goedkeuren
            </button>
          )}
          {/* Pijl-indicator dat rij klikbaar is */}
          <div className="text-lx-text-secondary/40 pl-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UserEditModal
          profile={profile}
          companies={companies}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
