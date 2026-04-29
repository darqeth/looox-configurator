'use client'

interface StepOptiesProps {
  ophanging: boolean
  voormonteren: boolean
  onChange: (updates: Partial<{ ophanging: boolean; voormonteren: boolean }>) => void
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-lx-divider last:border-0">
      <div>
        <p className="text-[13px] font-medium text-lx-text-primary">{label}</p>
        {description && <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            className={`px-4 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${
              value === v
                ? 'bg-lx-cta text-white border-lx-cta'
                : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta hover:text-lx-cta'
            }`}
          >
            {v ? 'Ja' : 'Nee'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StepOpties({ ophanging, voormonteren, onChange }: StepOptiesProps) {
  return (
    <div className="bg-lx-panel-bg rounded-2xl px-4">
      <ToggleRow
        label="Ophanging"
        description="Ophangmateriaal wordt meegeleverd"
        value={ophanging}
        onChange={(v) => onChange(v ? { ophanging: true } : { ophanging: false, voormonteren: false })}
      />
      {ophanging && (
        <ToggleRow
          label="Voormonteren"
          description="Ophangmateriaal wordt voorgemonteerd geleverd (geen meerprijs)"
          value={voormonteren}
          onChange={(v) => onChange({ voormonteren: v })}
        />
      )}
    </div>
  )
}
