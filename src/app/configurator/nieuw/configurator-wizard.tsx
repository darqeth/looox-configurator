'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShapeSlug, GlasKleur, RECHTHOEK_CONSTRAINTS, calcTotalPrice, EXTRA_OPTIONS } from '@/lib/configurator-config'
import ShapePicker from './shape-picker'
import StepAfmeting from './step-afmeting'
import StepVerlichting, { LightConfig } from './step-verlichting'
import StepOpties from './step-opties'
import StepSamenvatting from './step-samenvatting'
import PricePanel from './price-panel'
import { saveConfiguration, updateConfiguration } from '@/lib/actions/configurator'
import { placeOrder } from '@/lib/actions/orders'
import { createClient } from '@/lib/supabase/client'

interface InitialConfig {
  id: string
  shape: ShapeSlug
  width: number
  height: number
  diameter: number | null
  organicSizeKey: string | null
  glasKleur: GlasKleur
  directLight: LightConfig
  indirectLight: LightConfig
  selectedOptions: string[]
  optionSubChoices: Record<string, string>
  projectName: string
  reference: string
  description: string
  quantity: number
}

const STEPS = [
  { label: 'Afmeting' },
  { label: 'Verlichting' },
  { label: 'Opties' },
  { label: 'Samenvatting' },
]

const DEFAULT_LIGHT: LightConfig = { position: 'geen', type: null, control: null }

function MobilePriceBar({ shape, width, height, diameter, organicSizeKey, directLight, indirectLight, selectedOptions, optionSubChoices, priceFactor, priceFactorEnabled, step, isStep1Valid, projectName, saving, onNext, onSave }: {
  shape: ShapeSlug; width: number; height: number; diameter: number | null; organicSizeKey: string | null
  directLight: LightConfig; indirectLight: LightConfig; selectedOptions: string[]; optionSubChoices: Record<string, string>
  priceFactor: number; priceFactorEnabled: boolean
  step: number; isStep1Valid: boolean; projectName: string; saving: boolean
  onNext: () => void; onSave: () => void
}) {
  const netto = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey,
    directPosition: directLight.position, directType: directLight.type, directControl: directLight.control,
    indirectPosition: indirectLight.position, indirectType: indirectLight.type, indirectControl: indirectLight.control,
    selectedOptions, optionSubChoices,
  })
  const total = priceFactorEnabled && priceFactor > 1 ? Math.round(netto * priceFactor) : netto
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 px-4 py-3 flex items-center justify-between z-30">
      <div>
        <p className="text-[10px] text-lx-text-secondary font-medium">Netto inkoopprijs</p>
        <p className="text-[17px] font-bold text-lx-text-primary">€{total.toLocaleString('nl-NL')}</p>
      </div>
      {step < 4 ? (
        <button
          onClick={onNext}
          disabled={!isStep1Valid}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-lx-cta text-white hover:bg-lx-cta-hover disabled:opacity-40 transition-all"
        >
          Volgende →
        </button>
      ) : (
        <button
          onClick={onSave}
          disabled={!projectName.trim() || saving}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-lx-cta text-white hover:bg-lx-cta-hover disabled:opacity-40 transition-all"
        >
          Opslaan
        </button>
      )}
    </div>
  )
}

export default function ConfiguratorWizard({ initialConfig, priceFactor = 1, priceFactorEnabled = false }: { initialConfig?: InitialConfig; priceFactor?: number; priceFactorEnabled?: boolean }) {
  const router = useRouter()
  const isEditing = !!initialConfig
  const [shape, setShape] = useState<ShapeSlug | null>(initialConfig?.shape ?? null)
  const [step, setStep] = useState(1)

  // Step 1: dimensions + glaskleur
  const [width, setWidth] = useState(initialConfig?.width ?? 80)
  const [height, setHeight] = useState(initialConfig?.height ?? 60)
  const [diameter, setDiameter] = useState<number | null>(initialConfig?.diameter ?? 60)
  const [organicSizeKey, setOrganicSizeKey] = useState<string | null>(initialConfig?.organicSizeKey ?? '60x40')
  const [glasKleur, setGlasKleur] = useState<GlasKleur>(initialConfig?.glasKleur ?? 'helder')

  // Step 2: lighting
  const [directLight, setDirectLight] = useState<LightConfig>(initialConfig?.directLight ?? DEFAULT_LIGHT)
  const [indirectLight, setIndirectLight] = useState<LightConfig>(initialConfig?.indirectLight ?? DEFAULT_LIGHT)

  // Step 3: options
  const [selectedOptions, setSelectedOptions] = useState<string[]>(initialConfig?.selectedOptions ?? [])
  const [optionSubChoices, setOptionSubChoices] = useState<Record<string, string>>(initialConfig?.optionSubChoices ?? {})

  // Step 4: save info
  const [projectName, setProjectName] = useState(initialConfig?.projectName ?? '')
  const [reference, setReference] = useState(initialConfig?.reference ?? '')
  const [description, setDescription] = useState(initialConfig?.description ?? '')
  const [quantity, setQuantity] = useState(initialConfig?.quantity ?? 1)
  const [schunineZijdenFile, setSchunineZijdenFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; orderId: string } | null>(null)

  function handleShapeSelect(s: ShapeSlug) {
    setShape(s)
    setStep(1)
    setGlasKleur('helder')
    setDirectLight(DEFAULT_LIGHT)
    setIndirectLight(DEFAULT_LIGHT)
    setSelectedOptions([])
    setOptionSubChoices({})
  }

  function isStep1Valid(): boolean {
    if (!shape) return false
    if (shape === 'rechthoek' || shape === 'op-aanvraag') {
      const { min, max } = RECHTHOEK_CONSTRAINTS
      return width >= min && width <= max && height >= min && height <= max
    }
    if (shape === 'rond') return diameter !== null
    if (shape === 'organic') return organicSizeKey !== null
    return false
  }

  function isStep2Valid(): boolean {
    const directNeedsControl = directLight.position !== 'geen' && directLight.type !== null
    const indirectNeedsControl = indirectLight.position !== 'geen' && indirectLight.type !== null
    if (directNeedsControl && !directLight.control) return false
    if (indirectNeedsControl && !indirectLight.control) return false
    return true
  }

  function isStep3Valid(): boolean {
    return selectedOptions.every((id) => {
      const opt = EXTRA_OPTIONS.find((o) => o.id === id)
      if (!opt?.subChoices) return true
      return !!optionSubChoices[id]
    })
  }

  async function handleSave() {
    if (!shape || !projectName.trim()) return
    setSaving(true)
    try {
      const payload = {
        shape, width, height, diameter, organicSizeKey, glasKleur,
        directLight, indirectLight, selectedOptions, optionSubChoices,
        projectName: projectName.trim(),
        reference: reference.trim(),
        description: description.trim(),
        quantity,
        status: 'saved' as const,
      }
      if (isEditing && initialConfig) {
        await updateConfiguration({ ...payload, configId: initialConfig.id })
      } else {
        await saveConfiguration(payload)
      }
      setSaved(true)
      router.push('/configuraties')
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  async function handleOrder() {
    if (!shape || !projectName.trim()) return
    setSaving(true)
    try {
      // Upload bijlage naar Supabase Storage (indien aanwezig)
      let attachmentUrl: string | null = null
      if (schunineZijdenFile) {
        const supabase = createClient()
        const ext = schunineZijdenFile.name.split('.').pop() ?? 'bin'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, schunineZijdenFile, { upsert: false })
        if (uploadError) {
          console.error('[upload] Supabase Storage fout:', uploadError)
        } else {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          attachmentUrl = urlData.publicUrl
          console.log('[upload] Bijlage opgeslagen:', attachmentUrl)
        }
      }

      const result = await placeOrder({
        shape, width, height, diameter, organicSizeKey, glasKleur,
        directLight, indirectLight, selectedOptions, optionSubChoices,
        projectName: projectName.trim(),
        reference: reference.trim(),
        description: description.trim(),
        quantity,
        attachmentUrl,
      })
      setOrderResult(result)
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  if (orderResult) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
        <div className="max-w-md w-full space-y-4">
          {/* Checkmark + titel */}
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-lx-panel-bg/50 animate-ping" style={{ animationDuration: '1.5s', animationIterationCount: 1 }} />
              <div className="relative w-20 h-20 rounded-full bg-lx-icon-bg flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" stroke="var(--lx-cta)" strokeWidth="2.5"
                    strokeDasharray="28" strokeDashoffset="0"
                    style={{ animation: 'drawCheck 0.4s ease-out 0.3s both' }}
                  />
                </svg>
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">
              {shape === 'op-aanvraag' ? 'Offerte aangevraagd' : 'Bestelling geplaatst'}
            </p>
            <h2 className="text-[24px] font-bold text-lx-text-primary mb-2">{projectName}</h2>
            <p className="text-[13.5px] text-lx-text-secondary leading-relaxed max-w-sm mx-auto">
              {shape === 'op-aanvraag'
                ? 'Je aanvraag is ontvangen. Je hoort binnen 1 werkdag van ons. Productietijd is ca. 10 werkdagen na bevestiging.'
                : 'Je bestelling is ontvangen. Je ontvangt binnen 1 werkdag een orderbevestiging. Productietijd is ca. 10 werkdagen.'}
            </p>
          </div>

          {/* Ordernummer card */}
          <div className="bg-white rounded-2xl border border-black/8 shadow-sm px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] text-lx-text-secondary font-medium uppercase tracking-wide mb-0.5">
                {shape === 'op-aanvraag' ? 'Offertenummer' : 'Bestelnummer'}
              </p>
                <p className="text-[22px] font-bold text-lx-text-primary tracking-wide font-mono">{orderResult.orderNumber}</p>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11.5px] font-semibold">
                In behandeling
              </span>
            </div>
            <div className="border-t border-lx-divider pt-4 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-lx-text-secondary">Project</span>
                <span className="text-lx-text-primary font-medium">{projectName}</span>
              </div>
              {reference && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-lx-text-secondary">Referentie</span>
                  <span className="text-lx-text-primary font-medium">{reference}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-lx-text-secondary">Aantal</span>
                <span className="text-lx-text-primary font-medium">{quantity}×</span>
              </div>
            </div>
          </div>

          {/* Knoppen */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/bestellingen')}
              className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors"
            >
              {shape === 'op-aanvraag' ? 'Mijn offertes' : 'Mijn bestellingen'}
            </button>
            <button
              onClick={() => router.push('/configurator/nieuw')}
              className="flex-1 h-11 rounded-xl border border-black/12 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors"
            >
              Nieuwe spiegel
            </button>
          </div>
        </div>
        <style>{`
          @keyframes drawCheck {
            from { stroke-dashoffset: 28; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-lx-panel-bg flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-lx-text-primary">Configuratie opgeslagen</p>
          <p className="text-[13px] text-lx-text-secondary">Je wordt doorgestuurd…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {!shape && !isEditing && <ShapePicker onSelect={handleShapeSelect} onClose={() => router.push('/configuraties')} />}

      <div className="px-4 sm:px-6 py-6 max-w-[1100px] mx-auto pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-lx-text-secondary hover:text-lx-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-lx-text-primary leading-tight">{isEditing ? 'Configuratie bewerken' : 'Nieuwe spiegel'}</h1>
            {shape && (
              <button onClick={() => setShape(null)} className="text-[12px] text-lx-cta hover:underline font-medium">
                Vorm wijzigen
              </button>
            )}
          </div>
        </div>

        {/* Step indicator */}
        {shape && (
          <div className="flex items-center gap-1 mb-7 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const num = i + 1
              const isActive = step === num
              const isDone = step > num
              return (
                <div key={num} className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => isDone && setStep(num)}
                    disabled={!isDone}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                      isActive ? 'bg-lx-cta text-white'
                        : isDone ? 'bg-lx-panel-bg text-lx-cta hover:bg-lx-panel-bg/70 cursor-pointer'
                        : 'bg-white/70 text-lx-text-secondary cursor-default'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : isDone ? 'bg-lx-cta text-white' : 'bg-black/10 text-lx-text-secondary'
                    }`}>
                      {isDone ? (
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <polyline points="2,5 4.5,7.5 8.5,2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{num}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`w-4 h-px ${step > num ? 'bg-lx-panel-bg' : 'bg-black/10'}`} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Two-column layout */}
        {shape && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: step content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-6">
                <h2 className="text-[16px] font-bold text-lx-text-primary mb-5">
                  {step === 1 && 'Afmeting'}
                  {step === 2 && 'Verlichting'}
                  {step === 3 && 'Extra opties'}
                  {step === 4 && 'Controleer & sla op'}
                </h2>

                {step === 1 && (
                  <StepAfmeting
                    shape={shape} width={width} height={height}
                    diameter={diameter} organicSizeKey={organicSizeKey}
                    glasKleur={glasKleur}
                    onChange={(updates) => {
                      if (updates.width !== undefined) setWidth(updates.width)
                      if (updates.height !== undefined) setHeight(updates.height)
                      if (updates.diameter !== undefined) setDiameter(updates.diameter)
                      if (updates.organicSizeKey !== undefined) setOrganicSizeKey(updates.organicSizeKey)
                      if (updates.glasKleur !== undefined) setGlasKleur(updates.glasKleur)
                    }}
                  />
                )}

                {step === 2 && (
                  <StepVerlichting
                    shape={shape}
                    directLight={directLight}
                    indirectLight={indirectLight}
                    onDirectChange={(updates) => setDirectLight(prev => ({ ...prev, ...updates }))}
                    onIndirectChange={(updates) => setIndirectLight(prev => ({ ...prev, ...updates }))}
                  />
                )}

                {step === 3 && (
                  <StepOpties
                    shape={shape}
                    diameter={diameter}
                    selectedOptions={selectedOptions}
                    onChange={setSelectedOptions}
                    optionSubChoices={optionSubChoices}
                    onSubChoiceChange={(id, val) => setOptionSubChoices(prev => ({ ...prev, [id]: val }))}
                  />
                )}

                {step === 4 && (
                  <StepSamenvatting
                    shape={shape} width={width} height={height}
                    diameter={diameter} organicSizeKey={organicSizeKey}
                    glasKleur={glasKleur}
                    directLight={directLight} indirectLight={indirectLight}
                    selectedOptions={selectedOptions}
                    optionSubChoices={optionSubChoices}
                    projectName={projectName} reference={reference}
                    description={description} quantity={quantity} saving={saving}
                    schunineZijdenFile={schunineZijdenFile}
                    onProjectNameChange={setProjectName}
                    onReferenceChange={setReference}
                    onDescriptionChange={setDescription}
                    onQuantityChange={setQuantity}
                    onSchunineZijdenFileChange={setSchunineZijdenFile}
                    onGoToStep={setStep}
                    onSave={handleSave}
                    onOrder={handleOrder}
                  />
                )}

                {/* Navigation */}
                {step < 4 && (
                  <div className="flex justify-between mt-8 pt-5 border-t border-lx-divider">
                    <button
                      onClick={() => step > 1 ? setStep(step - 1) : setShape(null)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                      {step === 1 ? 'Vorm wijzigen' : 'Terug'}
                    </button>
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={
                        (step === 1 && !isStep1Valid()) ||
                        (step === 2 && !isStep2Valid()) ||
                        (step === 3 && !isStep3Valid())
                      }
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-lx-cta text-white hover:bg-lx-cta-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Volgende: {STEPS[step]?.label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: price panel */}
            <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
              <PricePanel
                shape={shape} width={width} height={height}
                diameter={diameter} organicSizeKey={organicSizeKey}
                glasKleur={glasKleur}
                directLight={directLight} indirectLight={indirectLight}
                selectedOptions={selectedOptions}
                optionSubChoices={optionSubChoices}
                priceFactor={priceFactor}
                priceFactorEnabled={priceFactorEnabled}
              />
            </div>
          </div>
        )}

        {/* Mobile sticky price bar */}
        {shape && (
          <MobilePriceBar
            shape={shape} width={width} height={height}
            diameter={diameter} organicSizeKey={organicSizeKey}
            directLight={directLight} indirectLight={indirectLight}
            selectedOptions={selectedOptions}
            optionSubChoices={optionSubChoices}
            priceFactor={priceFactor}
            priceFactorEnabled={priceFactorEnabled}
            step={step} isStep1Valid={step === 1 ? isStep1Valid() : step === 2 ? isStep2Valid() : isStep3Valid()}
            projectName={projectName} saving={saving}
            onNext={() => setStep(step + 1)}
            onSave={() => handleSave()}
          />
        )}
      </div>
    </>
  )
}
