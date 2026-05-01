'use client'

import { useState, useTransition } from 'react'
import { updateDownload } from '@/lib/actions/downloads'
import { DeleteDownloadButton, MoveDownloadButtons } from './download-actions'

const EXT_OPTIONS = ['PDF', 'ZIP', 'DOCX', 'XLSX', 'DWG', 'AI', 'EPS']

const EXT_COLORS: Record<string, string> = {
  PDF:  'bg-red-50 text-red-600',
  ZIP:  'bg-blue-50 text-blue-600',
  DOCX: 'bg-sky-50 text-sky-600',
  XLSX: 'bg-green-50 text-green-700',
  DWG:  'bg-orange-50 text-orange-600',
  AI:   'bg-amber-50 text-amber-700',
  EPS:  'bg-purple-50 text-purple-600',
}

interface Download {
  id: string
  title: string
  file_url: string
  file_ext: string
  file_size: string
}

export default function EditDownloadRow({
  dl,
  isFirst,
  isLast,
}: {
  dl: Download
  isFirst: boolean
  isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(dl.title)
  const [fileUrl, setFileUrl] = useState(dl.file_url)
  const [fileExt, setFileExt] = useState(dl.file_ext)
  const [fileSize, setFileSize] = useState(dl.file_size)
  const [isPending, startTransition] = useTransition()

  const extStyle = EXT_COLORS[dl.file_ext] ?? 'bg-lx-panel-bg text-lx-text-secondary'

  function handleSave() {
    if (!title.trim() || !fileUrl.trim()) return
    startTransition(async () => {
      await updateDownload(dl.id, { title, file_url: fileUrl, file_ext: fileExt, file_size: fileSize })
      setEditing(false)
    })
  }

  function handleCancel() {
    setTitle(dl.title)
    setFileUrl(dl.file_url)
    setFileExt(dl.file_ext)
    setFileSize(dl.file_size)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-lx-cta/30 px-4 py-3.5 space-y-3">
        {/* Bestandstype */}
        <div className="flex flex-wrap gap-1.5">
          {EXT_OPTIONS.map((ext) => (
            <button
              key={ext}
              type="button"
              onClick={() => setFileExt(ext)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition-all cursor-pointer ${
                fileExt === ext
                  ? 'bg-lx-cta text-white border-lx-cta'
                  : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
              }`}
            >
              {ext}
            </button>
          ))}
        </div>

        {/* Naam */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Naam"
          className="w-full px-3 py-2 rounded-lg border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
        />

        {/* URL + grootte */}
        <div className="flex gap-2">
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          />
          <input
            type="text"
            value={fileSize}
            onChange={(e) => setFileSize(e.target.value)}
            maxLength={20}
            placeholder="12 MB"
            className="w-24 px-3 py-2 rounded-lg border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
          />
        </div>

        {/* Acties */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !fileUrl.trim() || isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-lx-cta text-white text-[12.5px] font-semibold hover:bg-lx-cta-hover disabled:opacity-60 transition-all cursor-pointer"
          >
            {isPending ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {isPending ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 py-1.5 rounded-lg border border-black/12 text-lx-text-secondary text-[12.5px] font-medium hover:bg-lx-panel-bg disabled:opacity-60 transition-colors cursor-pointer"
          >
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 px-4 py-3 flex items-center gap-3 group">
      <MoveDownloadButtons id={dl.id} isFirst={isFirst} isLast={isLast} />

      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${extStyle}`}>
        {dl.file_ext}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-lx-text-primary truncate">{dl.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <a
            href={dl.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-lx-cta hover:underline truncate max-w-xs"
          >
            {dl.file_url}
          </a>
          {dl.file_size && (
            <span className="text-[11px] text-lx-text-muted flex-shrink-0">· {dl.file_size}</span>
          )}
        </div>
      </div>

      {/* Edit knop */}
      <button
        onClick={() => setEditing(true)}
        title="Bewerken"
        className="flex-shrink-0 w-7 h-7 rounded-lg text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg flex items-center justify-center transition-all cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
        </svg>
      </button>

      <DeleteDownloadButton id={dl.id} />
    </div>
  )
}
