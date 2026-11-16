'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { signUp, zoekBedrijven, controleerBedrijf } from '@/lib/actions/auth'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Bedrijfsnaam: snelselectie van bestaande bedrijven, en een vraag bij een naam die al bestaat
  const [company, setCompany] = useState('')
  const [suggesties, setSuggesties] = useState<string[]>([])
  const [toonSuggesties, setToonSuggesties] = useState(false)
  const [vraag, setVraag] = useState<{ naam: string; soort: 'gelijk' | 'lijkt' } | null>(null)
  // Namen waarvan de gebruiker al zei: nee, dat is een ander bedrijf
  const [afgewezen, setAfgewezen] = useState<string[]>([])
  const [bedrijfFout, setBedrijfFout] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (company.trim().length < 3) { setSuggesties([]); return }
    let actueel = true
    const t = setTimeout(() => {
      zoekBedrijven(company).then((namen) => { if (actueel) setSuggesties(namen.filter((n) => n !== company.trim())) }).catch(() => {})
    }, 200)
    return () => { actueel = false; clearTimeout(t) }
  }, [company])

  function verstuur(formData: FormData, bedrijf: string) {
    const password = formData.get('password') as string
    startTransition(async () => {
      const result = await signUp({
        email: formData.get('email') as string,
        password,
        fullName: formData.get('fullName') as string,
        company: bedrijf,
        phone: formData.get('phone') as string,
      })
      if (result?.error) setError(result.error)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBedrijfFout(null)
    const formData = new FormData(e.currentTarget)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    startTransition(async () => {
      // Bestaat het bedrijf al onder een net andere naam, dan eerst vragen
      const match = await controleerBedrijf(company).catch(() => ({ soort: 'nieuw' as const }))
      if ((match.soort === 'gelijk' || match.soort === 'lijkt') && !afgewezen.includes(match.naam)) {
        setVraag({ naam: match.naam, soort: match.soort })
        return
      }
      if (match.soort === 'gelijk') {
        setBedrijfFout(`Er bestaat al een bedrijf met de naam "${match.naam}". Is jouw bedrijf een andere vestiging, zet dan de plaats achter de naam.`)
        return
      }
      verstuur(formData, company.trim())
    })
  }

  function sluitAan() {
    if (!vraag || !formRef.current) return
    const naam = vraag.naam
    setCompany(naam)
    setVraag(null)
    verstuur(new FormData(formRef.current), naam)
  }

  function anderBedrijf() {
    if (!vraag) return
    setAfgewezen((a) => [...a, vraag.naam])
    // Zelfde naam, alleen anders geschreven: dan moet de naam zelf het verschil maken
    if (vraag.soort === 'gelijk') setBedrijfFout(`Er bestaat al een bedrijf met de naam "${vraag.naam}". Is jouw bedrijf een andere vestiging, zet dan de plaats achter de naam.`)
    else if (formRef.current) verstuur(new FormData(formRef.current), company.trim())
    setVraag(null)
  }

  return (
    <div className="min-h-screen bg-lx-divider flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo-looox-grey.svg" alt="LoooX" width={200} height={96} unoptimized className="h-24 mx-auto mb-2" style={{ width: 'auto' }} />
          <p className="text-sm text-lx-text-secondary">Configurator</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-lx-text-primary">
              Account aanvragen
            </h2>
            <p className="text-sm text-lx-text-secondary mt-1">
              Na goedkeuring krijg je toegang tot de configurator.
            </p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                Naam
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                className="w-full px-3 py-2.5 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                placeholder="Jan de Vries"
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                Bedrijfsnaam
              </label>
              <div className="relative">
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="organization"
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); setToonSuggesties(true); setBedrijfFout(null) }}
                  onFocus={() => setToonSuggesties(true)}
                  onBlur={() => setTimeout(() => setToonSuggesties(false), 150)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setToonSuggesties(false) }}
                  aria-invalid={!!bedrijfFout}
                  aria-describedby="company-hulp"
                  className="w-full px-3 py-2.5 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                  placeholder="Sanitair BV"
                />
                {toonSuggesties && suggesties.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-lx-border rounded-lg shadow-md overflow-hidden" aria-label="Bestaande bedrijven">
                    <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-lx-text-secondary">Bestaat al bij LoooX</li>
                    {suggesties.map((naam) => (
                      <li key={naam}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setCompany(naam); setToonSuggesties(false); setBedrijfFout(null) }}
                          className="w-full text-left px-3 py-2 text-sm text-lx-text-primary hover:bg-lx-panel-bg cursor-pointer"
                        >
                          {naam}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p id="company-hulp" className={`text-xs mt-1.5 ${bedrijfFout ? 'text-red-600' : 'text-lx-text-secondary'}`}>
                {bedrijfFout ?? 'Werkt je bedrijf al met de configurator? Kies het dan uit de lijst.'}
              </p>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                Telefoonnummer{' '}
                <span className="text-xs text-lx-text-secondary font-normal">(optioneel)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="w-full px-3 py-2.5 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                placeholder="06 12345678"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                E-mailadres
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                placeholder="jan@sanitairbv.nl"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                Wachtwoord
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                  placeholder="Minimaal 8 tekens"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lx-text-secondary hover:text-lx-text-primary transition-colors" aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && <PasswordStrength password={password} />}
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-semibold text-lx-text-primary mb-1.5"
              >
                Wachtwoord bevestigen
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 border border-lx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lx-cta/30 focus:border-lx-cta transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lx-text-secondary hover:text-lx-text-primary transition-colors" aria-label={showConfirm ? 'Verberg wachtwoord' : 'Toon wachtwoord'}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {vraag && (
              <div role="alertdialog" aria-labelledby="bedrijf-vraag" className="bg-lx-panel-bg border border-lx-border rounded-lg px-3.5 py-3 space-y-2.5">
                <p id="bedrijf-vraag" className="text-sm text-lx-text-primary leading-relaxed">
                  <strong>{vraag.naam}</strong> bestaat al. Weet je zeker dat je jezelf aan dit bedrijf wil toevoegen?
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={sluitAan} disabled={isPending} className="flex-1 bg-lx-cta text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#2d5240] transition-colors cursor-pointer disabled:opacity-60">Ja, dit is mijn bedrijf</button>
                  <button type="button" onClick={anderBedrijf} disabled={isPending} className="flex-1 bg-white border border-lx-border text-lx-text-primary py-2 rounded-lg text-sm font-semibold hover:bg-lx-divider transition-colors cursor-pointer disabled:opacity-60">Nee, ander bedrijf</button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !!vraag}
              className="w-full flex items-center justify-center gap-2 bg-lx-cta text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2d5240] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lx-cta mt-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aanvraag versturen…</span>
                </>
              ) : 'Account aanvragen'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-lx-text-secondary mt-5">
          Al een account?{' '}
          <Link
            href="/login"
            className="text-lx-cta font-semibold hover:underline"
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
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-lx-cta'
  const label =
    score <= 1 ? 'Zwak' : score === 2 ? 'Matig' : score === 3 ? 'Goed' : 'Sterk'
  const labelColor =
    score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-500' : 'text-lx-cta'

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
              className={`w-3.5 h-3.5 flex-shrink-0 ${c.met ? 'text-lx-cta' : 'text-gray-300'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-xs ${c.met ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
