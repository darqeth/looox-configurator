'use client'

import { useState, useTransition } from 'react'
import { signUp } from '@/lib/actions/auth'
import Link from 'next/link'

function getStrength(password: string) {
  const criteria = [
    { label: 'Minimaal 8 tekens', met: password.length >= 8 },
    { label: 'Hoofdletter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'Cijfer (0–9)', met: /[0-9]/.test(password) },
    { label: 'Speciaal teken (!@#…)', met: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = criteria.filter((c) => c.met).length
  return { criteria, score }
}

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    startTransition(async () => {
      const result = await signUp({
        email: formData.get('email') as string,
        password,
        fullName: formData.get('fullName') as string,
        company: formData.get('company') as string,
        phone: formData.get('phone') as string,
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-[#F0EDE8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo-looox-grey.svg" alt="LoooX" className="h-24 mx-auto mb-2" />
          <p className="text-sm text-[#6B7280]">Configurator</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">
              Account aanvragen
            </h2>
            <p className="text-sm text-[#6B7280] mt-1">
              Na goedkeuring krijg je toegang tot de configurator.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Naam
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
                placeholder="Jan de Vries"
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Bedrijfsnaam
              </label>
              <input
                id="company"
                name="company"
                type="text"
                required
                autoComplete="organization"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
                placeholder="Sanitair BV"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Telefoonnummer{' '}
                <span className="text-xs text-[#9CA3AF] font-normal">(optioneel)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
                placeholder="06 12345678"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                E-mailadres
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
                placeholder="jan@sanitairbv.nl"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Wachtwoord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
                placeholder="Minimaal 8 tekens"
              />
              {password.length > 0 && <PasswordStrength password={password} />}
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-semibold text-[#374151] mb-1.5"
              >
                Wachtwoord bevestigen
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B4F]/40 focus:border-[#3D6B4F] transition-colors"
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
              className="w-full bg-[#3D6B4F] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D6B4F] mt-1"
            >
              {isPending ? 'Aanvraag versturen…' : 'Account aanvragen'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-5">
          Al een account?{' '}
          <Link
            href="/login"
            className="text-[#3D6B4F] font-semibold hover:underline"
          >
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const { criteria, score } = getStrength(password)

  const barColor =
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-[#3D6B4F]'
  const label =
    score <= 1 ? 'Zwak' : score === 2 ? 'Matig' : score === 3 ? 'Goed' : 'Sterk'
  const labelColor =
    score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-500' : 'text-[#3D6B4F]'

  return (
    <div className="mt-2 space-y-2">
      {/* Balkje */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? barColor : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>

      {/* Criteria */}
      <ul className="space-y-1">
        {criteria.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${c.met ? 'text-[#3D6B4F]' : 'text-gray-300'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-xs ${c.met ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
