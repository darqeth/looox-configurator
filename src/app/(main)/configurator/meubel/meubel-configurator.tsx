'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  MEUBEL_MODELLEN, HOUTKLEUREN, HOUTKLEUR_DEFAULT,
  getLengteBereik, getLadeOpties, ladeLabel, getMeubelPrijsOpbouw, houtkleurAfbeelding, formatCents,
  type MeubelModel,
} from '@/lib/meubel-config'
import { MeubelTekening } from './meubel-tekening'

// Fase 1: model kiezen, lengte en lades invoeren, brutoprijs zien.
// Hier staat alleen bruto (netto × factor); netto komt pas in de bestelstap.

export default function MeubelConfigurator({ factor }: { factor: number }) {
  const [model, setModel] = useState<MeubelModel | null>(null)

  return (
    <div className="min-h-screen bg-lx-divider p-4 sm:p-6 lg:p-7">
      <div className="w-full max-w-5xl mx-auto">
        {model ? (
          <MeubelDetail model={model} factor={factor} onBack={() => setModel(null)} />
        ) : (
          <>
            <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Nieuw meubel</h1>
            <p className="text-[13px] text-lx-text-secondary mt-1 mb-5">Kies een model uit de Tailor-Made collectie.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MEUBEL_MODELLEN.map((m) => {
                const bereik = getLengteBereik(m)
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m)}
                    className="text-left bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden hover:border-lx-cta transition-colors cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] bg-lx-panel-bg">
                      <Image src={m.afbeelding} alt={m.naam} fill sizes="(min-width: 640px) 480px, 100vw" className="object-contain p-5" />
                    </div>
                    <div className="px-5 py-4">
                      <p className="font-semibold text-lx-text-primary text-[15px]">{m.naam}</p>
                      <p className="text-[13px] text-lx-text-secondary mt-0.5">{m.omschrijving}</p>
                      <p className="text-[12px] text-lx-text-muted mt-2">
                        Lengte {bereik.min} tot {bereik.max} cm · hoogte {m.hoogte} cm · diepte {m.diepte} cm
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MeubelDetail({ model, factor, onBack }: { model: MeubelModel; factor: number; onBack: () => void }) {
  const bereik = getLengteBereik(model)
  const [lengteTekst, setLengteTekst] = useState('120')
  const [lades, setLades] = useState(2)
  const [houtkleur, setHoutkleur] = useState(HOUTKLEUR_DEFAULT)
  // Laatste geldige lengte: de tekening blijft staan terwijl je typt
  const [laatsteLengte, setLaatsteLengte] = useState(120)

  const lengte = /^\d+$/.test(lengteTekst) ? Number(lengteTekst) : NaN
  const lengteOk = lengte >= bereik.min && lengte <= bereik.max
  if (lengteOk && lengte !== laatsteLengte) setLaatsteLengte(lengte)
  const tekenLengte = lengteOk ? lengte : laatsteLengte

  const opties = getLadeOpties(model, tekenLengte)
  // Vervalt de gekozen indeling bij een andere lengte, dan de eerste die wel kan
  const gekozen = opties.includes(lades) ? lades : opties[0]
  const opbouw = lengteOk ? getMeubelPrijsOpbouw({ modelId: model.id, lengte, lades: gekozen, houtkleur }, factor) : null
  const kleurNaam = HOUTKLEUREN.find((k) => k.id === houtkleur)?.naam ?? ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
      <div className="bg-white rounded-2xl border border-black/8 shadow-sm p-5 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-[72px] shrink-0 rounded-xl bg-lx-panel-bg overflow-hidden">
            <Image src={model.afbeelding} alt="" fill sizes="96px" className="object-contain p-1.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold text-lx-text-primary tracking-tight">{model.naam}</h1>
            <p className="text-[12.5px] text-lx-text-secondary mt-0.5">Hoogte {model.hoogte} cm · diepte {model.diepte} cm</p>
            <button onClick={onBack} className="flex items-center gap-1 text-[12.5px] font-semibold text-lx-cta hover:underline cursor-pointer mt-1">
              <ArrowLeft size={13} /> Ander model
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="meubel-lengte" className="block text-[13px] font-medium text-lx-text-primary mb-1.5">Lengte</label>
          <div className="flex items-center gap-2">
            <input
              id="meubel-lengte"
              inputMode="numeric"
              value={lengteTekst}
              onChange={(e) => setLengteTekst(e.target.value.replace(/\D/g, '').slice(0, 3))}
              aria-invalid={!lengteOk}
              aria-describedby="meubel-lengte-hulp"
              className={`w-24 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${lengteOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
            />
            <span className="text-[13px] text-lx-text-secondary">cm</span>
          </div>
          <p id="meubel-lengte-hulp" className={`text-[12px] mt-1.5 ${lengteOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
            Hele centimeters, van {bereik.min} tot {bereik.max} cm.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Lades</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Aantal lades">
            {opties.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={gekozen === n}
                onClick={() => setLades(n)}
                className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                  gekozen === n
                    ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                    : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                }`}
              >
                {ladeLabel(model, n)}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-lx-text-muted mt-1.5">Welke indelingen kunnen, hangt af van de lengte.</p>
        </div>

        <div>
          <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">
            Houtkleur <span className="font-normal text-lx-text-secondary">· {kleurNaam}</span>
          </p>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Houtkleur">
            {HOUTKLEUREN.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={houtkleur === k.id}
                aria-label={k.naam}
                title={k.naam}
                onClick={() => setHoutkleur(k.id)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer transition-shadow ${
                  houtkleur === k.id ? 'ring-2 ring-lx-cta ring-offset-2' : 'ring-1 ring-black/10 hover:ring-black/30'
                }`}
              >
                <Image src={houtkleurAfbeelding(k.id)} alt="" fill sizes="48px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-lx-text-muted leading-relaxed pt-4 border-t border-lx-divider">
          Testversie. Opslaan als offerte en bestellen volgen in de volgende fase.{' '}
          <Link href="/configuraties" className="font-semibold text-lx-text-secondary hover:underline">Terug naar overzicht</Link>
        </p>
      </div>

      <div className="lg:sticky lg:top-6 space-y-4">
        {/* Tekening */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-4">
          <MeubelTekening model={model} lengte={tekenLengte} lades={gekozen} houtkleur={houtkleur} />
          <p className="text-[11px] text-lx-text-secondary text-center">Vooraanzicht, maten in cm · diepte {model.diepte} cm</p>
        </div>

        {/* Prijs */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Bruto ex. BTW</p>
            <p className="text-[28px] font-bold text-lx-text-primary tabular-nums" aria-live="polite">
              {opbouw ? formatCents(opbouw.totaal) : 'Geen prijs'}
            </p>
            <p className="text-[11px] text-lx-text-secondary mt-0.5">{opbouw ? 'Per stuk, excl. btw' : 'Vul een geldige lengte in.'}</p>
          </div>
          {opbouw && (
            <div className="space-y-1.5 border-t border-lx-divider pt-3">
              {opbouw.regels.map((regel) => (
                <div key={regel.label} className="flex justify-between gap-2 text-[12px]">
                  <span className="text-lx-text-secondary truncate">{regel.label}</span>
                  <span className="text-lx-text-primary font-semibold flex-shrink-0 tabular-nums">{formatCents(regel.cents)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-lx-divider mt-1.5">
                <span className="text-lx-text-primary">Bruto totaal</span>
                <span className="text-lx-cta tabular-nums">{formatCents(opbouw.totaal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
