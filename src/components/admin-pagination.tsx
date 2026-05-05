'use client'

interface AdminPaginationProps {
  currentPage: number
  totalPages: number
  total: number
  pageSize: number
  /** URL-based: pass basePath + optional hrefParams */
  basePath?: string
  hrefParams?: Record<string, string>
  /** State-based: pass onPageChange callback */
  onPageChange?: (page: number) => void
}

export function AdminPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  basePath,
  hrefParams,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)

  function buildHref(page: number) {
    const params = new URLSearchParams(hrefParams ?? {})
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    const qs = params.toString()
    return `${basePath ?? ''}${qs ? '?' + qs : ''}`
  }

  function getPages(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()
  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  const navBtnClass = (disabled: boolean) =>
    `h-8 px-3 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors select-none ${
      disabled
        ? 'text-lx-text-secondary/30 cursor-default'
        : 'text-lx-text-secondary hover:bg-lx-panel-bg hover:text-lx-text-primary cursor-pointer'
    }`

  const pageBtnClass = (active: boolean) =>
    `h-8 w-8 flex items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
      active
        ? 'bg-lx-text-primary text-white'
        : 'text-lx-text-secondary hover:bg-lx-panel-bg hover:text-lx-text-primary cursor-pointer'
    }`

  return (
    <div className="flex flex-col items-center gap-2 mt-4 pb-1">
      <p className="text-[12px] text-lx-text-secondary">
        {from}–{to} van {total}
      </p>
      <div className="flex items-center gap-0.5">
        {/* Prev */}
        {onPageChange ? (
          <button disabled={isFirst} onClick={() => onPageChange(currentPage - 1)} className={navBtnClass(isFirst)}>‹</button>
        ) : (
          <a href={!isFirst ? buildHref(currentPage - 1) : undefined} aria-disabled={isFirst} className={navBtnClass(isFirst)}>‹</a>
        )}

        {/* Pages */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`d${i}`} className="h-8 w-6 flex items-center justify-center text-lx-text-secondary/40 text-[12px] select-none">…</span>
          ) : onPageChange ? (
            <button key={p} onClick={() => onPageChange(p as number)} className={pageBtnClass(p === currentPage)}>{p}</button>
          ) : (
            <a key={p} href={buildHref(p as number)} className={pageBtnClass(p === currentPage)}>{p}</a>
          )
        )}

        {/* Next */}
        {onPageChange ? (
          <button disabled={isLast} onClick={() => onPageChange(currentPage + 1)} className={navBtnClass(isLast)}>›</button>
        ) : (
          <a href={!isLast ? buildHref(currentPage + 1) : undefined} aria-disabled={isLast} className={navBtnClass(isLast)}>›</a>
        )}
      </div>
    </div>
  )
}
