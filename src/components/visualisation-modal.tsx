'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
  generateVisualisation,
  getVisualisationStatus,
  setVisualisationInPdf,
  type VisualisationStatus,
} from '@/lib/actions/visualisations'
import { toast } from '@/components/toast'

// "Bekijk in badkamer" (epic badkamer-visualisatie, sprint 2).
// On-demand: stijl kiezen → genereren → beeld + vinkje voor de
// consumentenofferte. Teller toont dag- en bonustegoed (besluit V4).

export type VisualisationConfig = {
  shape: 'rechthoek' | 'rounded-rect' | 'rond'
  width: number
  height: number
  glasKleur: 'helder' | 'smoke-zwart' | 'smoke-brons'
  directPositions: string[]
  indirect: boolean
  lichtKelvin: 3000 | 4000
  frameColor?: 'aluminium' | 'zwart' | 'gun-metal' | 'brushed-brass' | 'brushed-copper' | null
}

export const VISUALISATION_SHAPES = ['rechthoek', 'rounded-rect', 'rond']

export function VisualisationButton({ config, configurationId, variant = 'knop' }: {
  config: VisualisationConfig
  configurationId?: string | null
  variant?: 'knop' | 'icoon'
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {variant === 'knop' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-lx-cta/40 text-lx-cta text-[13px] font-semibold hover:bg-lx-icon-bg transition-colors"
        >
          <CameraIcon />
          Bekijk in badkamer
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Bekijk in badkamer"
          className="w-7 h-7 rounded-lg hover:bg-lx-icon-bg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta transition-colors cursor-pointer"
        >
          <CameraIcon />
        </button>
      )}
      {open && (
        <VisualisationModal config={config} configurationId={configurationId} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.66-.9l.82-1.2A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function VisualisationModal({ config, configurationId, onClose }: {
  config: VisualisationConfig
  configurationId?: string | null
  onClose: () => void
}) {
  const [status, setStatus] = useState<VisualisationStatus | null>(null)
  const [sceneId, setSceneId] = useState<string>('japandi')
  const [loading, setLoading] = useState(false)
  // Resultaat per stijl onthouden — zo kun je gratis wisselen tussen al
  // gegenereerde stijlen zonder credit te verbruiken
  const [results, setResults] = useState<Record<string, { url: string; visualisationId: string; inPdf: boolean }>>({})
  const result = results[sceneId] ?? null
  const inPdf = result?.inPdf ?? false

  useEffect(() => {
    getVisualisationStatus().then(s => {
      setStatus(s)
      if (s.scenes.length > 0 && !s.scenes.some(sc => sc.id === 'japandi')) setSceneId(s.scenes[0].id)
    }).catch(() => toast('Status ophalen mislukt'))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const tegoedOp = status != null && status.dailyUsed >= status.dailyLimit && status.bonus <= 0

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await generateVisualisation({ configurationId: configurationId ?? null, sceneId, config })
      setResults(r => ({ ...r, [sceneId]: { url: res.url, visualisationId: res.visualisationId, inPdf: false } }))
      setStatus(s => s ? { ...s, dailyUsed: res.dailyUsed, bonus: res.bonus } : s)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Genereren mislukt. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  async function handleInPdf(checked: boolean) {
    if (!result) return
    setResults(r => ({ ...r, [sceneId]: { ...r[sceneId], inPdf: checked } }))
    try {
      await setVisualisationInPdf(result.visualisationId, checked)
    } catch {
      setResults(r => ({ ...r, [sceneId]: { ...r[sceneId], inPdf: !checked } }))
      toast('Opslaan van de offerte-keuze mislukt')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-lx-divider">
          <div>
            <h2 className="text-[17px] font-bold text-lx-text-primary">Bekijk in badkamer</h2>
            <p className="text-[12px] text-lx-text-secondary mt-0.5">
              Jouw spiegel op ware grootte in een badkamer geplaatst
            </p>
          </div>
          <button onClick={onClose} aria-label="Sluiten" className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
            <X size={17} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Stijlkeuze */}
          <div>
            <p className="text-[12px] font-semibold text-lx-text-secondary mb-2">Stijl</p>
            <div className="flex gap-1 bg-lx-panel-bg rounded-xl p-1 w-fit" role="radiogroup" aria-label="Badkamerstijl">
              {(status?.scenes ?? [{ id: 'japandi', name: 'Japandi' }]).map(s => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={sceneId === s.id}
                  onClick={() => setSceneId(s.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    sceneId === s.id ? 'bg-white text-lx-text-primary shadow-sm border border-black/6' : 'text-lx-text-secondary hover:text-lx-text-primary'
                  }`}
                >
                  {s.name}
                  {results[s.id] && <span className="w-1.5 h-1.5 rounded-full bg-lx-cta" title="Al gegenereerd" />}
                </button>
              ))}
            </div>
          </div>

          {/* Beeld of placeholder */}
          {result ? (
            <div className="space-y-3">
              <Image
                src={result.url}
                alt="Spiegel in badkamer"
                width={1800}
                height={1332}
                unoptimized
                className="w-full rounded-xl border border-black/6"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative flex-shrink-0">
                    <input type="checkbox" checked={inPdf} onChange={e => handleInPdf(e.target.checked)} className="sr-only peer" />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta/40 ${inPdf ? 'bg-lx-cta border-lx-cta' : 'bg-white border-black/20'}`}>
                      {inPdf && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[13px] text-lx-text-primary font-medium">Toon in consumentenofferte</span>
                </label>
                <a
                  href={result.url}
                  download
                  className="text-[12.5px] font-semibold text-lx-cta hover:underline"
                >
                  Download beeld
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/15 bg-lx-panel-bg/50 px-6 py-12 text-center">
              <p className="text-[13px] text-lx-text-secondary">
                Kies een stijl en klik op genereren. Het beeld toont jouw{' '}
                {config.shape === 'rond' ? `ronde spiegel ∅ ${config.width} cm` : `spiegel van ${config.width} × ${config.height} cm`} op ware grootte.
              </p>
            </div>
          )}

          {/* Genereren + teller */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={handleGenerate}
              disabled={loading || tegoedOp}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Genereren…
                </>
              ) : result ? 'Opnieuw genereren' : 'Genereer visualisatie'}
            </button>
            {status && (
              <p className="text-[12px] text-lx-text-secondary">
                Vandaag nog <span className="font-semibold text-lx-text-primary">{Math.max(0, status.dailyLimit - status.dailyUsed)}</span> beschikbaar
                {status.bonus > 0 && <> · <span className="font-semibold text-lx-text-primary">+{status.bonus}</span> gespaard</>}
              </p>
            )}
          </div>
          {tegoedOp && (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              Je visualisaties voor vandaag zijn op. Morgen staan er weer 4 klaar, en elke geplaatste bestelling levert er 2 extra op.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
