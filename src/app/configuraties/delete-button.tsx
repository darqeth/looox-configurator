'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteConfiguration, adminDeleteConfiguration } from '@/lib/actions/configurator'

export default function DeleteButton({ configId, configName, isAdmin = false }: {
  configId: string
  configName: string
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      if (isAdmin) {
        await adminDeleteConfiguration(configId)
      } else {
        await deleteConfiguration(configId)
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Verwijderen"
        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-lx-text-secondary hover:text-red-500 transition-colors cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !loading && setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 h-11 rounded-xl border border-black/10 text-lx-text-secondary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13.5px] font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Verwijderen…' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
