'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Image from 'next/image'
import { signIn } from '@/lib/actions/auth'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordDone, setPasswordDone] = useState(false)
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    let recovered = false

    const clearHash = () => window.history.replaceState(null, '', window.location.pathname)

    const enterRecovery = () => {
      if (recovered) return
      recovered = true
      setIsRecovery(true)
      clearHash()
    }

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') enterRecovery()
    })

    // Fallback: @supabase/ssr may not fire PASSWORD_RECOVERY on implicit-flow hash
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        getSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => { if (!error) enterRecovery() })
      }
    }

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
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

  function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const { error } = await getSupabase().auth.updateUser({ password: newPassword })
      if (error) {
        setError(error.message)
      } else {
        setPasswordDone(true)
        router.push('/dashboard')
      }
    })
  }

  return (
    <div className="min-h-screen bg-lx-divider flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo-looox-grey.svg" alt="LoooX" width={200} height={96} unoptimized className="h-24 mx-auto mb-2" style={{ width: 'auto' }} />
          <p className="text-sm text-lx-text-secondary">Configurator</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-6 sm:p-8">
          {isRecovery ? (
            passwordDone ? (
              <div className="text-center py-2">
                <svg className="w-10 h-10 text-lx-cta mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                <p className="text-sm font-semibold text-lx-text-primary">Wachtwoord gewijzigd</p>
                <p className="text-sm text-lx-text-secondary mt-1">Je wordt doorgestuurd…</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-lx-text-primary mb-1">Nieuw wachtwoord instellen</h2>
                <p className="text-sm text-lx-text-secondary mb-6">Kies een nieuw wachtwoord voor je account.</p>
                <form onSubmit={handlePasswordReset} className="space-y-5">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-semibold text-lx-text-secondary mb-1.5">
                      Nieuw wachtwoord
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/40 focus:border-lx-cta transition-colors"
                      placeholder="Minimaal 8 tekens"
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
                    className="w-full bg-lx-cta text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Bezig…' : 'Wachtwoord opslaan'}
                  </button>
                </form>
              </>
            )
          ) : (
            <>
              <h2 className="text-lg font-semibold text-lx-text-primary mb-6">Inloggen</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-lx-text-secondary mb-1.5">
                    E-mailadres
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/40 focus:border-lx-cta transition-colors"
                    placeholder="naam@bedrijf.nl"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-lx-text-secondary mb-1.5">
                    Wachtwoord
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/40 focus:border-lx-cta transition-colors"
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
                  className="w-full bg-lx-cta text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lx-cta"
                >
                  {isPending ? 'Bezig met inloggen…' : 'Inloggen'}
                </button>
              </form>
            </>
          )}
        </div>

        {!isRecovery && (
          <p className="text-center text-sm text-lx-text-secondary mt-5">
            Nog geen toegang?{' '}
            <Link href="/register" className="text-lx-cta font-semibold hover:underline">
              Account aanvragen
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
