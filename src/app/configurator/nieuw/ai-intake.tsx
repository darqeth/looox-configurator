'use client'
import { useState, useRef, useCallback } from 'react'
import { analyzeSpiegelWithAI } from '@/lib/actions/ai-configurator'
import { SHAPES, EXTRA_OPTIONS, ORGANIC_SIZES } from '@/lib/configurator-config'
import type { AISuggestion } from '@/lib/types/ai-configurator'

interface AIIntakeProps {
  onConfirm: (suggestion: AISuggestion, imageFile: File | null) => void
  onBack: () => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const POSITION_LABELS: Record<string, string> = {
  geen: 'Geen',
  boven: 'Boven',
  'boven-beneden': 'Boven & onder',
  'links-rechts': 'Links & rechts',
  rondom: 'Rondom',
  onder: 'Onder',
}

const LIGHT_TYPE_LABELS: Record<string, string> = {
  '3000k': '3000K warm wit',
  '4000k': '4000K neutraal wit',
  rgbw: 'RGBW kleur',
  cct: 'CCT instelbaar',
}

const CONTROL_LABELS: Record<string, string> = {
  'externe-schakeling': 'Externe schakelaar',
  'tip-touch': 'Tip-touch sensor',
  '3-staps-dimmer': '3-staps dimmer',
  'wip-schakelaar': 'Wipschakelaar',
  'motion-sensor': 'Bewegingssensor',
  afstandsbediening: 'Afstandsbediening',
}

const GLAS_KLEUR_LABELS: Record<string, string> = {
  helder: 'Helder',
  'smoke-zwart': 'Smoke Zwart',
  'smoke-brons': 'Smoke Brons',
}

function formatLightField(light: AISuggestion['directLight']): string {
  if (!light || light.position === 'geen') return 'Geen'
  const parts = [
    POSITION_LABELS[light.position] ?? light.position,
    light.type ? (LIGHT_TYPE_LABELS[light.type] ?? light.type) : null,
    light.control ? (CONTROL_LABELS[light.control] ?? light.control) : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

function formatDimensions(s: AISuggestion): string {
  if (s.shape === 'rond' || s.shape === 'sol' || s.shape === 'luna') {
    return s.diameter ? `ø${s.diameter} cm` : '—'
  }
  if (s.shape === 'organic') {
    const organic = ORGANIC_SIZES.find(o => o.key === s.organicSizeKey)
    return organic ? organic.label : (s.organicSizeKey ?? '—')
  }
  if (s.width && s.height) return `${s.width} × ${s.height} cm`
  if (s.width) return `${s.width} cm breed`
  if (s.height) return `${s.height} cm hoog`
  return '—'
}

export function AIIntake({ onConfirm, onBack }: AIIntakeProps) {
  const [phase, setPhase] = useState<'input' | 'loading' | 'review' | 'error'>('input')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!file.type.startsWith('image/')) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Gebruik een JPG, PNG, WEBP of GIF afbeelding.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Afbeelding is te groot (max. 10 MB)')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleRotate = useCallback(() => {
    if (!imageFile) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext('2d')!
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      canvas.toBlob(blob => {
        if (!blob) return
        const rotated = new File([blob], imageFile.name, { type: 'image/jpeg' })
        setImageFile(rotated)
        setImagePreview(URL.createObjectURL(rotated))
      }, 'image/jpeg', 0.92)
    }
    img.src = imagePreview!
  }, [imageFile, imagePreview])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  async function handleAnalyze() {
    setPhase('loading')
    let imageBase64: string | null = null
    let imageMimeType: string | null = null
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile)
      imageMimeType = imageFile.type
    }
    const result = await analyzeSpiegelWithAI({
      description: description.trim() || null,
      imageBase64,
      imageMimeType,
    })
    if (result.success) {
      setSuggestion(result.result)
      setPhase('review')
    } else {
      setErrorMsg(result.error)
      setPhase('error')
    }
  }

  const canAnalyze = description.trim().length > 0 || imageFile !== null

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <img
            src="/loop_ai_config.gif"
            alt=""
            className="w-full rounded-xl mb-5 object-cover"
          />
          <p className="text-[16px] font-semibold text-lx-text-primary mb-1">Het LoooX hulpje is jouw spiegel aan het samenstellen…</p>
          <p className="text-[13px] text-lx-text-secondary">Dit duurt enkele seconden</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-[16px] font-semibold text-lx-text-primary mb-2">Analyse mislukt</p>
          <p className="text-[13px] text-lx-text-secondary mb-6">{errorMsg}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="px-4 py-2 text-[13px] text-lx-text-secondary border border-lx-divider rounded-xl hover:bg-lx-icon-bg cursor-pointer transition-colors">
              Terug
            </button>
            <button onClick={() => setPhase('input')} className="px-4 py-2 text-[13px] font-semibold bg-lx-cta text-white rounded-xl hover:opacity-90 cursor-pointer transition-opacity">
              Probeer opnieuw
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'review' && suggestion) {
    const shapeName = SHAPES.find(s => s.slug === suggestion.shape)?.name ?? suggestion.shape
    const optionNames = (suggestion.selectedOptions ?? [])
      .map(id => EXTRA_OPTIONS.find(o => o.id === id)?.name ?? id)
      .join(', ')

    const reviewRows: { label: string; value: string }[] = [
      { label: 'Vorm', value: shapeName },
      { label: 'Afmeting', value: formatDimensions(suggestion) },
      { label: 'Glaskleur', value: GLAS_KLEUR_LABELS[suggestion.glasKleur] ?? suggestion.glasKleur },
      { label: 'Directe verlichting', value: formatLightField(suggestion.directLight) },
      { label: 'Indirecte verlichting', value: formatLightField(suggestion.indirectLight) },
      { label: 'Opties', value: optionNames || 'Geen' },
    ]

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h2 className="text-[18px] font-bold text-lx-text-primary mb-1">LoooX hulpje heeft deze spiegel voor jou samengesteld</h2>
          <p className="text-[13px] text-lx-text-secondary mb-4">Controleer de voorgestelde configuratie — je kunt alles nog aanpassen in de wizard.</p>

          <div className="rounded-xl overflow-hidden mb-4 space-y-0">
            {reviewRows.map((row) => (
              <div key={row.label} className="flex items-start gap-4 px-4 py-2.5 text-[13px]">
                <span className="text-lx-text-secondary w-36 flex-shrink-0">{row.label}</span>
                <span className="text-lx-text-primary font-medium">{row.value}</span>
              </div>
            ))}
          </div>

          {(suggestion.confidenceNotes ?? []).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              {(suggestion.confidenceNotes ?? []).map((note, i) => (
                <p key={i} className="text-[12px] text-amber-800">⚠ {note}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPhase('input')}
              className="px-4 py-2.5 text-[13px] text-lx-text-secondary border border-lx-divider rounded-xl hover:bg-lx-icon-bg cursor-pointer transition-colors"
            >
              Aanpassen
            </button>
            <button
              onClick={() => onConfirm(suggestion, imageFile)}
              className="px-5 py-2.5 text-[13px] font-semibold bg-lx-cta text-white rounded-xl hover:opacity-90 cursor-pointer transition-opacity flex items-center gap-2"
            >
              Bevestigen
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Input phase
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-lx-text-secondary hover:text-lx-text-primary cursor-pointer transition-colors mb-4"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Terug
        </button>

        <h2 className="text-[18px] font-bold text-lx-text-primary mb-1">LoooX hulpje</h2>
        <p className="text-[13px] text-lx-text-secondary mb-5">Beschrijf jouw spiegel en/of upload een schets. Hoe meer detail, hoe beter de configuratie.</p>

        {/* Beschrijving */}
        <div className="mb-4">
          <label className="block text-[12px] font-semibold text-lx-text-secondary uppercase tracking-widest mb-2">
            Beschrijving <span className="font-normal normal-case tracking-normal">(optioneel)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Bijv. ronde spiegel ø80cm, indirecte LED rondom in 3000K met tip-touch, verwarming en smoke-zwart glas"
            rows={3}
            className="w-full border border-lx-divider rounded-xl px-4 py-3 text-[13px] text-lx-text-primary placeholder:text-lx-text-muted focus:outline-none focus:border-lx-cta resize-none transition-colors"
          />
        </div>

        {/* Upload */}
        <div className="mb-6">
          <label className="block text-[12px] font-semibold text-lx-text-secondary uppercase tracking-widest mb-2">
            Schets of foto <span className="font-normal normal-case tracking-normal">(optioneel)</span>
          </label>
          {imagePreview ? (
            <div className="border border-lx-divider rounded-xl overflow-hidden">
            <div className="relative">
              <img src={imagePreview} alt="Geüpload" className="w-full max-h-48 object-contain bg-lx-icon-bg" />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={handleRotate}
                  className="bg-white/90 hover:bg-white border border-lx-divider rounded-lg p-1.5 cursor-pointer transition-colors"
                  aria-label="Foto 90° draaien"
                  title="Foto draaien"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                </button>
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="bg-white/90 hover:bg-white border border-lx-divider rounded-lg p-1.5 cursor-pointer transition-colors"
                  aria-label="Afbeelding verwijderen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <p className="px-4 py-2.5 text-[12px] text-lx-text-secondary bg-lx-icon-bg border-t border-lx-divider">
              Gebruik de <svg className="inline w-3 h-3 mx-0.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> roteerknop voor de juiste oriëntatie en een beter resultaat.
            </p>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-lx-cta bg-lx-icon-bg' : 'border-lx-divider hover:border-lx-cta hover:bg-lx-icon-bg'}`}
            >
              <svg className="mx-auto mb-2 text-lx-text-muted" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[13px] text-lx-text-secondary">Sleep een afbeelding hiernaartoe of <span className="text-lx-cta font-medium">klik om te uploaden</span></p>
              <p className="text-[11px] text-lx-text-muted mt-1">JPG, PNG, WEBP, GIF — max. 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="px-5 py-2.5 text-[13px] font-semibold bg-lx-cta text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity flex items-center gap-2"
          >
            Analyseren
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
