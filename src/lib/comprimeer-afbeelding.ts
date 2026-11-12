// Verkleint een foto of schermafbeelding in de browser voordat hij wordt geüpload,
// zodat de opslag niet volloopt. Een maattekening blijft op 2400 px ruim leesbaar.
// Pdf's en andere bestanden gaan ongewijzigd door, net als afbeeldingen die er
// niet kleiner van worden.

const MAX_ZIJDE = 2400
const KWALITEIT = 0.82
/** Kleiner dan dit is comprimeren de moeite niet */
const ONDERGRENS = 300 * 1024

export async function comprimeerAfbeelding(bestand: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(bestand.type) || bestand.size < ONDERGRENS) return bestand
  try {
    const bitmap = await createImageBitmap(bestand, { imageOrientation: 'from-image' })
    const schaal = Math.min(1, MAX_ZIJDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * schaal)
    canvas.height = Math.round(bitmap.height * schaal)
    const ctx = canvas.getContext('2d')
    if (!ctx) return bestand
    // Witte ondergrond: een png met transparantie wordt anders zwart als jpeg
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((klaar) => canvas.toBlob(klaar, 'image/jpeg', KWALITEIT))
    if (!blob || blob.size >= bestand.size) return bestand
    return new File([blob], bestand.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Kan de browser het bestand niet lezen, dan het origineel uploaden
    return bestand
  }
}
