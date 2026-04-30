'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  updateKorting,
  toggleInternational,
  toggleGroothandel,
  linkUserToCompany,
  updateMemberPermissions,
  generatePasswordResetLink,
  deleteUser,
  updateApprovalStatus,
  updateSubAdmin,
  updateSuperAdmin,
} from '@/lib/actions/admin'
import type { UserRowProfile } from './user-row'

export function UserEditModal({
  profile,
  companies,
  onClose,
  currentUserIsAdmin = false,
}: {
  profile: UserRowProfile
  companies: { id: string; name: string }[]
  onClose: () => void
  currentUserIsAdmin?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Korting
  const [korting, setKorting] = useState(String(profile.korting ?? 50))
  const [kortingEditing, setKortingEditing] = useState(false)

  // Internationaal
  const [isInternational, setIsInternational] = useState(profile.is_international ?? false)
  const [isGroothandel, setIsGroothandel] = useState(profile.is_groothandel ?? false)

  // Bedrijfskoppeling
  const matchedCompany = companies.find(c => c.name.toLowerCase() === (profile.company ?? '').toLowerCase())
  const [selectedCompanyId, setSelectedCompanyId] = useState(profile.company_id ?? matchedCompany?.id ?? '')
  const [memberRole, setMemberRole] = useState<'manager' | 'member'>(
    (profile.member?.role as 'manager' | 'member') ?? 'manager'
  )
  const [canOrder, setCanOrder] = useState(profile.member?.can_order ?? true)
  const [canSeePurchasePrices, setCanSeePurchasePrices] = useState(profile.member?.can_see_purchase_prices ?? true)
  const [canConfigure, setCanConfigure] = useState(profile.member?.can_configure ?? true)
  const [ownConfigsOnly, setOwnConfigsOnly] = useState(profile.member?.own_configs_only ?? false)

  // Password reset
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Verwijderen
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Beheerrol
  const [subAdminConfirm, setSubAdminConfirm] = useState('')
  const [showSubAdminConfirm, setShowSubAdminConfirm] = useState(false)
  const [superAdminConfirm, setSuperAdminConfirm] = useState('')
  const [showSuperAdminConfirm, setShowSuperAdminConfirm] = useState(false)
  const [localIsSubAdmin, setLocalIsSubAdmin] = useState(profile.is_sub_admin)
  const [localIsSuperAdmin, setLocalIsSuperAdmin] = useState(profile.is_admin)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setError(null)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  function handleSaveKorting() {
    const val = Math.min(100, Math.max(0, parseInt(korting) || 0))
    setKorting(String(val))
    setKortingEditing(false)
    startTransition(async () => {
      await updateKorting(profile.id, val)
      showSuccess('Korting opgeslagen')
    })
  }

  function handleToggleInternational() {
    const next = !isInternational
    setIsInternational(next)
    startTransition(async () => {
      await toggleInternational(profile.id, next)
    })
  }

  function handleToggleGroothandel() {
    const next = !isGroothandel
    setIsGroothandel(next)
    startTransition(async () => {
      await toggleGroothandel(profile.id, next)
    })
  }

  function handleSaveCompany() {
    if (!selectedCompanyId) return
    const perms = {
      role: memberRole,
      can_order: canOrder,
      can_see_purchase_prices: canSeePurchasePrices,
      can_configure: canConfigure,
      own_configs_only: ownConfigsOnly,
    }
    startTransition(async () => {
      const isAlreadyLinked = profile.company_id === selectedCompanyId && !!profile.member
      if (isAlreadyLinked) {
        const result = await updateMemberPermissions(profile.id, perms)
        if (result.success) showSuccess('Rechten bijgewerkt')
        else setError(result.error ?? 'Opslaan mislukt')
      } else {
        const result = await linkUserToCompany(profile.id, selectedCompanyId, perms)
        if (result.success) { showSuccess('Bedrijfskoppeling opgeslagen'); router.refresh() }
        else setError(result.error ?? 'Koppelen mislukt')
      }
    })
  }

  function handleApproval(status: 'approved' | 'rejected') {
    startTransition(async () => {
      await updateApprovalStatus(profile.id, status)
      router.refresh()
      onClose()
    })
  }

  function handleGenerateResetLink() {
    if (!profile.email) return
    startTransition(async () => {
      const result = await generatePasswordResetLink(profile.email!)
      if (result.error) setError(result.error)
      else setResetLink(result.link ?? null)
    })
  }

  function handleCopy() {
    if (!resetLink) return
    navigator.clipboard.writeText(resetLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(profile.id)
      if (result.success) { router.refresh(); onClose() }
      else { setError(result.error ?? 'Verwijderen mislukt'); setConfirmDelete(false) }
    })
  }

  function handleConfirmSubAdmin(enable: boolean) {
    setLocalIsSubAdmin(enable)
    setShowSubAdminConfirm(false)
    setSubAdminConfirm('')
    startTransition(async () => {
      const result = await updateSubAdmin(profile.id, enable)
      if (!result.success) { setError(result.error ?? 'Mislukt'); setLocalIsSubAdmin(!enable) }
      else showSuccess(enable ? 'Beheerderstoegang ingeschakeld' : 'Beheerderstoegang uitgeschakeld')
    })
  }

  function handleConfirmSuperAdmin(enable: boolean) {
    setLocalIsSuperAdmin(enable)
    setShowSuperAdminConfirm(false)
    setSuperAdminConfirm('')
    startTransition(async () => {
      const result = await updateSuperAdmin(profile.id, enable)
      if (!result.success) { setError(result.error ?? 'Mislukt'); setLocalIsSuperAdmin(!enable) }
      else showSuccess(enable ? 'Superadmin ingeschakeld' : 'Superadmin uitgeschakeld')
    })
  }

  const firstLetter = profile.full_name?.charAt(0)?.toUpperCase() ?? '?'
  const statusConfig = {
    pending:  { label: 'Wacht op goedkeuring', className: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Goedgekeurd',          className: 'bg-green-50 text-green-700' },
    rejected: { label: 'Afgewezen',            className: 'bg-red-50 text-red-600' },
  }
  const statusInfo = statusConfig[profile.approval_status as keyof typeof statusConfig] ?? statusConfig.pending

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — sticky */}
        <div className="px-6 pt-5 pb-4 flex items-start gap-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0 text-lx-cta font-semibold text-sm">
            {firstLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] font-semibold text-lx-text-primary leading-tight">{profile.full_name ?? '—'}</p>
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-[12px] text-lx-text-secondary mt-0.5">{profile.email ?? '—'} · {profile.company ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="text-lx-text-secondary hover:text-lx-text-primary p-1.5 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Feedback */}
          {(error || successMsg) && (
            <div className="px-6 pt-4">
              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600">{error}</div>
              )}
              {successMsg && (
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-[12px] text-green-700 flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  {successMsg}
                </div>
              )}
            </div>
          )}

          {/* Goedkeuring */}
          {(profile.approval_status === 'pending' || profile.approval_status === 'rejected') && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[10.5px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">Goedkeuring</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval('approved')}
                  disabled={isPending}
                  className="flex-1 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Goedkeuren
                </button>
                {profile.approval_status !== 'rejected' && (
                  <button
                    onClick={() => handleApproval('rejected')}
                    disabled={isPending}
                    className="flex-1 text-red-600 bg-red-50 hover:bg-red-100 text-[13px] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Afwijzen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dealer instellingen */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[10.5px] font-bold text-lx-text-secondary uppercase tracking-widest mb-4">Dealer instellingen</p>

            {/* Korting */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-medium text-lx-text-primary">Kortingspercentage</p>
                <p className="text-[11.5px] text-lx-text-secondary">Toegepast op alle verkoopprijzen</p>
              </div>
              {kortingEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={korting}
                    onChange={e => setKorting(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKorting(); if (e.key === 'Escape') setKortingEditing(false) }}
                    autoFocus
                    className="w-16 h-8 rounded-lg border border-lx-cta/50 text-center text-[13px] font-semibold text-lx-text-primary outline-none focus:border-lx-cta bg-white px-1"
                  />
                  <span className="text-[12px] text-lx-text-secondary">%</span>
                  <button onClick={handleSaveKorting} className="text-[12px] font-semibold text-lx-cta hover:underline cursor-pointer">OK</button>
                  <button onClick={() => setKortingEditing(false)} className="text-[12px] text-lx-text-secondary hover:text-lx-text-primary cursor-pointer">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setKortingEditing(true)}
                  className="text-[13px] font-semibold text-lx-cta bg-lx-icon-bg hover:bg-lx-panel-bg px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  {korting}%
                </button>
              )}
            </div>

            {/* Internationaal */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-lx-text-primary">Buitenlandtoeslag</p>
                <p className="text-[11.5px] text-lx-text-secondary">+5% op alle verkoopprijzen</p>
              </div>
              <button
                role="switch"
                aria-checked={isInternational}
                onClick={handleToggleInternational}
                disabled={isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40 cursor-pointer ${isInternational ? 'bg-lx-cta' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isInternational ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Groothandelaar */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-lx-divider">
              <div>
                <p className="text-[13px] font-medium text-lx-text-primary">Project</p>
                <p className="text-[11.5px] text-lx-text-secondary">Toegang tot projectspiegel configurator — geen reguliere spiegels of milestones</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isGroothandel}
                onClick={handleToggleGroothandel}
                disabled={isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40 cursor-pointer ${isGroothandel ? 'bg-lx-cta' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isGroothandel ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Bedrijfskoppeling */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[10.5px] font-bold text-lx-text-secondary uppercase tracking-widest mb-4">Bedrijfskoppeling</p>

            <div className="space-y-4">
              <div>
                <label className="text-[11.5px] font-medium text-lx-text-secondary mb-1.5 block">Bedrijf</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full text-[13px] border border-black/10 rounded-xl px-3 py-2.5 bg-white text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors cursor-pointer"
                >
                  <option value="">— Geen bedrijf —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedCompanyId && (
                <>
                  <div>
                    <label className="text-[11.5px] font-medium text-lx-text-secondary mb-2 block">Rol</label>
                    <div className="flex gap-2">
                      {(['manager', 'member'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setMemberRole(r)}
                          className={`flex-1 py-2 rounded-xl text-[12.5px] font-semibold transition-colors border cursor-pointer ${
                            memberRole === r
                              ? 'bg-lx-cta text-white border-lx-cta'
                              : 'bg-white text-lx-text-secondary border-black/10 hover:border-lx-cta hover:text-lx-cta'
                          }`}
                        >
                          {r === 'manager' ? 'Manager' : 'Medewerker'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-medium text-lx-text-secondary mb-2 block">Rechten</label>
                    <div className="space-y-3 bg-lx-panel-bg rounded-xl p-3">
                      {([
                        { key: 'can_order',               label: 'Mag bestellen',              value: canOrder,             set: setCanOrder },
                        { key: 'can_see_purchase_prices', label: 'Ziet inkoopprijzen',         value: canSeePurchasePrices, set: setCanSeePurchasePrices },
                        { key: 'can_configure',           label: 'Mag configureren',           value: canConfigure,         set: setCanConfigure },
                        { key: 'own_configs_only',        label: 'Alleen eigen configuraties', value: ownConfigsOnly,       set: setOwnConfigsOnly },
                      ] as const).map(({ key, label, value, set }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[12.5px] text-lx-text-primary">{label}</span>
                          <button
                            role="switch"
                            aria-checked={value}
                            onClick={() => (set as (v: boolean) => void)(!value)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${value ? 'bg-lx-cta' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCompany}
                    disabled={isPending}
                    className="w-full bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {profile.company_id === selectedCompanyId && profile.member ? 'Rechten opslaan' : 'Koppelen & opslaan'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Beheerrechten — alleen zichtbaar voor superadmin, niet op eigen account */}
          {currentUserIsAdmin && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[10.5px] font-bold text-lx-text-secondary uppercase tracking-widest mb-4">Beheerrechten</p>
              <div className="space-y-4">

                {/* Tussenbeheerder */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-lx-text-primary">Tussenbeheerder</p>
                      <p className="text-[11.5px] text-lx-text-secondary">Toegang tot Klantconfiguraties en Bestellingen</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={localIsSubAdmin}
                      disabled={isPending || localIsSuperAdmin}
                      onClick={() => {
                        if (localIsSubAdmin) { handleConfirmSubAdmin(false) }
                        else { setShowSubAdminConfirm(true); setSubAdminConfirm('') }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40 cursor-pointer ${localIsSubAdmin ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${localIsSubAdmin ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {showSubAdminConfirm && (
                    <div className="mt-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                      <p className="text-[12px] text-indigo-800 font-medium">Typ <strong>BEHEER</strong> om te bevestigen</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={subAdminConfirm}
                          onChange={e => setSubAdminConfirm(e.target.value)}
                          placeholder="BEHEER"
                          autoFocus
                          className="flex-1 text-[12.5px] border border-indigo-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        <button
                          disabled={subAdminConfirm.toUpperCase() !== 'BEHEER' || isPending}
                          onClick={() => handleConfirmSubAdmin(true)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold disabled:opacity-40"
                        >
                          Bevestigen
                        </button>
                        <button onClick={() => { setShowSubAdminConfirm(false); setSubAdminConfirm('') }} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12px] text-lx-text-secondary">
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Superadmin */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-lx-text-primary">Superadmin</p>
                      <p className="text-[11.5px] text-lx-text-secondary">Volledige toegang tot alle beheeronderdelen</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={localIsSuperAdmin}
                      disabled={isPending}
                      onClick={() => {
                        if (localIsSuperAdmin) { handleConfirmSuperAdmin(false) }
                        else { setShowSuperAdminConfirm(true); setSuperAdminConfirm('') }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40 cursor-pointer ${localIsSuperAdmin ? 'bg-purple-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${localIsSuperAdmin ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {showSuperAdminConfirm && (
                    <div className="mt-2.5 p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                      <p className="text-[12px] text-purple-800 font-medium">Typ <strong>SUPERADMIN</strong> om te bevestigen</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={superAdminConfirm}
                          onChange={e => setSuperAdminConfirm(e.target.value)}
                          placeholder="SUPERADMIN"
                          autoFocus
                          className="flex-1 text-[12.5px] border border-purple-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 bg-white"
                        />
                        <button
                          disabled={superAdminConfirm.toUpperCase() !== 'SUPERADMIN' || isPending}
                          onClick={() => handleConfirmSuperAdmin(true)}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[12px] font-semibold disabled:opacity-40"
                        >
                          Bevestigen
                        </button>
                        <button onClick={() => { setShowSuperAdminConfirm(false); setSuperAdminConfirm('') }} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12px] text-lx-text-secondary">
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Acties */}
          <div className="px-6 py-4">
            <p className="text-[10.5px] font-bold text-lx-text-secondary uppercase tracking-widest mb-4">Acties</p>

            <div className="space-y-2">
              {/* Password reset */}
              {!resetLink ? (
                <button
                  onClick={handleGenerateResetLink}
                  disabled={isPending || !profile.email}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/8 hover:border-black/15 hover:bg-lx-panel-bg transition-all text-left disabled:opacity-40 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lx-text-secondary flex-shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-[13px] font-medium text-lx-text-primary">Wachtwoord resetlink genereren</span>
                </button>
              ) : (
                <div className="p-3 bg-lx-panel-bg rounded-xl border border-black/8">
                  <p className="text-[11.5px] text-lx-text-secondary mb-2">Eenmalige resetlink — stuur handmatig naar {profile.email}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={resetLink}
                      onFocus={e => e.target.select()}
                      className="flex-1 min-w-0 text-[11px] text-lx-text-secondary bg-white border border-black/8 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 bg-lx-cta hover:bg-lx-cta-hover text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {copied ? 'Gekopieerd!' : 'Kopiëren'}
                    </button>
                  </div>
                </div>
              )}

              {/* Verwijderen */}
              {!confirmDelete ? (
                <button
                  onClick={() => { setConfirmDelete(true); setError(null) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 hover:border-red-200 hover:bg-red-50 transition-all text-left cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  <span className="text-[13px] font-medium text-red-500">Account verwijderen</span>
                </button>
              ) : (
                <div className="p-3.5 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-[12.5px] text-red-700 font-medium mb-3">Weet je het zeker? Dit kan niet ongedaan worden gemaakt.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isPending}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isPending ? '...' : 'Definitief verwijderen'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-white text-lx-text-secondary text-[12.5px] font-semibold py-2 rounded-lg border border-black/10 hover:border-black/20 transition-colors cursor-pointer"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
