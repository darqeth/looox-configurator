'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { sendSupportRequest, getMyConfigs, type SupportType } from '@/lib/actions/support'

type Config = { id: string; name: string; width: number | null; height: number | null }

const TYPE_OPTIONS: { id: SupportType; label: string; desc: string; color: string }[] = [
  { id: 'probleem',  label: 'Probleem',         desc: 'Iets werkt niet of geeft een fout',    color: '#DC2626' },
  { id: 'vraag',     label: 'Algemene vraag',    desc: 'Vraag over de configurator of proces', color: '#2563EB' },
  { id: 'technisch', label: 'Technische vraag',  desc: 'Technisch probleem of bug',            color: '#D97706' },
  { id: 'feature',   label: 'Feature request',   desc: 'Idee of wens voor nieuwe functie',     color: '#7C3AED' },
]

function configDims(c: Config) {
  if (c.width && c.height) return `${c.width} × ${c.height} cm`
  return ''
}

export default function SupportButton() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [type, setType] = useState<SupportType | null>(null)
  const [urgent, setUrgent] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [configId, setConfigId] = useState('')
  const [configs, setConfigs] = useState<Config[] | null>(null)
  const [screenshot, setScreenshot] = useState<{ base64: string; name: string } | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Load configs when modal opens
  useEffect(() => {
    if (open && configs === null) {
      getMyConfigs().then(setConfigs).catch(() => setConfigs([]))
    }
  }, [open, configs])

  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setStep('type')
      setType(null)
      setUrgent(false)
      setSubject('')
      setDescription('')
      setConfigId('')
      setScreenshot(null)
      setDone(false)
    }, 300)
  }

  function handleTypeSelect(t: SupportType) {
    setType(t)
    setStep('form')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Screenshot mag maximaal 2 MB zijn.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip data URL prefix — keep only base64 payload
      const base64 = result.split(',')[1]
      setScreenshot({ base64, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit() {
    if (!type || !subject.trim() || !description.trim()) return
    startTransition(async () => {
      const result = await sendSupportRequest({
        type,
        urgent,
        subject: subject.trim(),
        description: description.trim(),
        configId: configId || undefined,
        screenshotBase64: screenshot?.base64,
        screenshotName: screenshot?.name,
      })
      if (result.success) setDone(true)
    })
  }

  const canSubmit = type && subject.trim().length > 0 && description.trim().length > 0

  const selectedType = TYPE_OPTIONS.find(t => t.id === type)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-lx-cta text-white text-[13px] font-semibold shadow-lg hover:bg-lx-cta-hover transition-all hover:scale-105 active:scale-95"
        title="Support"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
        </svg>
        <span>Hulp</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-lx-divider">
              <div className="flex items-center gap-2.5">
                {step === 'form' && (
                  <button
                    onClick={() => setStep('type')}
                    className="text-lx-text-muted hover:text-lx-text-primary transition-colors -ml-0.5 mr-0.5"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                )}
                <p className="text-[14px] font-semibold text-lx-text-primary">
                  {done ? 'Verstuurd!' : step === 'type' ? 'Hoe kunnen we je helpen?' : selectedType?.label}
                </p>
                {step === 'form' && selectedType && !done && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${selectedType.color}15`, color: selectedType.color }}>
                    {selectedType.label}
                  </span>
                )}
              </div>
              <button onClick={handleClose} className="text-lx-text-muted hover:text-lx-text-primary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {done ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-lx-cta/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[15px] font-semibold text-lx-text-primary mb-1">Je verzoek is verstuurd</p>
                  <p className="text-[13px] text-lx-text-secondary">We nemen zo snel mogelijk contact met je op via e-mail.</p>
                  <button onClick={handleClose} className="mt-6 px-6 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-all">
                    Sluiten
                  </button>
                </div>
              ) : step === 'type' ? (
                <div className="p-4 grid grid-cols-2 gap-2.5">
                  {TYPE_OPTIONS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTypeSelect(t.id)}
                      className="text-left p-4 rounded-xl border border-black/8 hover:border-lx-cta/40 hover:bg-lx-cta/4 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ background: `${t.color}15` }}>
                        {t.id === 'probleem' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>}
                        {t.id === 'vraag' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                        {t.id === 'technisch' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>}
                        {t.id === 'feature' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                      </div>
                      <p className="text-[13px] font-semibold text-lx-text-primary mb-0.5">{t.label}</p>
                      <p className="text-[11.5px] text-lx-text-muted leading-snug">{t.desc}</p>
                    </button>
                  ))}
                  <div className="col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-lx-panel-bg border border-black/8">
                    <div className="w-7 h-7 rounded-lg bg-lx-cta/10 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.5 2 2 0 0 1 3.6 2.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-lx-text-muted">Snel iemand aan de lijn?</p>
                      <a href="tel:0570610071" className="text-[13px] font-semibold text-lx-cta hover:underline">0570 61 00 71</a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Urgentie — alleen bij probleem */}
                  {type === 'probleem' && (
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={urgent}
                        onChange={e => setUrgent(e.target.checked)}
                        className="w-4 h-4 accent-red-600"
                      />
                      <div>
                        <p className="text-[13px] font-semibold text-red-700">Urgente melding</p>
                        <p className="text-[11.5px] text-red-500">Blokkerende fout, werkt niet door</p>
                      </div>
                    </label>
                  )}

                  {/* Onderwerp */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Onderwerp *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Korte omschrijving van je vraag of probleem"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
                    />
                  </div>

                  {/* Beschrijving */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Beschrijving *</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Beschrijf je vraag of probleem zo uitgebreid mogelijk…"
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors resize-none"
                    />
                  </div>

                  {/* Configuratie koppelen */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Configuratie koppelen <span className="normal-case font-normal text-lx-text-muted">(optioneel)</span></label>
                    <select
                      value={configId}
                      onChange={e => setConfigId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors bg-white appearance-none"
                    >
                      <option value="">— Geen configuratie —</option>
                      {configs === null && <option disabled>Laden…</option>}
                      {configs?.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{configDims(c) ? ` · ${configDims(c)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Screenshot */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Screenshot <span className="normal-case font-normal text-lx-text-muted">(optioneel, max 2 MB)</span></label>
                    {screenshot ? (
                      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-black/12 bg-lx-panel-bg">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        <span className="flex-1 text-[12.5px] text-lx-text-primary truncate">{screenshot.name}</span>
                        <button onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = '' }} className="text-lx-text-muted hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-black/20 text-[12.5px] text-lx-text-muted hover:border-lx-cta/50 hover:text-lx-cta transition-all text-left flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        Afbeelding uploaden
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!done && step === 'form' && (
              <div className="px-5 py-4 border-t border-lx-divider flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-[13px] text-lx-text-secondary hover:text-lx-text-primary transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-60 transition-all"
                >
                  {isPending && (
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  )}
                  {isPending ? 'Versturen…' : 'Versturen'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
