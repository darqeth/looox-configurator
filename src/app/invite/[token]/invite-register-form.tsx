'use client'

import { useState, useTransition } from 'react'
import { signUp } from '@/lib/actions/auth'

function getStrength(password: string) {
  const criteria = [
    { label: 'Minimaal 8 tekens', met: password.length >= 8 },
    { label: 'Hoofdletter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'Cijfer (0–9)', met: /[0-9]/.test(password) },
    { label: 'Speciaal teken (!@#…)', met: /[^A-Za-z0-9]/.test(password) },
  ]
  return { criteria, score: criteria.filter(c => c.met).length }
}

export default function InviteRegisterForm({ email, company, inviteToken }: {
  email: string
  company: string
  inviteToken: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const pw = formData.get('password') as string
    const confirm = formData.get('confirm') as string
    if (pw !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    startTransition(async () => {
      const result = await signUp({
        email,
        password: pw,
        fullName: formData.get('fullName') as string,
        company,
        phone: formData.get('phone') as string,
        inviteToken,
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* E-mail: locked */}
      <div>
        <label className="block text-sm font-semibold text-lx-text-primary mb-1.5">E-mailadres</label>
        <div className="w-full px-3 py-2.5 border border-gray-100 bg-lx-divider rounded-lg text-sm text-lx-text-secondary">
          {email}
        </div>
      </div>

      {/* Bedrijf: locked */}
      <div>
        <label className="block text-sm font-semibold text-lx-text-primary mb-1.5">Bedrijf</label>
        <div className="w-full px-3 py-2.5 border border-gray-100 bg-lx-divider rounded-lg text-sm text-lx-text-secondary">
          {company}
        </div>
      </div>

      {/* Naam */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-semibold text-lx-text-primary mb-1.5">
          Jouw naam
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
          placeholder="Jan de Vries"
        />
      </div>

      {/* Telefoon */}
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-lx-text-primary mb-1.5">
          Telefoonnummer{' '}
          <span className="text-xs text-lx-text-secondary font-normal">(optioneel)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
          placeholder="06 12345678"
        />
      </div>

      {/* Wachtwoord */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-lx-text-primary mb-1.5">
          Wachtwoord kiezen
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
          placeholder="Minimaal 8 tekens"
        />
        {password.length > 0 && <PasswordStrength password={password} />}
      </div>

      {/* Bevestig wachtwoord */}
      <div>
        <label htmlFor="confirm" className="block text-sm font-semibold text-lx-text-primary mb-1.5">
          Wachtwoord bevestigen
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-lx-cta text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
      >
        {isPending ? 'Account aanmaken…' : 'Account aanmaken'}
      </button>
    </form>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const { criteria, score } = getStrength(password)
  const barColor = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-lx-panel-bg'
  const label = score <= 1 ? 'Zwak' : score === 2 ? 'Matig' : score === 3 ? 'Goed' : 'Sterk'
  const labelColor = score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-500' : 'text-lx-cta'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColor : 'bg-gray-100'}`} />
          ))}
        </div>
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>
      <ul className="space-y-1">
        {criteria.map(c => (
          <li key={c.label} className="flex items-center gap-1.5">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${c.met ? 'text-lx-cta' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-xs ${c.met ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
