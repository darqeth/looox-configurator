'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { VERPAKKING_DREMPEL } from '@/lib/projectspiegel-config'
import { saveProjectspiegelConfiguration, updateProjectspiegelConfiguration } from '@/lib/actions/configurator'
import { Glasdikte as GlasdikteType } from '@/lib/projectspiegel-config'
import StepAfmeting from './step-afmeting'
import StepOpties from './step-opties'
import StepSamenvatting from './step-samenvatting'
import PreviewPanel from './preview-panel'
import { loadDraft, saveDraft, clearDraft, type ProjectDraftData } from '@/lib/configurator-draft'

const STEPS = [
  { label: 'Afmeting' },
  { label: 'Opties' },
  { label: 'Samenvatting' },
]

interface InitialConfig {
  id: string
  lengte: number
  hoogte: number
  glasdikte: GlasdikteType
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
  reference: string
}

export default function ProjectspiegelConfigurator({ initialConfig, resumeDraft = false }: { initialConfig?: InitialConfig; resumeDraft?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEditing = !!initialConfig

  const [step, setStep] = useState(0)
  const [lengte, setLengte] = useState(initialConfig?.lengte ?? 120)
  const [hoogte, setHoogte] = useState(initialConfig?.hoogte ?? 80)
  const [glasdikte, setGlasdikte] = useState<GlasdikteType>(initialConfig?.glasdikte ?? '5')
  const [ophanging, setOphanging] = useState(initialConfig?.ophanging ?? true)
  const [voormonteren, setVoormonteren] = useState(initialConfig?.voormonteren ?? true)
  const [quantity, setQuantity] = useState(initialConfig?.quantity ?? 1)
  const [verpakkingPerStuk, setVerpakkingPerStuk] = useState(initialConfig?.verpakkingPerStuk ?? true)
  const [projectName, setProjectName] = useState(initialConfig?.projectName ?? '')

  // ── Gedeelde draft (één save-state met de maatwerk-wizard) ──
  const [draftAvailable, setDraftAvailable] = useState(false)

  const restoreFromDraft = () => {
    const draft = loadDraft()
    if (draft?.type !== 'project') return
    const d = draft.data as ProjectDraftData
    setStep(d.step ?? 0)
    setLengte(d.lengte ?? 120); setHoogte(d.hoogte ?? 80)
    setGlasdikte((d.glasdikte as GlasdikteType) ?? '5')
    setOphanging(d.ophanging ?? true); setVoormonteren(d.voormonteren ?? true)
    setVerpakkingPerStuk(d.verpakkingPerStuk ?? true)
    setQuantity(d.quantity ?? 1); setProjectName(d.projectName ?? '')
    setDraftAvailable(false)
  }

  useEffect(() => {
    if (isEditing) return
    const draft = loadDraft()
    if (draft?.type !== 'project') return
    if (resumeDraft) restoreFromDraft()
    else setDraftAvailable(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEditing) return
    // Niet opslaan zolang alles nog op de defaults staat
    const isDefault = step === 0 && lengte === 120 && hoogte === 80 && glasdikte === '5'
      && ophanging && voormonteren && verpakkingPerStuk && quantity === 1 && projectName === ''
    if (isDefault) return
    const t = setTimeout(() => {
      saveDraft('project', {
        step, lengte, hoogte, glasdikte, ophanging, voormonteren,
        verpakkingPerStuk, quantity, projectName,
      })
    }, 800)
    return () => clearTimeout(t)
  }, [isEditing, step, lengte, hoogte, glasdikte, ophanging, voormonteren, verpakkingPerStuk, quantity, projectName])

  const effectiveVerpakking = quantity < VERPAKKING_DREMPEL ? true : verpakkingPerStuk

  function handleQuantityChange(v: number) {
    setQuantity(v)
    if (v < VERPAKKING_DREMPEL) setVerpakkingPerStuk(true)
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        lengte,
        hoogte,
        glasdikte,
        ophanging,
        voormonteren,
        verpakkingPerStuk: effectiveVerpakking,
        quantity,
        projectName,
        reference: initialConfig?.reference ?? '',
      }
      if (isEditing) {
        await updateProjectspiegelConfiguration(initialConfig.id, payload)
      } else {
        await saveProjectspiegelConfiguration(payload)
      }
      clearDraft()
      router.push('/configuraties')
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-lx-divider">
      {draftAvailable && (
        <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3 pointer-events-none">
          <div className="pointer-events-auto bg-lx-text-primary text-white rounded-2xl shadow-lg px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 max-w-xl">
            <p className="text-[13px] font-medium">
              Je hebt een niet-opgeslagen projectspiegel. Wil je verdergaan waar je was gebleven?
            </p>
            <div className="flex gap-2">
              <button
                onClick={restoreFromDraft}
                className="px-3.5 h-8 rounded-lg bg-white text-lx-text-primary text-[12.5px] font-semibold hover:bg-white/90 transition-colors"
              >
                Verdergaan
              </button>
              <button
                onClick={() => { clearDraft(); setDraftAvailable(false) }}
                className="px-3.5 h-8 rounded-lg border border-white/30 text-white text-[12.5px] font-semibold hover:bg-white/10 transition-colors"
              >
                Opnieuw beginnen
              </button>
            </div>
          </div>
        </div>
      )}
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
