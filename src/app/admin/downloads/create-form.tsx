'use client'

import { useState, useTransition } from 'react'
import { createDownload } from '@/lib/actions/downloads'

const EXT_OPTIONS = ['PDF', 'ZIP', 'DOCX', 'XLSX', 'DWG', 'AI', 'EPS']

export default function CreateDownloadForm() {
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileExt, setFileExt] = useState('PDF')
  const [fileSize, setFileSize] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !fileUrl.trim()) return
    startTransition(async () => {
      await createDownload({ title, file_url: fileUrl, file_ext: fileExt, file_size: fileSize })
      setTitle('')
      setFileUrl('')
      setFileExt('PDF')
      setFileSize('')
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
      <p className="text-[13.5px] font-semibold text-lx-text-primary">Nieuw bestand toevoegen</p>

      {/* Bestandstype */}
      <div>
        <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
          Bestandstype
        </label>
        <div className="flex flex-wrap gap-2">
          {EXT_OPTIONS.map((ext) => (
            <button
              key={ext}
              type="button"
              onClick={() => setFileExt(ext)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
                fileExt === ext
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
              }`}
            >
              {ext}
            </button>
          ))}
        </div>
      </div>

      {/* Naam */}
      <div>
        <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
          Naam <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Bijv. LoooX Catalogus 2025"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          required
        />
      </div>

      {/* URL + grootte */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
            Download URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
            Bestandsgrootte
          </label>
          <input
            type="text"
            value={fileSize}
            onChange={(e) => setFileSize(e.target.value)}
            maxLength={20}
            placeholder="12 MB"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!title.trim() || !fileUrl.trim() || isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-60 transition-all"
      >
        {isPending ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        ) : done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
        )}
        {done ? 'Toegevoegd!' : isPending ? 'Toevoegen…' : 'Bestand toevoegen'}
      </button>
    </form>
  )
}
