'use client'

import { useState } from 'react'
import { updateProfile, updatePassword } from '@/lib/actions/account'

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

  async function handleProfile(formData: FormData) {
    setProfileLoading(true)
    setProfileStatus('idle')
    try {
      await updateProfile(formData)
      setProfileStatus('success')
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Er is iets misgegaan')
      setProfileStatus('error')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <form action={handleProfile} className="space-y-4">
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
