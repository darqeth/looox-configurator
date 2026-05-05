'use client'

import { ShapeSlug, SHAPES } from '@/lib/configurator-config'

function ShapeIcon({ slug }: { slug: ShapeSlug }) {
  if (slug === 'rechthoek') return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="14" width="48" height="36" rx="4" stroke="#9CA3AF" strokeWidth="2.5" />
    </svg>
  )
  if (slug === 'rond') return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="22" stroke="#9CA3AF" strokeWidth="2.5" />
    </svg>
  )
  if (slug === 'organic') return (
    <svg width="64" height="64" viewBox="0 0 200 200" fill="none">
      <path d="M97.8,156.3c-2.7.7-5.4,1.3-8.2,1.1s-1.6-.1-2.2-.3c-3.6-.9-7-1.8-10.2-3.9-22.6-14.7-38.4-35.2-49.6-59.6-9.1-20-8.5-45.1,11.5-56.1s23.8-6.8,36.6-6c27.2,1.8,53.5,9.3,77.2,22.5s22.1,16.3,24.3,28.6c.8,4.4-.7,9.4-.7,9.4-2.6,8.3-7.1,15.4-12.4,22.3-10.1,13-22.9,21.9-37.3,30.2-5.4,3.1-20.8,9.5-29,11.7Z" stroke="#9CA3AF" strokeWidth="8" fill="none" />
    </svg>
  )
  if (slug === 'rounded-rect') return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="14" width="48" height="36" rx="12" stroke="#9CA3AF" strokeWidth="2.5" />
    </svg>
  )
  if (slug === 'ovaal') return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="19" width="48" height="26" rx="13" stroke="#9CA3AF" strokeWidth="2.5" />
    </svg>
  )
  if (slug === 'arc') return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M10,50 L54,50 L54,28 A22,22 0 0 0 10,28 Z" stroke="#9CA3AF" strokeWidth="2.5" fill="none" />
    </svg>
  )
  if (slug === 'sol') return (
    <svg width="64" height="64" viewBox="170 140 660 660">
      <path fill="#9CA3AF" fillRule="evenodd" d="M507.4,176.3c40.6,0,80,8,117.1,23.6,35.8,15.2,68,36.9,95.7,64.5,27.6,27.6,49.3,59.8,64.5,95.7,15.7,37.1,23.6,76.5,23.6,117.1s-.2,12.9-.6,19.3c-.2,3.3-3,5.9-6.3,5.9H213.4c-3.3,0-6.1-2.6-6.3-5.9-.4-6.4-.6-12.9-.6-19.3,0-40.6,8-80,23.6-117.1,15.2-35.8,36.9-68,64.5-95.7,27.6-27.6,59.8-49.3,95.7-64.5,37.1-15.7,76.5-23.6,117.1-23.6M507.4,159.3c-175.6,0-318,142.4-318,318s.2,13.6.7,20.4c.8,12.3,11,21.8,23.3,21.8h588c12.3,0,22.5-9.5,23.3-21.8.4-6.7.7-13.5.7-20.4,0-175.6-142.4-318-318-318h0Z" />
      <path fill="#9CA3AF" fillRule="evenodd" d="M713.2,681.8c3.7,0,5.3,2.5,5.9,4,.6,1.5,1.2,4.3-1.4,6.9-56.5,55.2-131.2,85.6-210.2,85.6s-153.6-30.4-210.2-85.6c-2.6-2.6-2-5.4-1.4-6.9.6-1.5,2.2-4,5.9-4h411.4M713.2,664.8h-411.4c-20.9,0-31.3,25.4-16.3,40.1,57.3,55.9,135.6,90.4,222.1,90.4s164.7-34.5,222.1-90.4c15-14.6,4.6-40.1-16.3-40.1h0Z" />
    </svg>
  )
  if (slug === 'luna') return (
    <svg width="64" height="64" viewBox="78 139 676 676" fill="none">
      <path fill="#9CA3AF"
        d="M642.9,189.6c-4.9-2.3-9.9-4.5-15-6.6-37.2-15.2-77.9-23.7-120.5-23.7-175.6,0-318,142.4-318,318l.7,20.4c.8,12.3,11,21.8,23.3,21.8h426c4.6,0,8.4-3.8,8.4-8.4V197.2c0-3.3-1.9-6.2-4.8-7.6ZM627.9,502.4H213.4c-3.3,0-6.1-2.6-6.3-5.9-.4-6.4-.6-12.9-.6-19.3,0-40.6,8-80,23.6-117.1,15.2-35.8,36.9-68,64.5-95.7,27.6-27.6,59.8-49.3,95.7-64.5,37.1-15.7,76.5-23.6,117.1-23.6s80,8,117.1,23.6c1.1.5,2.3,1,3.4,1.5v301Z"/>
      <path fill="#9CA3AF"
        d="M639.4,664.8h-337.6c-20.9,0-31.3,25.4-16.3,40.1,57.3,55.9,135.6,90.4,222.1,90.4s83.2-8.4,120.3-23.6c5.1-2.1,10.1-4.3,15-6.6,3-1.4,4.8-4.4,4.8-7.6v-84.3c0-4.6-3.8-8.4-8.4-8.4ZM627.9,753.3c-37.5,16.4-78.4,25-120.4,25-79,0-153.6-30.4-210.2-85.6-2.6-2.6-2-5.4-1.4-6.9.6-1.5,2.2-4,5.9-4h326.1v71.5Z"/>
    </svg>
  )
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="14" width="48" height="36" rx="4" stroke="#9CA3AF" strokeWidth="2.5" strokeDasharray="6 3" />
      <text x="32" y="36" textAnchor="middle" fill="#9CA3AF" fontSize="14" fontWeight="600">?</text>
    </svg>
  )
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
