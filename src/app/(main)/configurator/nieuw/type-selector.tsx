'use client'

import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { loadDraft, clearDraft } from '@/lib/configurator-draft'

// Typekeuze voor accounts met stand 'beide' (besluit B2): eerst kiezen tussen
// maatwerk en projectspiegel; daarna volgt bij maatwerk de bestaande
// handmatig/AI-keuze. Zelfde modal-stijl als de ModeSelector.

function TypeSelector({ onMaatwerk, onProject, onMeubel, onClose }: {
  onMaatwerk?: () => void
  onProject?: () => void
  onMeubel?: () => void
  onClose: () => void
}) {
  const aantal = [onMaatwerk, onProject, onMeubel].filter(Boolean).length
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full p-6 relative ${aantal > 2 ? 'max-w-3xl' : 'max-w-xl'}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lx-text-muted hover:text-lx-text-primary cursor-pointer transition-colors"
          aria-label="Sluiten"
        >
          <X size={20} />
        </button>
        <h2 className="text-[20px] font-bold text-lx-text-primary mb-1">Nieuwe configuratie</h2>
        <p className="text-[13px] text-lx-text-secondary mb-6">Wat wil je maken?</p>
        <div className={`grid grid-cols-1 gap-4 ${aantal > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {onMaatwerk && <button
            onClick={onMaatwerk}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="3" />
              <path d="M9 7l-2 3" /><path d="M13 6l-4 6" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Maatwerk spiegel</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Alle vormen, verlichting en opties. Stap voor stap of met het LoooX hulpje.</p>
          </button>}
          {onProject && <button
            onClick={onProject}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="7" height="14" rx="1.5" />
              <rect x="14" y="5" width="7" height="14" rx="1.5" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Projectspiegel</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Rechthoekige spiegels in aantallen, tegen netto projectprijzen.</p>
          </button>}
          {onMeubel && <button
            onClick={onMeubel}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="8" width="20" height="9" rx="1.5" />
              <path d="M12 8v9" /><path d="M6 12.5h2" /><path d="M16 12.5h2" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Meubel</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Tailor-Made wastafelmeubel op maat, met lades naar keuze.</p>
          </button>}
        </div>
      </div>
    </div>
  )
}

export function ConfiguratorTypeChooser({ wizard, project, meubel = false }: {
  wizard?: ReactNode
  project?: ReactNode
  /** Toont de keuze Meubel (Tailor-Made); die heeft een eigen pagina */
  meubel?: boolean
}) {
  const router = useRouter()
  const [type, setType] = useState<'maatwerk' | 'project' | null>(null)
  const [resume, setResume] = useState(false)
  // Eén gedeelde save-state: bestaat er een draft (van welk type dan ook),
  // dan eerst vragen of de gebruiker daar verder wil
  const [draftType, setDraftType] = useState<'maatwerk' | 'project' | null>(null)

  useEffect(() => {
    const draft = loadDraft()
    if (draft) setDraftType(draft.type)
  }, [])

  // resumeDraft-prop injecteren zodat het gekozen scherm direct herstelt
  const withResume = (node: ReactNode) =>
    resume && isValidElement(node)
      ? cloneElement(node as ReactElement<{ resumeDraft?: boolean }>, { resumeDraft: true })
      : node

  if (type === 'maatwerk') return <>{withResume(wizard)}</>
  if (type === 'project') return <>{withResume(project)}</>

  if (draftType && (draftType === 'project' ? project : wizard)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <h2 className="text-[18px] font-bold text-lx-text-primary mb-1.5">Verdergaan waar je was?</h2>
          <p className="text-[13px] text-lx-text-secondary leading-relaxed mb-5">
            Je hebt een niet-opgeslagen {draftType === 'project' ? 'projectspiegel' : 'maatwerk spiegel'}.
          </p>
          <div className="flex gap-2.5 justify-center">
            <button
              onClick={() => { setResume(true); setType(draftType) }}
              className="px-5 h-10 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
            >
              Verdergaan
            </button>
            <button
              onClick={() => { clearDraft(); setDraftType(null) }}
              className="px-5 h-10 rounded-xl border border-black/10 text-lx-text-secondary text-[13px] font-semibold hover:bg-lx-panel-bg transition-colors"
            >
              Opnieuw beginnen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TypeSelector
      onMaatwerk={wizard ? () => setType('maatwerk') : undefined}
      onProject={project ? () => setType('project') : undefined}
      onMeubel={meubel ? () => router.push('/configurator/meubel') : undefined}
      onClose={() => router.push('/configuraties')}
    />
  )
}
