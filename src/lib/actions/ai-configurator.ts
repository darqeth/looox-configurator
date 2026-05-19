'use server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { SHAPES, ROND_DIAMETERS, RECHTHOEK_CONSTRAINTS, EXTRA_OPTIONS } from '@/lib/configurator-config'
import type { AISuggestion } from '@/lib/types/ai-configurator'

const anthropic = new Anthropic()

export async function analyzeSpiegelWithAI(input: {
  description: string | null
  imageBase64: string | null
  imageMimeType: string | null
}): Promise<{ success: true; result: AISuggestion } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }

  if (!input.description && !input.imageBase64) {
    return { success: false, error: 'Geef een beschrijving of upload een afbeelding' }
  }

  const validShapes = SHAPES.map(s => s.slug).join(' | ')
  const validOptions = EXTRA_OPTIONS.map(o => o.id).join(' | ')
  const validDiameters = ROND_DIAMETERS.join(', ')

  // Build per-shape valid options list for the prompt
  const shapeOptionMap = SHAPES.map(s => {
    const opts = EXTRA_OPTIONS.filter(o => o.shapes.includes(s.slug)).map(o => o.id)
    return `- ${s.slug}: ${opts.length ? opts.join(', ') : 'geen'}`
  }).join('\n')

  const systemPrompt = `Je bent een spiegel-configurator assistent voor LoooX, een Nederlands B2B badkamerspiegelbedrijf.
Retourneer ALLEEN een JSON object, geen markdown, geen uitleg.

AFMETINGEN: Geef altijd de werkelijke afmeting in cm als maatwerk (width en height als gehele getallen). Probeer NIET te matchen op vaste maten. Gebruik "diameter" alleen voor rond/sol/luna (kies dichtstbijzijnde uit: ${validDiameters}).

Geldige shapes: ${validShapes}
Geldige glasKleur: "helder" | "smoke-zwart" | "smoke-brons"
Breedte/hoogte bereik: ${RECHTHOEK_CONSTRAINTS.min}–${RECHTHOEK_CONSTRAINTS.max} cm

directLight.position per shape:
- rechthoek/rounded-rect/arc/ovaal: "geen" | "boven" | "boven-beneden" | "links-rechts" | "rondom"
- rond: "geen" | "rondom"
- sol/luna/organic/op-aanvraag: "geen"

indirectLight.position per shape:
- rechthoek/rounded-rect: "geen" | "boven-beneden" | "onder" | "links-rechts" | "rondom"
- rond/organic/ovaal/arc/sol/luna: "geen" | "rondom"
- op-aanvraag: "geen" | "rondom"

Geldige lightType: "3000k" | "4000k" | "rgbw" | "cct"
Geldige control: "externe-schakeling" | "tip-touch" | "3-staps-dimmer" | "wip-schakelaar" | "motion-sensor" | "afstandsbediening"

OPTIES — selecteer ALLEEN opties die geldig zijn voor de gekozen shape:
${shapeOptionMap}

Sub-keuzes (alleen invullen als duidelijk uit invoer blijkt):
- "optionSubChoices": {
    "makeup-spiegel": "links" | "midden" | "rechts",
    "digitale-klok": "links" | "midden" | "rechts",
    "frame-in-kleur": "aluminium" | "zwart" | "gun-metal" | "brushed-brass" | "brushed-copper"
  }
Laat optionSubChoices weg als niets ingevuld kan worden.

Als position "geen" is, zet type en control op null.
Voeg onzekerheden toe aan "confidenceNotes" array (lege array als alles zeker is).
Default glasKleur: "helder". Default shape indien onbekend: "op-aanvraag".`

  const contentBlocks: Anthropic.MessageParam['content'] = []

  const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
  type ValidMime = typeof VALID_MIME_TYPES[number]

  if (input.imageBase64 && input.imageMimeType) {
    const mimeType: ValidMime = VALID_MIME_TYPES.includes(input.imageMimeType as ValidMime)
      ? (input.imageMimeType as ValidMime)
      : 'image/jpeg'
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: input.imageBase64,

      },
    })
  }

  if (input.description) {
    contentBlocks.push({ type: 'text', text: input.description })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    // Extract JSON object from response, even if surrounded by text or code fences
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI configurator] no JSON in response:', text)
      return { success: false, error: 'AI kon geen configuratie bepalen. Voeg meer detail toe aan uw beschrijving.' }
    }
    const raw = JSON.parse(jsonMatch[0]) as AISuggestion

    // Snap diameter to nearest valid value
    if (raw.diameter != null) {
      raw.diameter = ROND_DIAMETERS.reduce((prev, curr) =>
        Math.abs(curr - raw.diameter!) < Math.abs(prev - raw.diameter!) ? curr : prev
      )
    }
    // Clamp width/height
    if (raw.width != null) raw.width = Math.min(RECHTHOEK_CONSTRAINTS.max, Math.max(RECHTHOEK_CONSTRAINTS.min, Math.round(raw.width)))
    if (raw.height != null) raw.height = Math.min(RECHTHOEK_CONSTRAINTS.max, Math.max(RECHTHOEK_CONSTRAINTS.min, Math.round(raw.height)))
    // Validate shape
    const validShapesList = SHAPES.map(s => s.slug)
    if (!validShapesList.includes(raw.shape)) raw.shape = 'op-aanvraag'
    // Validate options — only keep options valid for the selected shape
    const validOptionsForShape = EXTRA_OPTIONS.filter(o => o.shapes.includes(raw.shape)).map(o => o.id)
    raw.selectedOptions = Array.isArray(raw.selectedOptions) ? raw.selectedOptions.filter(o => validOptionsForShape.includes(o)) : []
    // Ensure arrays/objects exist
    raw.confidenceNotes = raw.confidenceNotes ?? []

    return { success: true, result: raw }
  } catch (err) {
    console.error('[AI configurator] error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AI-analyse mislukt: ${msg}` }
  }
}
