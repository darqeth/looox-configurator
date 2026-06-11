'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

// Typekeuze voor accounts met stand 'beide' (besluit B2): eerst kiezen tussen
// maatwerk en projectspiegel; daarna volgt bij maatwerk de bestaande
// handmatig/AI-keuze. Zelfde modal-stijl als de ModeSelector.

function TypeSelector({ onMaatwerk, onProject, onClose }: {
  onMaatwerk: () => void
  onProject: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lx-text-muted hover:text-lx-text-primary cursor-pointer transition-colors"
          aria-label="Sluiten"
        >
          <X size={20} />
        </button>
        <h2 className="text-[20px] font-bold text-lx-text-primary mb-1">Nieuwe configuratie</h2>
        <p className="text-[13px] text-lx-text-secondary mb-6">Wat wil je maken?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onMaatwerk}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="3" />
              <path d="M9 7l-2 3" /><path d="M13 6l-4 6" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Maatwerk spiegel</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Alle vormen, verlichting en opties. Stap voor stap of met het LoooX hulpje.</p>
          </button>
          <button
            onClick={onProject}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="7" height="14" rx="1.5" />
              <rect x="14" y="5" width="7" height="14" rx="1.5" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Projectspiegel</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Rechthoekige spiegels in aantallen, tegen netto projectprijzen.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfiguratorTypeChooser({ wizard, project }: {
  wizard: ReactNode
  project: ReactNode
}) {
  const router = useRouter()
  const [type, setType] = useState<'maatwerk' | 'project' | null>(null)

  if (type === 'maatwerk') return <>{wizard}</>
  if (type === 'project') return <>{project}</>
  return (
    <TypeSelector
      onMaatwerk={() => setType('maatwerk')}
      onProject={() => setType('project')}
      onClose={() => router.push('/configuraties')}
    />
  )
}
