'use client'
import { X } from 'lucide-react'

interface ModeSelectorProps {
  onSelectManual: () => void
  onSelectAI: () => void
  onClose: () => void
}

export function ModeSelector({ onSelectManual, onSelectAI, onClose }: ModeSelectorProps) {
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
        <h2 className="text-[20px] font-bold text-lx-text-primary mb-1">Nieuwe spiegel</h2>
        <p className="text-[13px] text-lx-text-secondary mb-6">Hoe wil je beginnen?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onSelectManual}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">Zelf configureren</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Kies vorm, maat en opties stap voor stap.</p>
          </button>
          <button
            onClick={onSelectAI}
            className="text-left border border-lx-divider rounded-xl p-5 hover:border-lx-cta hover:bg-lx-icon-bg transition-colors cursor-pointer"
          >
            <svg className="text-lx-cta mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" /><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" />
            </svg>
            <p className="font-semibold text-lx-text-primary text-[15px] mb-1">LoooX hulpje</p>
            <p className="text-[13px] text-lx-text-secondary leading-relaxed">Beschrijf of upload een schets, wij vullen de configuratie automatisch in.</p>
          </button>
        </div>
      </div>
    </div>
  )
}
