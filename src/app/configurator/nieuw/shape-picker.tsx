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
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M32 8 C48 8 58 18 56 32 C54 46 44 58 30 56 C16 54 6 44 8 30 C10 16 16 8 32 8Z" stroke="#9CA3AF" strokeWidth="2.5" fill="none" />
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
}

export default function ShapePicker({ onSelect }: ShapePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8">
        <h1 className="text-[26px] font-bold text-[#1A1A1A] mb-1">Spiegel vorm</h1>
        <p className="text-[#6B7280] text-[14px] mb-8">Kies de vorm van de spiegel die je wil samenstellen.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SHAPES.map((shape) => (
            <button
              key={shape.slug}
              onClick={() => onSelect(shape.slug)}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-transparent hover:border-[#3D6B4F] hover:bg-[#F5F3EF] transition-all duration-150"
            >
              <div className="group-hover:[&_path]:stroke-[#3D6B4F] group-hover:[&_rect]:stroke-[#3D6B4F] group-hover:[&_circle]:stroke-[#3D6B4F] transition-colors">
                <ShapeIcon slug={shape.slug} />
              </div>
              <span className="text-[13.5px] font-semibold text-[#1A1A1A] text-center leading-tight">
                {shape.name}
              </span>
              {shape.fromPrice ? (
                <span className="text-[11px] text-[#6B7280]">Vanaf €{shape.fromPrice}</span>
              ) : (
                <span className="text-[11px] text-[#3D6B4F] font-medium">Maatwerk</span>
              )}
            </button>
          ))}
        </div>

        {/* Moon coming soon */}
        <div className="mt-4 flex justify-center">
          <div className="flex flex-col items-center gap-2 p-4 opacity-40 cursor-not-allowed select-none">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <path d="M44 32 C44 44 36 54 26 54 C20 54 14 50 10 44 C16 46 24 44 30 38 C36 32 38 22 36 14 C40 18 44 24 44 32Z" stroke="#9CA3AF" strokeWidth="2.5" fill="none" />
            </svg>
            <span className="text-[12px] font-semibold text-[#6B7280]">Moon</span>
            <span className="text-[10px] bg-[#F0EDE8] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">Binnenkort</span>
          </div>
        </div>
      </div>
    </div>
  )
}
