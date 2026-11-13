'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Paperclip, Sparkles, X } from 'lucide-react'
import { analyzeMeubelWithAI } from '@/lib/actions/meubel-ai'
import { comprimeerAfbeelding } from '@/lib/comprimeer-afbeelding'
import type { MeubelVoorstel } from '@/lib/meubel-ai'

// Het hulpje boven de categoriekaarten: de dealer omschrijft wat hij zoekt, met of
// zonder schets. Eén meubel opent ingevuld in de configurator; bij meer producten
// maakt de server een project en lopen ze de regels daar na.

const BEELD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BEELD_MAX = 10 * 1024 * 1024

function naarBase64(bestand: File): Promise<string> {
  return new Promise((klaar, fout) => {
    const lezer = new FileReader()
    lezer.onload = () => klaar(String(lezer.result).split(',')[1] ?? '')
    lezer.onerror = () => fout(lezer.error)
    lezer.readAsDataURL(bestand)
  })
}

type Uitkomst =
  | { soort: 'fout'; tekst: string }
  | { soort: 'project'; projectId: string; aantal: number; meldingen: string[] }
  | { soort: 'spiegel'; meldingen: string[] }

export default function MeubelAiBalk({ projectId, onVoorstel }: {
  projectId?: string | null
  onVoorstel: (voorstel: MeubelVoorstel, meldingen: string[]) => void
}) {
  const [tekst, setTekst] = useState('')
  const [beeld, setBeeld] = useState<File | null>(null)
  const [uitkomst, setUitkomst] = useState<Uitkomst | null>(null)
  const [bezig, start] = useTransition()
  const bestandRef = useRef<HTMLInputElement>(null)
  const kan = (tekst.trim().length > 0 || beeld !== null) && !bezig

  function kiesBeeld(bestand: File | undefined) {
    if (!bestand) return
    if (!BEELD_TYPES.includes(bestand.type)) return setUitkomst({ soort: 'fout', tekst: 'Gebruik een JPG, PNG, WEBP of GIF.' })
    if (bestand.size > BEELD_MAX) return setUitkomst({ soort: 'fout', tekst: 'De afbeelding is te groot (maximaal 10 MB).' })
    setUitkomst(null)
    setBeeld(bestand)
  }

  function verstuur() {
    if (!kan) return
    setUitkomst(null)
    start(async () => {
      try {
        const klein = beeld ? await comprimeerAfbeelding(beeld) : null
        const r = await analyzeMeubelWithAI({
          description: tekst.trim() || null,
          imageBase64: klein ? await naarBase64(klein) : null,
          imageMimeType: klein?.type ?? null,
          projectId: projectId ?? null,
        })
        if (!r.success) setUitkomst({ soort: 'fout', tekst: r.error })
        else if (r.soort === 'meubel') onVoorstel(r.voorstel, r.meldingen)
        else if (r.soort === 'project') setUitkomst({ soort: 'project', projectId: r.projectId, aantal: r.aantal, meldingen: r.meldingen })
        else setUitkomst({ soort: 'spiegel', meldingen: r.meldingen })
      } catch (e) {
        console.error(e)
        setUitkomst({ soort: 'fout', tekst: 'Er ging iets mis. Probeer het opnieuw of stel het meubel zelf samen.' })
      }
    })
  }

  return (
    <div className="mb-6">
      <div className={`bg-white rounded-[18px] border shadow-sm transition-colors ${bezig ? 'border-lx-cta' : 'border-black/6 focus-within:border-lx-cta'}`}>
        <div className="flex items-start gap-3 px-4 pt-3.5">
          <Sparkles size={18} className="text-lx-cta mt-1 flex-shrink-0" aria-hidden="true" />
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); verstuur() } }}
            disabled={bezig}
            rows={2}
            maxLength={3000}
            aria-label="Omschrijf wat je zoekt"
            placeholder="Omschrijf wat je zoekt. Bijvoorbeeld: Facet van 160 cm met 2 lades in Black, een waskom erbij en een ronde spiegel van 80 cm."
            className="flex-1 min-w-0 resize-none bg-transparent text-[14px] leading-relaxed text-lx-text-primary placeholder:text-lx-text-muted outline-none disabled:opacity-60"
          />
        </div>
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          <input ref={bestandRef} type="file" accept={BEELD_TYPES.join(',')} className="hidden" onChange={(e) => { kiesBeeld(e.target.files?.[0]); e.target.value = '' }} />
          {beeld ? (
            <span className="inline-flex items-center gap-1.5 max-w-[60%] rounded-lg bg-lx-panel-bg pl-2.5 pr-1 py-1 text-[12px] text-lx-text-primary">
              <Paperclip size={12} className="flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{beeld.name}</span>
              <button type="button" onClick={() => setBeeld(null)} disabled={bezig} aria-label="Schets verwijderen" className="p-1 rounded hover:bg-black/5 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => bestandRef.current?.click()}
              disabled={bezig}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-lx-text-secondary hover:bg-lx-panel-bg hover:text-lx-text-primary transition-colors cursor-pointer disabled:opacity-60"
            >
              <Paperclip size={14} aria-hidden="true" /> Schets of foto
            </button>
          )}
          <button
            type="button"
            onClick={verstuur}
            disabled={!kan}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bezig ? 'Het hulpje stelt samen…' : <>Stel samen <ArrowRight size={14} aria-hidden="true" /></>}
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {bezig && <p className="text-[12px] text-lx-text-secondary mt-2 px-1">Dit duurt enkele seconden. Bij meerdere producten iets langer.</p>}
        {uitkomst?.soort === 'fout' && (
          <p className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mt-2">{uitkomst.tekst}</p>
        )}
        {uitkomst?.soort === 'spiegel' && (
          <div className="text-[12.5px] text-lx-text-primary bg-white border border-black/6 rounded-xl px-4 py-3 mt-2">
            <p>Dit is een spiegel. Die stel je samen in de spiegelconfigurator, daar helpt het hulpje ook.</p>
            <Link href={projectId ? `/configurator/nieuw?project=${projectId}` : '/configurator/nieuw'} className="inline-flex items-center gap-1 font-semibold text-lx-cta hover:underline mt-1">
              Naar de spiegelconfigurator <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        )}
        {uitkomst?.soort === 'project' && (
          <div className="text-[12.5px] text-lx-text-primary bg-white border border-lx-cta/40 rounded-xl px-4 py-3 mt-2">
            <p className="font-semibold">{uitkomst.aantal} {uitkomst.aantal === 1 ? 'product staat' : 'producten staan'} klaar in een project.</p>
            <p className="text-lx-text-secondary mt-0.5">Loop elke regel na en sla hem op. Daarna kun je bestellen.</p>
            {uitkomst.meldingen.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-amber-800">
                {uitkomst.meldingen.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
            <Link href={`/projecten/${uitkomst.projectId}`} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors mt-3">
              Naar het project <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
