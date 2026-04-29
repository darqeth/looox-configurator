'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Glasdikte, VERPAKKING_DREMPEL } from '@/lib/projectspiegel-config'
import { saveProjectspiegelConfiguration } from '@/lib/actions/configurator'
import StepAfmeting from './step-afmeting'
import StepOpties from './step-opties'
import StepSamenvatting from './step-samenvatting'
import PreviewPanel from './preview-panel'

const STEPS = [
  { label: 'Afmeting' },
  { label: 'Opties' },
  { label: 'Samenvatting' },
]

export default function ProjectspiegelConfigurator() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(0)
  const [lengte, setLengte] = useState(120)
  const [hoogte, setHoogte] = useState(80)
  const [glasdikte, setGlasdikte] = useState<Glasdikte>('5')
  const [ophanging, setOphanging] = useState(true)
  const [voormonteren, setVoormonteren] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [verpakkingPerStuk, setVerpakkingPerStuk] = useState(true)
  const [projectName, setProjectName] = useState('')

  const effectiveVerpakking = quantity < VERPAKKING_DREMPEL ? true : verpakkingPerStuk

  function handleQuantityChange(v: number) {
    setQuantity(v)
    if (v < VERPAKKING_DREMPEL) setVerpakkingPerStuk(true)
  }

  function handleSave() {
    startTransition(async () => {
      await saveProjectspiegelConfiguration({
        lengte,
        hoogte,
        glasdikte,
        ophanging,
        voormonteren,
        verpakkingPerStuk: effectiveVerpakking,
        quantity,
        projectName,
        reference: '',
      })
      router.push('/configuraties')
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-lx-divider">
      {/* Stappen header */}
      <div className="bg-white border-b border-lx-divider sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1 max-w-xl">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-1.5 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                    i < step ? 'bg-lx-cta text-white' :
                    i === step ? 'bg-lx-cta text-white' :
                    'bg-lx-panel-bg text-lx-text-secondary'
                  }`}>
                    {i < step ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    ) : i + 1}
                  </span>
                  <span className={`text-[12px] font-semibold hidden sm:inline ${i === step ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-lx-divider mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content: twee kolommen op desktop */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-6 items-start">
        {/* Links: stap content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-lx-divider p-5">
            <h2 className="text-[16px] font-semibold text-lx-text-primary mb-5">
              {STEPS[step].label}
            </h2>

            {step === 0 && (
              <StepAfmeting
                lengte={lengte}
                hoogte={hoogte}
                glasdikte={glasdikte}
                onChange={(u) => {
                  if (u.lengte !== undefined) setLengte(u.lengte)
                  if (u.hoogte !== undefined) setHoogte(u.hoogte)
                  if (u.glasdikte !== undefined) setGlasdikte(u.glasdikte)
                }}
              />
            )}

            {step === 1 && (
              <StepOpties
                ophanging={ophanging}
                voormonteren={voormonteren}
                onChange={(u) => {
                  if (u.ophanging !== undefined) setOphanging(u.ophanging)
                  if (u.voormonteren !== undefined) setVoormonteren(u.voormonteren)
                }}
              />
            )}

            {step === 2 && (
              <StepSamenvatting
                lengte={lengte}
                hoogte={hoogte}
                glasdikte={glasdikte}
                ophanging={ophanging}
                voormonteren={voormonteren}
                verpakkingPerStuk={effectiveVerpakking}
                quantity={quantity}
                projectName={projectName}
                saving={isPending}
                onVerpakkingChange={setVerpakkingPerStuk}
                onQuantityChange={handleQuantityChange}
                onProjectNameChange={setProjectName}
                onGoToStep={setStep}
                onSave={handleSave}
              />
            )}
          </div>

          {/* Navigatie */}
          {step < 2 && (
            <div className="flex gap-3 mt-4">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-11 rounded-xl border border-black/12 text-lx-text-primary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors"
                >
                  Terug
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex-1 h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors"
              >
                Volgende stap
              </button>
            </div>
          )}
        </div>

        {/* Rechts: preview panel (alleen desktop) */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
          <PreviewPanel
            lengte={lengte}
            hoogte={hoogte}
            glasdikte={glasdikte}
            ophanging={ophanging}
            verpakkingPerStuk={effectiveVerpakking}
            quantity={quantity}
          />
        </div>
      </div>
    </div>
  )
}
