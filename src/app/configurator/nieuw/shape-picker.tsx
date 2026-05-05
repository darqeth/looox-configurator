'use client'

import { ShapeSlug, SHAPES } from '@/lib/configurator-config'

function ShapeIcon({ slug }: { slug: ShapeSlug }) {
  return <img src={`/icons/shapes/${slug}.svg`} width="64" height="64" alt="" />
}

interface ShapePickerProps {
  onSelect: (shape: ShapeSlug) => void
  onClose?: () => void
}

export default function ShapePicker({ onSelect, onClose }: ShapePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-[26px] font-bold text-lx-text-primary">Spiegel vorm</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-muted transition-colors"
              aria-label="Sluiten"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <p className="text-lx-text-secondary text-[14px] mb-8">Kies de vorm van de spiegel die je wil samenstellen.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SHAPES.map((shape) => (
            <button
              key={shape.slug}
              onClick={() => onSelect(shape.slug)}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-transparent hover:border-lx-cta hover:bg-lx-panel-bg transition-all duration-150"
            >
              <div className="group-hover:[&_path]:stroke-[#3D6B4F] group-hover:[&_rect]:stroke-[#3D6B4F] group-hover:[&_circle]:stroke-[#3D6B4F] transition-colors">
                <ShapeIcon slug={shape.slug} />
              </div>
              <span className="text-[13.5px] font-semibold text-lx-text-primary text-center leading-tight">
                {shape.name}
              </span>
              {shape.fromPrice ? (
                <span className="text-[11px] text-lx-text-secondary">Vanaf €{shape.fromPrice}</span>
              ) : (
                <span className="text-[11px] text-lx-cta font-medium">Maatwerk</span>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
