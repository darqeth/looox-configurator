'use client'

import { useState, useTransition } from 'react'
import { signIn } from '@/lib/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await signIn(
        formData.get('email') as string,
        formData.get('password') as string
      )
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
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">
            Inloggen
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="naam@bedrijf.nl"
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
                autoComplete="current-password"
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
              className="w-full bg-[#3D6B4F] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D6B4F]"
            >
              {isPending ? 'Bezig met inloggen…' : 'Inloggen'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-5">
          Nog geen toegang?{' '}
          <Link
            href="/register"
            className="text-[#3D6B4F] font-semibold hover:underline"
          >
            Account aanvragen
          </Link>
        </p>
      </div>
    </div>
  )
}
