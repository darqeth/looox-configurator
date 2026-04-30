'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { inviteColleague, updateMemberPermissions, removeMember, revokeInvite, updateInvitePermissions } from '@/lib/actions/colleagues'
import type { MemberPermissions, InvitePermissions } from '@/lib/actions/colleagues'

type Member = {
  id: string
  role: 'manager' | 'member'
  can_order: boolean
  can_see_purchase_prices: boolean
  can_configure: boolean
  own_configs_only: boolean
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  approvalStatus: string | null
  isSelf: boolean
}

type Invite = {
  id: string
  email: string
  token: string
  expiresAt: string
  can_order: boolean
  can_see_purchase_prices: boolean
  can_configure: boolean
  own_configs_only: boolean
}

interface CollegasPanelProps {
  isManager: boolean
  members: Member[]
  invites: Invite[]
  companyId: string
}

export default function CollegasPanel({ isManager, members, invites }: CollegasPanelProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-lx-text-primary tracking-tight">Collega&apos;s</h1>
          <p className="text-lx-text-secondary text-[12px] mt-0.5">
            {members.length} {members.length === 1 ? 'persoon' : 'personen'} in jouw bedrijf
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            Collega uitnodigen
          </button>
        )}
      </div>

      {/* Ledenlijst */}
      <div className="space-y-2">
        {members.map(member => (
          <MemberRow
            key={member.id}
            member={member}
            isManager={isManager}
            onEdit={() => setEditingMember(member)}
          />
        ))}
      </div>

      {/* Openstaande invites (alleen manager) */}
      {isManager && invites.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3">
            Openstaande uitnodigingen
          </p>
          <div className="space-y-2">
            {invites.map(invite => (
              <InviteRow
                key={invite.id}
                invite={invite}
                copiedToken={copiedToken}
                onCopy={(token) => {
                  const url = `${window.location.origin}/invite/${token}`
                  navigator.clipboard.writeText(url).then(() => {
                    setCopiedToken(token)
                    setTimeout(() => setCopiedToken(null), 2000)
                  })
                }}
                onEditPerms={(inv) => setEditingInvite(inv)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

      {/* Rechten modal — bestaand lid */}
      {editingMember && (
        <PermissionsModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* Rechten modal — pending invite */}
      {editingInvite && (
        <InvitePermissionsModal
          invite={editingInvite}
          onClose={() => setEditingInvite(null)}
        />
      )}
    </>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member, isManager, onEdit }: { member: Member; isManager: boolean; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const firstLetter = member.name.charAt(0).toUpperCase()

  const statusBadge = member.approvalStatus === 'pending'
    ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">In afwachting van goedkeuring</span>
    : null

  function handleRemove() {
    if (!confirm(`Weet je zeker dat je ${member.name} wil verwijderen?`)) return
    startTransition(async () => {
      const result = await removeMember(member.id)
      if (!result.success) setError(result.error ?? 'Onbekende fout')
    })
  }

  return (
    <div className={`bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-4 flex items-center gap-3.5 ${isPending ? 'opacity-60' : ''}`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden relative">
        {member.avatarUrl
          ? <Image src={member.avatarUrl} alt="" fill className="object-cover" />
          : <div className="w-full h-full bg-lx-icon-bg flex items-center justify-center text-lx-cta text-sm font-semibold">{firstLetter}</div>
        }
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-lx-text-primary">
            {member.name}
            {member.isSelf && <span className="text-lx-text-secondary font-normal text-[11px] ml-1">(jij)</span>}
          </p>
          {member.role === 'manager' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5DA87A]/12 text-[#3d8a5c]">Manager</span>
          )}
          {statusBadge}
        </div>
        <p className="text-[12px] text-lx-text-secondary mt-0.5">{member.email}</p>
        {member.role === 'member' && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            <PermBadge label="Bestellen" active={member.can_order} />
            <PermBadge label="Inkoopprijzen" active={member.can_see_purchase_prices} />
            <PermBadge label="Configureren" active={member.can_configure} />
            <PermBadge label="Eigen configs" active={member.own_configs_only} />
          </div>
        )}
        {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
      </div>

      {/* Acties (alleen manager, niet voor zichzelf verwijderen tenzij niet de enige) */}
      {isManager && !member.isSelf && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-[12px] font-medium text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            Rechten
          </button>
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-[12px] font-medium text-lx-text-secondary hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Verwijder
          </button>
        </div>
      )}
      {isManager && member.isSelf && (
        <button
          onClick={onEdit}
          className="text-[12px] font-medium text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          Rechten
        </button>
      )}
    </div>
  )
}

function PermBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
      active ? 'bg-[#5DA87A]/10 text-[#3d8a5c]' : 'bg-lx-divider text-lx-text-secondary line-through opacity-60'
    }`}>
      {label}
    </span>
  )
}

// ─── Invite Row ───────────────────────────────────────────────────────────────

function InviteRow({ invite, copiedToken, onCopy, onEditPerms }: {
  invite: Invite
  copiedToken: string | null
  onCopy: (token: string) => void
  onEditPerms: (invite: Invite) => void
}) {
  const [isPending, startTransition] = useTransition()
  const isCopied = copiedToken === invite.token
  const expiresDate = new Date(invite.expiresAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })

  function handleRevoke() {
    if (!confirm(`Weet je zeker dat je de uitnodiging voor ${invite.email} wil intrekken?`)) return
    startTransition(async () => { await revokeInvite(invite.id) })
  }

  return (
    <div className={`bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-4 flex items-center gap-3 ${isPending ? 'opacity-60' : ''}`}>
      <div className="w-9 h-9 rounded-full flex-shrink-0 bg-amber-50 flex items-center justify-center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="text-amber-500" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-lx-text-primary">{invite.email}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <PermBadge label="Bestellen" active={invite.can_order} />
          <PermBadge label="Inkoopprijzen" active={invite.can_see_purchase_prices} />
          <PermBadge label="Configureren" active={invite.can_configure} />
          <PermBadge label="Eigen configs" active={invite.own_configs_only} />
        </div>
        <p className="text-[11px] text-lx-text-secondary mt-1">Verloopt {expiresDate}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onCopy(invite.token)}
          className="text-[12px] font-medium text-lx-cta hover:bg-lx-icon-bg px-3 py-1.5 rounded-lg transition-colors"
        >
          {isCopied ? 'Gekopieerd!' : 'Kopieer link'}
        </button>
        <button
          onClick={() => onEditPerms(invite)}
          className="text-[12px] font-medium text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg px-3 py-1.5 rounded-lg transition-colors"
        >
          Rechten
        </button>
        <button
          onClick={handleRevoke}
          disabled={isPending}
          className="text-[12px] font-medium text-lx-text-secondary hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Intrekken
        </button>
      </div>
    </div>
  )
}

// ─── Invite Modal (2 stappen) ─────────────────────────────────────────────────

const PRESETS = {
  beperkt:   { can_order: false, can_see_purchase_prices: false, can_configure: false, own_configs_only: true },
  standaard: { can_order: false, can_see_purchase_prices: false, can_configure: true,  own_configs_only: true },
  volledig:  { can_order: true,  can_see_purchase_prices: true,  can_configure: true,  own_configs_only: false },
}
type Preset = keyof typeof PRESETS

function detectPreset(p: InvitePermissions): Preset | null {
  for (const [key, vals] of Object.entries(PRESETS)) {
    if (Object.entries(vals).every(([k, v]) => p[k as keyof InvitePermissions] === v))
      return key as Preset
  }
  return null
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [perms, setPerms] = useState<InvitePermissions>(PRESETS.standaard)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const activePreset = detectPreset(perms)

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const result = await inviteColleague(email, perms)
      if (!result.success) {
        setError(result.error)
      } else {
        setInviteLink(`${window.location.origin}/invite/${result.token}`)
      }
    })
  }

  function copyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (inviteLink) {
    return (
      <ModalShell onClose={onClose} title="Uitnodiging aangemaakt">
        <div className="space-y-4">
          <p className="text-[13px] text-lx-text-secondary">
            Stuur deze link zelf door aan je collega. De link is 7 dagen geldig.
          </p>
          <div className="bg-lx-divider rounded-xl px-4 py-3 flex items-center gap-2">
            <p className="text-[11.5px] font-mono text-lx-text-primary break-all flex-1">{inviteLink}</p>
            <button
              onClick={copyLink}
              className="flex-shrink-0 text-[12px] font-semibold text-lx-cta hover:bg-lx-icon-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? 'Gekopieerd!' : 'Kopieer'}
            </button>
          </div>
          <button onClick={onClose} className="w-full bg-lx-divider hover:bg-black/6 text-lx-text-primary text-[13.5px] font-medium py-2.5 rounded-xl transition-colors">
            Sluiten
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose} title="Collega uitnodigen">
      {/* Stap-indicator */}
      <div className="flex items-center gap-2 mb-5">
        {([1, 2] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              step === s ? 'bg-lx-cta text-white' : step > s ? 'bg-[#5DA87A]/20 text-[#3d8a5c]' : 'bg-lx-divider text-lx-text-secondary'
            }`}>{s}</div>
            <span className={`text-[11.5px] font-medium ${step === s ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
              {s === 1 ? 'E-mailadres' : 'Rechten'}
            </span>
            {s < 2 && <div className="w-6 h-px bg-black/10 mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-lx-text-secondary mb-1.5">
              E-mailadres collega
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email && setStep(2)}
              placeholder="naam@bedrijf.nl"
              autoFocus
              className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[13.5px] text-lx-text-primary placeholder:text-lx-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              disabled={!email}
              className="flex-1 bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-50 text-white text-[13.5px] font-semibold py-2.5 rounded-xl transition-colors"
            >
              Volgende →
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-lx-text-secondary hover:bg-lx-divider text-[13.5px] transition-colors">
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <p className="text-[12px] font-semibold text-lx-text-secondary mb-2">Snel instellen</p>
            <div className="flex gap-2">
              {(Object.keys(PRESETS) as Preset[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPerms(PRESETS[p])}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-colors capitalize ${
                    activePreset === p
                      ? 'bg-lx-icon-bg text-lx-cta border-lx-cta/30'
                      : 'border-black/8 text-lx-text-secondary hover:border-black/15'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Individuele toggles */}
          <div className="space-y-3 pt-1">
            <InvitePermToggle label="Mag bestellingen plaatsen" description="Kan configuraties omzetten naar bestellingen"
              checked={perms.can_order} onChange={v => setPerms(p => ({ ...p, can_order: v }))} />
            <InvitePermToggle label="Mag inkoopkorting zien" description="Ziet inkoopkorting bij bestellen; anders alleen nettoprijzen"
              checked={perms.can_see_purchase_prices} onChange={v => setPerms(p => ({ ...p, can_see_purchase_prices: v }))} />
            <InvitePermToggle label="Mag configuraties aanmaken" description="Kan nieuwe spiegels configureren"
              checked={perms.can_configure} onChange={v => setPerms(p => ({ ...p, can_configure: v }))} />
            <InvitePermToggle label="Ziet alleen eigen configuraties" description="Kan geen configuraties van collega's inzien"
              checked={perms.own_configs_only} onChange={v => setPerms(p => ({ ...p, own_configs_only: v }))} />
          </div>

          {error && <p className="text-red-500 text-[12px]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-lx-text-secondary hover:bg-lx-divider text-[13.5px] transition-colors">
              ← Terug
            </button>
            <button
              onClick={handleSend}
              disabled={isPending}
              className="flex-1 bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-50 text-white text-[13.5px] font-semibold py-2.5 rounded-xl transition-colors"
            >
              {isPending ? 'Aanmaken…' : 'Uitnodiging aanmaken'}
            </button>
          </div>
          <p className="text-lx-text-secondary text-[11px] text-center">
            Rechten zijn ook achteraf aanpasbaar zolang de collega nog niet heeft ingelogd.
          </p>
        </div>
      )}
    </ModalShell>
  )
}

function InvitePermToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="mt-0.5 flex-shrink-0" onClick={() => onChange(!checked)}>
        <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-lx-cta' : 'bg-black/15'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
      <div onClick={() => onChange(!checked)}>
        <p className="text-[13px] font-medium text-lx-text-primary">{label}</p>
        <p className="text-[11px] text-lx-text-secondary mt-0.5">{description}</p>
      </div>
    </label>
  )
}

// ─── Invite Permissions Modal (voor bestaande pending invites) ────────────────

function InvitePermissionsModal({ invite, onClose }: { invite: Invite; onClose: () => void }) {
  const [perms, setPerms] = useState<InvitePermissions>({
    can_order: invite.can_order,
    can_see_purchase_prices: invite.can_see_purchase_prices,
    can_configure: invite.can_configure,
    own_configs_only: invite.own_configs_only,
  })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const activePreset = detectPreset(perms)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateInvitePermissions(invite.id, perms)
      if (!result.success) setError(result.error ?? 'Onbekende fout')
      else onClose()
    })
  }

  return (
    <ModalShell onClose={onClose} title={`Rechten — ${invite.email}`}>
      <div className="space-y-4">
        <div>
          <p className="text-[12px] font-semibold text-lx-text-secondary mb-2">Snel instellen</p>
          <div className="flex gap-2">
            {(Object.keys(PRESETS) as Preset[]).map(p => (
              <button
                key={p}
                onClick={() => setPerms(PRESETS[p])}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  activePreset === p
                    ? 'bg-lx-icon-bg text-lx-cta border-lx-cta/30'
                    : 'border-black/8 text-lx-text-secondary hover:border-black/15'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <InvitePermToggle label="Mag bestellingen plaatsen" description="Kan configuraties omzetten naar bestellingen"
            checked={perms.can_order} onChange={v => setPerms(p => ({ ...p, can_order: v }))} />
          <InvitePermToggle label="Mag inkoopkorting zien" description="Ziet inkoopkorting bij bestellen; anders alleen nettoprijzen"
            checked={perms.can_see_purchase_prices} onChange={v => setPerms(p => ({ ...p, can_see_purchase_prices: v }))} />
          <InvitePermToggle label="Mag configuraties aanmaken" description="Kan nieuwe spiegels configureren"
            checked={perms.can_configure} onChange={v => setPerms(p => ({ ...p, can_configure: v }))} />
          <InvitePermToggle label="Ziet alleen eigen configuraties" description="Kan geen configuraties van collega's inzien"
            checked={perms.own_configs_only} onChange={v => setPerms(p => ({ ...p, own_configs_only: v }))} />
        </div>
        {error && <p className="text-red-500 text-[12px]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-50 text-white text-[13.5px] font-semibold py-2.5 rounded-xl transition-colors"
          >
            {isPending ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-lx-text-secondary hover:bg-lx-divider text-[13.5px] transition-colors">
            Annuleren
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Permissions Modal ────────────────────────────────────────────────────────

function PermissionsModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [role, setRole] = useState<'manager' | 'member'>(member.role)
  const [perms, setPerms] = useState<Omit<MemberPermissions, 'role'>>({
    can_order: member.can_order,
    can_see_purchase_prices: member.can_see_purchase_prices,
    can_configure: member.can_configure,
    own_configs_only: member.own_configs_only,
  })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMemberPermissions(member.id, { role, ...perms })
      if (!result.success) setError(result.error ?? 'Onbekende fout')
      else onClose()
    })
  }

  const isManager = role === 'manager'

  return (
    <ModalShell onClose={onClose} title={`Rechten — ${member.name}`}>
      <div className="space-y-5">
        {/* Rol */}
        <div>
          <p className="text-[12px] font-semibold text-lx-text-secondary mb-2">Rol</p>
          <div className="flex gap-2">
            {(['manager', 'member'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
                  role === r
                    ? 'bg-lx-icon-bg text-lx-cta border-lx-cta/30'
                    : 'border-black/8 text-lx-text-secondary hover:border-black/15'
                }`}
              >
                {r === 'manager' ? 'Manager' : 'Collega'}
              </button>
            ))}
          </div>
          {isManager && (
            <p className="text-[11px] text-lx-text-secondary mt-1.5">Managers hebben automatisch alle rechten.</p>
          )}
        </div>

        {/* Rechten (alleen tonen als rol = member) */}
        {!isManager && (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-lx-text-secondary">Rechten</p>
            <PermToggle
              label="Mag bestellingen plaatsen"
              description="Kan configuraties omzetten naar bestellingen"
              checked={perms.can_order}
              onChange={v => setPerms(p => ({ ...p, can_order: v }))}
            />
            <PermToggle
              label="Mag inkoopkorting zien"
              description="Ziet inkoopkorting bij bestellen; zonder dit recht alleen nettoprijzen"
              checked={perms.can_see_purchase_prices}
              onChange={v => setPerms(p => ({ ...p, can_see_purchase_prices: v }))}
            />
            <PermToggle
              label="Mag configuraties aanmaken"
              description="Kan nieuwe spiegels configureren"
              checked={perms.can_configure}
              onChange={v => setPerms(p => ({ ...p, can_configure: v }))}
            />
            <PermToggle
              label="Ziet alleen eigen configuraties"
              description="Kan geen configuraties van collega's inzien"
              checked={perms.own_configs_only}
              onChange={v => setPerms(p => ({ ...p, own_configs_only: v }))}
            />
          </div>
        )}

        {error && <p className="text-red-500 text-[12px]">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-50 text-white text-[13.5px] font-semibold py-2.5 rounded-xl transition-colors"
          >
            {isPending ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-lx-text-secondary hover:bg-lx-divider text-[13.5px] transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function PermToggle({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5 flex-shrink-0">
        <div
          onClick={() => onChange(!checked)}
          className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-lx-cta' : 'bg-black/15'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
      <div onClick={() => onChange(!checked)}>
        <p className="text-[13px] font-medium text-lx-text-primary">{label}</p>
        <p className="text-[11px] text-lx-text-secondary mt-0.5">{description}</p>
      </div>
    </label>
  )
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[22px] w-full max-w-md shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-lx-text-primary">{title}</h3>
          <button onClick={onClose} className="text-lx-text-secondary hover:text-lx-text-primary p-1 rounded-lg hover:bg-lx-divider transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
