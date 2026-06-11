import sharp from 'sharp'
import type { ComposedVisualisation } from './compose'

// AI-fotorealisme-pas (epic fase 2, besluit V7): OpenAI gpt-image-1 maakt het
// composiet natuurlijker (licht, schaduw, integratie), daarna plakken we de
// originele spiegellaag pixel-exact terug. Het product en de reflectie komen
// dus NOOIT uit AI — alleen de omgeving wordt geharmoniseerd.

const PROMPT = [
  'Refine this bathroom interior photo into a fully photorealistic photograph.',
  'The wall-mounted mirror must stay exactly where it is, with identical size, proportions, frame and lighting.',
  'Blend the mirror naturally into the scene: subtle realistic contact shadows on the wall, natural light interaction.',
  'Do not move, resize, restyle or redesign the mirror, the furniture or the room. Keep the composition identical.',
].join(' ')

export async function applyAiPass(composed: ComposedVisualisation): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY ontbreekt')

  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('prompt', PROMPT)
  form.append('size', '1536x1024')
  form.append('quality', 'medium')
  form.append('input_fidelity', 'high')
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

  // Terug naar onze maat en de spiegellaag pixel-exact terugplakken
  const aiImage = await sharp(Buffer.from(b64, 'base64'))
    .resize(composed.width, composed.height)
    .toBuffer()

  return sharp(aiImage)
    .composite([{ input: composed.mirror.layer, left: composed.mirror.x, top: composed.mirror.y }])
    .jpeg({ quality: 88 })
    .toBuffer()
}
