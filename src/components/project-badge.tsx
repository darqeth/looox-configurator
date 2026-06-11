// Type-badge voor projectspiegel-rijen in gemengde lijsten (besluit B5)
export function ProjectBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 whitespace-nowrap align-middle ${className}`}>
      Project
    </span>
  )
}
