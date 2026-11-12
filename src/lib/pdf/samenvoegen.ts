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
