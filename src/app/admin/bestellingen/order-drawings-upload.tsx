'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setControleVereist } from '@/lib/actions/admin'

type UploadedFile = { file_url: string; file_name: string }

export function OrderDrawingsUploadModal({
  orderId,
  onSuccess,
  onCancel,
}: {
  orderId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const pdfs = selected.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (pdfs.length !== selected.length) setError('Alleen PDF-bestanden zijn toegestaan')
    else setError('')
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...pdfs.filter(f => !names.has(f.name))]
    })
    e.target.value = ''
  }

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  async function handleSubmit() {
    if (files.length === 0) { setError('Voeg minimaal één PDF toe'); return }
    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const uploaded: UploadedFile[] = []

      for (const file of files) {
        const ext = 'pdf'
        const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('drawings')
          .upload(path, file, { contentType: 'application/pdf', upsert: false })

        if (uploadError) throw new Error(uploadError.message)

        const { data: { publicUrl } } = supabase.storage.from('drawings').getPublicUrl(path)
        uploaded.push({ file_url: publicUrl, file_name: file.name })
      }

      startTransition(async () => {
        const result = await setControleVereist(orderId, uploaded)
        if (result.success) {
          onSuccess()
        } else {
          setError(result.error ?? 'Er ging iets mis')
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-black/8 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-lx-divider">
          <h2 className="text-[15px] font-bold text-lx-text-primary">Tekeningen uploaden</h2>
          <button onClick={onCancel} disabled={busy} className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-lx-text-secondary leading-relaxed">
            Upload de technische tekeningen. De klant krijgt een mail met een verzoek om deze goed te keuren.
          </p>

          {/* Drop zone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full border-2 border-dashed border-lx-divider hover:border-lx-cta rounded-xl p-6 text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-lx-panel-bg group-hover:bg-lx-cta/10 flex items-center justify-center mx-auto mb-3 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-lx-text-primary">Klik om PDF's te selecteren</p>
            <p className="text-[11.5px] text-lx-text-secondary mt-1">Meerdere bestanden mogelijk</p>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileChange} />

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-lx-panel-bg border border-lx-divider">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="flex-1 text-[12.5px] font-medium text-lx-text-primary truncate">{f.name}</span>
                  <span className="text-[11px] text-lx-text-secondary flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeFile(f.name)} disabled={busy} className="w-6 h-6 rounded-md flex items-center justify-center text-lx-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-[13px] font-semibold text-lx-text-primary hover:bg-lx-panel-bg transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || files.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Bezig…' : `Verstuur naar klant (${files.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
