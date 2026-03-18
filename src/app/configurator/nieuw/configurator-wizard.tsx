'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShapeSlug, RECHTHOEK_CONSTRAINTS, calcTotalPrice } from '@/lib/configurator-config'
import ShapePicker from './shape-picker'
import StepAfmeting from './step-afmeting'
import StepVerlichting, { LightConfig } from './step-verlichting'
import StepOpties from './step-opties'
import StepSamenvatting from './step-samenvatting'
import PricePanel from './price-panel'
import { saveConfiguration } from '@/lib/actions/configurator'

const STEPS = [
  { label: 'Afmeting' },
  { label: 'Verlichting' },
  { label: 'Opties' },
  { label: 'Samenvatting' },
]

const DEFAULT_LIGHT: LightConfig = { position: 'geen', type: null, control: null }

function MobilePriceBar({ shape, width, height, diameter, organicSizeKey, directLight, indirectLight, selectedOptions, step, isStep1Valid, projectName, saving, onNext, onSave }: {
  shape: ShapeSlug; width: number; height: number; diameter: number | null; organicSizeKey: string | null
  directLight: LightConfig; indirectLight: LightConfig; selectedOptions: string[]
  step: number; isStep1Valid: boolean; projectName: string; saving: boolean
  onNext: () => void; onSave: () => void
}) {
  const total = calcTotalPrice({
    shape, width, height, diameter, organicSizeKey,
    directPosition: directLight.position, directType: directLight.type,
    indirectPosition: indirectLight.position, indirectType: indirectLight.type,
    selectedOptions,
  })
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 px-4 py-3 flex items-center justify-between z-30">
      <div>
        <p className="text-[10px] text-[#9CA3AF] font-medium">Netto inkoopprijs</p>
        <p className="text-[17px] font-bold text-[#1A1A1A]">€{total.toLocaleString('nl-NL')}</p>
      </div>
      {step < 4 ? (
        <button
          onClick={onNext}
          disabled={step === 1 && !isStep1Valid}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#3D6B4F] text-white hover:bg-[#2e5540] disabled:opacity-40 transition-all"
        >
          Volgende →
        </button>
      ) : (
        <button
          onClick={onSave}
          disabled={!projectName.trim() || saving}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#3D6B4F] text-white hover:bg-[#2e5540] disabled:opacity-40 transition-all"
        >
          Opslaan
        </button>
      )}
    </div>
  )
}

export default function ConfiguratorWizard() {
  const router = useRouter()
  const [shape, setShape] = useState<ShapeSlug | null>(null)
  const [step, setStep] = useState(1)

  // Step 1: dimensions
  const [width, setWidth] = useState(80)
  const [height, setHeight] = useState(60)
  const [diameter, setDiameter] = useState<number | null>(60)
  const [organicSizeKey, setOrganicSizeKey] = useState<string | null>('60x40')

  // Step 2: lighting
  const [directLight, setDirectLight] = useState<LightConfig>(DEFAULT_LIGHT)
  const [indirectLight, setIndirectLight] = useState<LightConfig>(DEFAULT_LIGHT)

  // Step 3: options
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  // Step 4: save info
  const [projectName, setProjectName] = useState('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleShapeSelect(s: ShapeSlug) {
    setShape(s)
    setStep(1)
    setDirectLight(DEFAULT_LIGHT)
    setIndirectLight(DEFAULT_LIGHT)
    setSelectedOptions([])
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

  async function handleSave(asConcept: boolean) {
    if (!shape || !projectName.trim()) return
    setSaving(true)
    try {
      await saveConfiguration({
        shape, width, height, diameter, organicSizeKey,
        directLight, indirectLight, selectedOptions,
        projectName: projectName.trim(),
        reference: reference.trim(),
        description: description.trim(),
        quantity,
        status: asConcept ? 'draft' : 'saved',
      })
      setSaved(true)
      router.push('/configuraties')
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#3D6B4F]/15 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-[#1A1A1A]">Configuratie opgeslagen</p>
          <p className="text-[13px] text-[#6B7280]">Je wordt doorgestuurd…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {!shape && <ShapePicker onSelect={handleShapeSelect} />}

      <div className="px-4 sm:px-6 py-6 max-w-[1100px] mx-auto pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A] leading-tight">Nieuwe spiegel</h1>
            {shape && (
              <button onClick={() => setShape(null)} className="text-[12px] text-[#3D6B4F] hover:underline font-medium">
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
                      isActive ? 'bg-[#3D6B4F] text-white'
                        : isDone ? 'bg-[#3D6B4F]/10 text-[#3D6B4F] hover:bg-[#3D6B4F]/15 cursor-pointer'
                        : 'bg-white/70 text-[#9CA3AF] cursor-default'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : isDone ? 'bg-[#3D6B4F] text-white' : 'bg-black/10 text-[#9CA3AF]'
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
                    <div className={`w-4 h-px ${step > num ? 'bg-[#3D6B4F]/30' : 'bg-black/10'}`} />
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
                <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-5">
                  {step === 1 && 'Afmeting'}
                  {step === 2 && 'Verlichting'}
                  {step === 3 && 'Extra opties'}
                  {step === 4 && 'Controleer & sla op'}
                </h2>

                {step === 1 && (
                  <StepAfmeting
                    shape={shape} width={width} height={height}
                    diameter={diameter} organicSizeKey={organicSizeKey}
                    onChange={(updates) => {
                      if (updates.width !== undefined) setWidth(updates.width)
                      if (updates.height !== undefined) setHeight(updates.height)
                      if (updates.diameter !== undefined) setDiameter(updates.diameter)
                      if (updates.organicSizeKey !== undefined) setOrganicSizeKey(updates.organicSizeKey)
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
                    selectedOptions={selectedOptions}
                    onChange={setSelectedOptions}
                  />
                )}

                {step === 4 && (
                  <StepSamenvatting
                    shape={shape} width={width} height={height}
                    diameter={diameter} organicSizeKey={organicSizeKey}
                    directLight={directLight} indirectLight={indirectLight}
                    selectedOptions={selectedOptions}
                    projectName={projectName} reference={reference}
                    description={description} quantity={quantity} saving={saving}
                    onProjectNameChange={setProjectName}
                    onReferenceChange={setReference}
                    onDescriptionChange={setDescription}
                    onQuantityChange={setQuantity}
                    onGoToStep={setStep}
                    onSave={handleSave}
                  />
                )}

                {/* Navigation */}
                {step < 4 && (
                  <div className="flex justify-between mt-8 pt-5 border-t border-[#F0EDE8]">
                    <button
                      onClick={() => step > 1 ? setStep(step - 1) : setShape(null)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F3EF] transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                      {step === 1 ? 'Vorm wijzigen' : 'Terug'}
                    </button>
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={step === 1 && !isStep1Valid()}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#3D6B4F] text-white hover:bg-[#2e5540] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                directLight={directLight} indirectLight={indirectLight}
                selectedOptions={selectedOptions}
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
            step={step} isStep1Valid={isStep1Valid()}
            projectName={projectName} saving={saving}
            onNext={() => setStep(step + 1)}
            onSave={() => handleSave(false)}
          />
        )}
      </div>
    </>
  )
}
