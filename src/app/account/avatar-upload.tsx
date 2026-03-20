'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AvatarUpload({
  userId,
  currentUrl,
  name,
}: {
  userId: string
  currentUrl: string | null
  name: string | null
}) {
  const [url, setUrl] = useState(currentUrl)
  const [imgError, setImgError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Bestand is te groot (max 2 MB)')
      return
    }

    setUploading(true)
    setError('')

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload mislukt: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = data.publicUrl + '?t=' + Date.now()
    setImgError(false)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    if (updateError) {
      setError('Opslaan mislukt: ' + updateError.message)
    } else {
      setUrl(publicUrl)
    }

    setUploading(false)
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar preview */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 group"
      >
        {url && !imgError ? (
          <img src={url} alt="Logo" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full bg-lx-icon-bg flex items-center justify-center text-lx-cta text-[18px] font-bold">
            {initials}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
        )}
      </button>

      {/* Info */}
      <div>
        <p className="text-[13px] font-medium text-lx-text-primary">Bedrijfslogo</p>
        <p className="text-[11.5px] text-lx-text-secondary mt-0.5">JPG of PNG, max 2 MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1.5 text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors disabled:opacity-50"
        >
          {uploading ? 'Bezig met uploaden...' : url ? 'Afbeelding wijzigen' : 'Afbeelding uploaden'}
        </button>
        {error && <p className="text-[11.5px] text-red-500 mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
