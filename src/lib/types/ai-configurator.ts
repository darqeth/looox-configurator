import type { ShapeSlug, GlasKleur } from '@/lib/configurator-config'

export type AISuggestion = {
  shape: ShapeSlug
  width?: number
  height?: number
  diameter?: number
  organicSizeKey?: string
  glasKleur: GlasKleur
  directLight: { position: string; type: string | null; control: string | null }
  indirectLight: { position: string; type: string | null; control: string | null }
  selectedOptions: string[]
  optionSubChoices?: Record<string, string>
  confidenceNotes: string[]
  imageRotated?: boolean
}
