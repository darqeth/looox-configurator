'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteConfiguration } from '@/lib/actions/configurator'

interface Props {
  configId: string
  configName: string
  canDownload: boolean
  canEdit: boolean
  canDelete: boolean
}

export default function ConfigActionsMenu({ configId, configName, canDownload, canEdit, canDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteConfiguration(configId)
      setConfirmDelete(false)
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  if (!canDownload && !canEdit && !canDelete) return null

  return (
    <div className="flex-shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Meer opties"
        className="w-11 h-11 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg transition-colors cursor-pointer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div ref={menuRef} className="fixed w-44 bg-white rounded-xl shadow-lg border border-black/8 py-1 z-[200]"
          style={{ top: menuPos.top, right: menuPos.right }}>
          {canDownload && (
            <a
              href={`/api/pdf/offerte/${configId}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-lx-text-primary hover:bg-lx-panel-bg transition-colors cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Klantofferte
            </a>
          )}
          {canEdit && (
            <Link
              href={`/configurator/${configId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-lx-text-primary hover:bg-lx-panel-bg transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
              Bewerken
            </Link>
          )}
          {canDelete && (
            <>
              {(canDownload || canEdit) && <div className="my-1 mx-2 border-t border-lx-divider" />}
              <button
                onClick={() => { setOpen(false); setConfirmDelete(true) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Verwijderen
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <h2 className="text-[16px] font-bold text-lx-text-primary text-center mb-1">Configuratie verwijderen</h2>
              <p className="text-[13px] text-lx-text-secondary text-center leading-relaxed">
                Weet je zeker dat je <span className="font-semibold text-lx-text-primary">{configName}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 h-11 rounded-xl border border-black/10 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors disabled:opacity-50">
                Annuleren
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13.5px] font-semibold transition-colors disabled:opacity-50">
                {deleting ? 'Verwijderen…' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
