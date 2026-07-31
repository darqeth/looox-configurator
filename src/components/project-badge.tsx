// Type-badge voor projectspiegel-rijen in gemengde lijsten (besluit B5)
export function ProjectBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 whitespace-nowrap align-middle ${className}`}>
      Project
    </span>
  )
}

// Markeert spiegel-op-aanvraag-rijen als offerteaanvraag (nog géén bestelling),
// zodat ze in de bestellingenlijsten niet als order worden gelezen.
export function OfferteBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap align-middle ${className}`}>
      Offerteaanvraag
    </span>
  )
}
