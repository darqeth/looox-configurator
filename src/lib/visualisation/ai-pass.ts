import sharp from 'sharp'
import type { ComposedVisualisation } from './compose'

// AI-fotorealisme-pas (epic fase 2, besluit V7): OpenAI gpt-image-2 maakt het
// composiet natuurlijker (licht, schaduw, integratie), daarna plakken we de
// originele spiegellaag pixel-exact terug. Het product en de reflectie komen
// dus NOOIT uit AI — alleen de omgeving wordt geharmoniseerd.

const PROMPT = [
  'Refine this bathroom interior photo into a fully photorealistic photograph.',
  'The wall-mounted mirror must stay exactly where it is, with identical size, proportions, frame and lighting.',
  'Blend the mirror naturally into the scene: subtle realistic contact shadows on the wall, natural light interaction.',
  'Do not move, resize, restyle or redesign anything. Keep the composition identical.',
].join(' ')

// Bewerkbare zone: band rond de spiegel (gloed/schaduw), zacht uitlopend.
// Wit = bewerkbaar; wordt zowel als API-masker als bij het terugplakken
// gebruikt zodat de rest van het beeld gegarandeerd pixel-origineel blijft.
async function bandMask(c: ComposedVisualisation): Promise<Buffer> {
  // Asymmetrisch: royaal boven/zijkanten (gloed), kort onder de spiegel
  // zodat de band boven kranen en meubel stopt
  const pad = Math.round(Math.min(c.mirror.w, c.mirror.h) * 0.25)
  const padOnder = Math.round(pad * 0.3)
  const feather = 35
  const svg = `<svg width="${c.width}" height="${c.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${c.width}" height="${c.height}" fill="#000"/>
    <rect x="${c.mirror.x - pad}" y="${c.mirror.y - pad}" width="${c.mirror.w + pad * 2}" height="${c.mirror.h + pad + padOnder}" rx="${padOnder}" fill="#fff"/>
  </svg>`
  return sharp(Buffer.from(svg)).blur(feather / 3).greyscale().png().toBuffer()
}

// PNG met alpha = band (voor dest-in compositing bij het terugplakken)
async function withAlpha(c: ComposedVisualisation, band: Buffer): Promise<Buffer> {
  return sharp({ create: { width: c.width, height: c.height, channels: 3, background: '#000' } })
    .joinChannel(await sharp(band).extractChannel(0).toBuffer())
    .png()
    .toBuffer()
}

export async function applyAiPass(composed: ComposedVisualisation): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY ontbreekt')

  const band = await bandMask(composed)

  const form = new FormData()
  // gpt-image-2 (apr 2026): verwerkt input altijd op high fidelity,
  // de input_fidelity-parameter is vervallen
  form.append('model', 'gpt-image-2')
  form.append('prompt', PROMPT)
  form.append('size', '1536x1024')
  form.append('quality', 'medium')
  form.append('image', new Blob([new Uint8Array(composed.jpeg)], { type: 'image/jpeg' }), 'scene.jpg')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = await res.json() as { data?: { b64_json?: string }[] }
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI gaf geen beeld terug')

  // Terug naar onze maat; daarna alleen de band uit de AI-output gebruiken
  // (origineel overal elders) en de spiegellaag pixel-exact terugplakken
  const aiImage = await sharp(Buffer.from(b64, 'base64'))
    .resize(composed.width, composed.height)
    .png()
    .toBuffer()
  const bandAlpha = await withAlpha(composed, band)
  const aiBand = await sharp(aiImage)
    .composite([{ input: bandAlpha, blend: 'dest-in' }])
    .png()
    .toBuffer()

  return sharp(composed.jpeg)
    .composite([
      { input: aiBand },
      { input: composed.mirror.layer, left: composed.mirror.x, top: composed.mirror.y },
    ])
    .jpeg({ quality: 88 })
    .toBuffer()
}
