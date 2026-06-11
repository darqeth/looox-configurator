// Eén gedeelde save-state voor beide configuratoren (maatwerk én project).
// Laatst bewerkte configuratie wint; bij "Nieuwe spiegel" ga je verder waar
// je was gebleven, ongeacht het type. Drafts verlopen na 7 dagen.

export type ProjectDraftData = {
  step: number
  lengte: number
  hoogte: number
  glasdikte: string
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
}

// De wizard bewaart zijn eigen veldenset; structuur blijft daar gedefinieerd
export type MaatwerkDraftData = Record<string, unknown>

export type ConfiguratorDraft =
  | { type: 'maatwerk'; savedAt: number; data: MaatwerkDraftData }
  | { type: 'project'; savedAt: number; data: ProjectDraftData }

const KEY = 'lx-configurator-draft-v2'
const LEGACY_KEY = 'lx-configurator-draft-v1'
const MAX_AGE_MS = 7 * 24 * 3600 * 1000

export function loadDraft(): ConfiguratorDraft | null {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      // Migratie van het oude (alleen-maatwerk) formaat
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        const d = JSON.parse(legacy)
        const wrapped = { type: 'maatwerk' as const, savedAt: d?.savedAt ?? Date.now(), data: d }
        localStorage.setItem(KEY, JSON.stringify(wrapped))
        localStorage.removeItem(LEGACY_KEY)
        raw = JSON.stringify(wrapped)
      }
    }
    if (!raw) return null
    const draft = JSON.parse(raw) as ConfiguratorDraft
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) return null
    if (draft.type !== 'maatwerk' && draft.type !== 'project') return null
    return draft
  } catch {
    return null
  }
}

export function saveDraft(type: ConfiguratorDraft['type'], data: MaatwerkDraftData | ProjectDraftData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ type, savedAt: Date.now(), data }))
  } catch { /* storage vol of geblokkeerd */ }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* ignore */ }
}
