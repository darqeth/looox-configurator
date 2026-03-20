'use client'

import { useState } from 'react'
import { updateProfile, updatePassword, updatePriceFactor } from '@/lib/actions/account'

type Profile = {
  full_name: string | null
  company: string | null
  phone: string | null
  address: string | null
  email: string
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-lx-cta bg-lx-icon-bg border border-lx-cta/20 rounded-xl px-3.5 py-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      {message}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {message}
    </div>
  )
}

function InputField({ label, name, defaultValue, type = 'text', placeholder, readOnly }: {
  label: string
  name: string
  defaultValue?: string | null
  type?: string
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-lx-text-primary mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3.5 py-2.5 text-[13px] rounded-xl border transition-colors outline-none ${
          readOnly
            ? 'bg-lx-panel-bg border-lx-border text-lx-text-secondary cursor-default'
            : 'bg-white border-lx-border text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/10'
        }`}
      />
      {readOnly && <p className="text-[11px] text-lx-placeholder mt-1">Dit veld kan niet worden gewijzigd</p>}
    </div>
  )
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [profileStatus, setProfileStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  async function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileStatus('idle')
    try {
      await updateProfile(new FormData(e.currentTarget))
      setProfileStatus('success')
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Er is iets misgegaan')
      setProfileStatus('error')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <form onSubmit={handleProfile} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Volledige naam" name="full_name" defaultValue={profile.full_name} placeholder="Jan de Vries" />
        <InputField label="Bedrijf" name="company" defaultValue={profile.company} placeholder="Interieur BV" />
        <InputField label="Telefoonnummer" name="phone" defaultValue={profile.phone} placeholder="+31 6 12345678" />
        <InputField label="E-mailadres" name="email" defaultValue={profile.email} readOnly />
      </div>
      <InputField label="Adres" name="address" defaultValue={profile.address} placeholder="Voorbeeldstraat 1, 1234 AB Amsterdam" />

      {profileStatus === 'success' && <SuccessBanner message="Profiel opgeslagen" />}
      {profileStatus === 'error' && <ErrorBanner message={profileError} />}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={profileLoading}
          className="bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-60 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {profileLoading ? 'Opslaan...' : 'Wijzigingen opslaan'}
        </button>
      </div>
    </form>
  )
}

export function PrijsfactorForm({ priceFactor, priceFactorEnabled }: { priceFactor: number; priceFactorEnabled: boolean }) {
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [factor, setFactor]   = useState(priceFactor)
  const [factorRaw, setFactorRaw] = useState(String(priceFactor))

  function handleFactorBlur() {
    const parsed = parseFloat(factorRaw)
    const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed > 10 ? 10 : parsed
    setFactor(clamped)
    setFactorRaw(String(clamped))
  }
  const [enabled, setEnabled] = useState(priceFactorEnabled)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    try {
      await updatePriceFactor(new FormData(e.currentTarget))
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er is iets misgegaan')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const exampleNetto    = 450
  const exampleConsumer = Math.round(exampleNetto * factor)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-lx-text-primary">Consumentenprijzen activeren</p>
          <p className="text-[12px] text-lx-text-secondary mt-0.5 leading-relaxed">
            Wanneer actief worden prijzen in de configurator vermenigvuldigd met de factor. Bestellingen naar LoooX blijven altijd op netto inkoopprijs.
          </p>
        </div>
        {/* Toggle switch */}
        <label className="relative flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            name="price_factor_enabled"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-black/12 peer-checked:bg-lx-cta rounded-full transition-colors duration-200" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
        </label>
      </div>

      {/* Factor input */}
      <div>
        <label className="block text-[12px] font-semibold text-lx-text-primary mb-1.5">
          Prijsfactor
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-lx-text-secondary font-medium">×</span>
            <input
              type="number"
              name="price_factor"
              min="1"
              max="10"
              step="0.01"
              value={factorRaw}
              onChange={e => setFactorRaw(e.target.value)}
              onBlur={handleFactorBlur}
              className="w-full pl-8 pr-3 py-2.5 text-[13px] font-semibold rounded-xl border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/10 outline-none transition-colors"
            />
          </div>
          <p className="text-[12px] text-lx-text-secondary">
            = {factor >= 1 ? `+${Math.round((factor - 1) * 100)}%` : '—'} marge
          </p>
        </div>
        <p className="text-[11.5px] text-lx-text-secondary mt-1.5">Voer een getal in ≥ 1 in. Bijv. 1.35 = 35% opslag.</p>
      </div>

      {/* Live preview */}
      <div className={`rounded-xl p-4 border transition-colors ${enabled ? 'bg-lx-icon-bg border-lx-cta/20' : 'bg-lx-panel-bg border-black/8'}`}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Voorbeeld</p>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] text-lx-text-secondary">Netto (LoooX)</p>
            <p className="text-[15px] font-bold text-lx-text-primary">€{exampleNetto}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
          <div>
            <p className="text-[11px] text-lx-text-secondary">Consument</p>
            <p className={`text-[15px] font-bold ${enabled ? 'text-lx-cta' : 'text-lx-text-secondary'}`}>
              €{enabled ? exampleConsumer : exampleNetto}
            </p>
          </div>
          {enabled && factor > 1 && (
            <span className="ml-1 text-[11px] font-semibold text-lx-cta bg-lx-icon-bg px-2 py-0.5 rounded-full">
              +{Math.round((factor - 1) * 100)}%
            </span>
          )}
        </div>
      </div>

      {status === 'success' && <SuccessBanner message="Consumentenprijzen opgeslagen" />}
      {status === 'error' && <ErrorBanner message={error} />}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-lx-cta hover:bg-lx-cta-hover disabled:opacity-60 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          {loading ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}

export function PasswordForm() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePassword(formData: FormData) {
    setLoading(true)
    setStatus('idle')
    try {
      await updatePassword(formData)
      setStatus('success')
      ;(document.getElementById('password-form') as HTMLFormElement)?.reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er is iets misgegaan')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form id="password-form" action={handlePassword} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-lx-text-primary mb-1.5">Nieuw wachtwoord</label>
          <input
            type="password"
            name="password"
            placeholder="Minimaal 8 tekens"
            className="w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/10 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-lx-text-primary mb-1.5">Bevestig wachtwoord</label>
          <input
            type="password"
            name="confirm"
            placeholder="Herhaal wachtwoord"
            className="w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/10 outline-none transition-colors"
          />
        </div>
      </div>

      {status === 'success' && <SuccessBanner message="Wachtwoord gewijzigd" />}
      {status === 'error' && <ErrorBanner message={error} />}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-lx-text-primary hover:bg-[#333] disabled:opacity-60 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Opslaan...' : 'Wachtwoord wijzigen'}
        </button>
      </div>
    </form>
  )
}
