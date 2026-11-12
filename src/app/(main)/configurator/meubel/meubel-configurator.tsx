'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  MEUBEL_MODELLEN, HOUTKLEUREN, HOUTKLEUR_DEFAULT,
  getLengteBereik, getLadeOpties, ladeLabel, calcMeubelBrutoCents, formatCents,
  type MeubelModel,
} from '@/lib/meubel-config'

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

  const lengte = /^\d+$/.test(lengteTekst) ? Number(lengteTekst) : NaN
  const lengteOk = lengte >= bereik.min && lengte <= bereik.max
  const opties = lengteOk ? getLadeOpties(model, lengte) : []
  // Vervalt de gekozen indeling bij een andere lengte, dan de eerste die wel kan
  const gekozen = opties.includes(lades) ? lades : opties[0]
  const bruto = gekozen ? calcMeubelBrutoCents({ modelId: model.id, lengte, lades: gekozen, houtkleur }, factor) : null

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-semibold text-lx-text-secondary hover:text-lx-text-primary transition-colors cursor-pointer mb-4">
        <ArrowLeft size={15} /> Ander model
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="relative aspect-[4/3] bg-lx-panel-bg">
            <Image src={model.afbeelding} alt={model.naam} fill priority sizes="(min-width: 1024px) 620px, 100vw" className="object-contain p-8" />
          </div>
          <p className="px-5 py-3 text-[12px] text-lx-text-muted">Voorbeeldfoto van het model. De tekening op maat volgt in de volgende stap.</p>
        </div>

        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-5">
          <div>
            <h1 className="text-[18px] font-bold text-lx-text-primary tracking-tight">{model.naam}</h1>
            <p className="text-[12.5px] text-lx-text-secondary mt-0.5">Hoogte {model.hoogte} cm · diepte {model.diepte} cm</p>
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
            {opties.length > 0 ? (
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
            ) : (
              <p className="text-[12.5px] text-lx-text-muted">Vul eerst een geldige lengte in.</p>
            )}
            {gekozen && (
              <p className="text-[12px] text-lx-text-muted mt-1.5">
                Gelijk verdeeld: {(lengte / gekozen).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} cm per lade.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="meubel-houtkleur" className="block text-[13px] font-medium text-lx-text-primary mb-1.5">Houtkleur</label>
            <select
              id="meubel-houtkleur"
              value={houtkleur}
              onChange={(e) => setHoutkleur(e.target.value)}
              className="w-full h-10 rounded-xl border border-black/10 text-[13px] text-lx-text-primary bg-white px-3 outline-none focus:border-lx-cta cursor-pointer"
            >
              {HOUTKLEUREN.map((k) => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>

          <div className="pt-4 border-t border-lx-divider">
            <p className="text-[12px] text-lx-text-secondary">Brutoprijs per stuk, excl. btw</p>
            <p className="text-[26px] font-bold text-lx-text-primary tracking-tight tabular-nums" aria-live="polite">
              {bruto !== null ? formatCents(bruto) : 'Geen prijs'}
            </p>
          </div>

          <p className="text-[12px] text-lx-text-muted leading-relaxed">
            Testversie. Opslaan als offerte en bestellen volgen in de volgende fase.
          </p>
          <Link href="/configuraties" className="block text-center h-10 leading-10 rounded-xl border border-black/10 text-[13px] font-semibold text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
            Terug naar overzicht
          </Link>
        </div>
      </div>
    </>
  )
}
