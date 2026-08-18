import sharp from 'sharp'

// react-pdf's JPEG-decoder struikelt over moderne iPhone-foto's (Display P3-
// profiel, EXIF/Apple-metadata): hij sluit dan geen afbeelding in en de
// bijlagepagina blijft blanco ("Unknown version …"). Normaliseer daarom vóór
// het renderen naar een schone, correct gedraaide, verkleinde sRGB-JPEG als
// data-URI — die leest react-pdf wél in. Lukt ophalen/verwerken niet (bv. een
// PDF-bijlage, die sharp niet verwerkt), dan null → geen bijlagepagina i.p.v.
// een kapotte.
export async function prepareAttachmentForPdf(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const out = await sharp(input)
      .rotate() // corrigeer EXIF-oriëntatie (iPhone-foto's staan vaak gedraaid)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch (e) {
    console.error('[pdf-attachment]', e)
    return null
  }
}
