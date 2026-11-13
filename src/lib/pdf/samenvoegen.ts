import { PDFDocument } from 'pdf-lib'

/** Voegt losse PDF's samen tot één document, in de gegeven volgorde. */
export async function voegPdfsSamen(buffers: (Buffer | Uint8Array)[]): Promise<Buffer> {
  const doel = await PDFDocument.create()
  for (const buffer of buffers) {
    const bron = await PDFDocument.load(buffer)
    const paginas = await doel.copyPages(bron, bron.getPageIndices())
    paginas.forEach((p) => doel.addPage(p))
  }
  return Buffer.from(await doel.save())
}

/** Begint het bestand als een PDF? De bestandsnaam zegt niet altijd wat erin zit. */
export function isPdf(buffer: Buffer | Uint8Array): boolean {
  return buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
}

/**
 * Hangt de pagina's van een PDF-bijlage (maattekening) achter het document. Een afbeelding
 * staat al op een eigen pagina in het document zelf; die slaat deze functie over. Kan de
 * bijlage niet worden gelezen (beveiligd of beschadigd), dan blijft het document zoals het was.
 */
export async function voegPdfBijlageToe(document: Buffer, bijlage: Buffer | Uint8Array | null): Promise<Buffer> {
  if (!bijlage || !isPdf(bijlage)) return document
  try {
    return await voegPdfsSamen([document, bijlage])
  } catch (e) {
    console.error('[pdf-bijlage] samenvoegen mislukt', e)
    return document
  }
}

/** Haalt een bijlage op als het een PDF is; null bij een afbeelding, geen bijlage of een fout. */
export async function haalPdfBijlage(url: string | null | undefined): Promise<Buffer | null> {
  // Een herkenbare afbeelding hoeft niet nog eens opgehaald te worden; bij twijfel kijken we in het bestand.
  if (!url || /\.(jpe?g|png|webp|heic|heif|gif)($|\?)/i.test(url)) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    return isPdf(buffer) ? buffer : null
  } catch (e) {
    console.error('[pdf-bijlage] ophalen mislukt', e)
    return null
  }
}
