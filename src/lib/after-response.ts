import { waitUntil } from '@vercel/functions'

// Voert werk uit ná het versturen van de response, zonder dat het verloren
// gaat op Vercel serverless (audit C4: fire-and-forget promises worden daar
// niet gegarandeerd afgemaakt). Fouten worden altijd gelogd — nooit meer
// stil falende orderbevestigingen.
export function runAfterResponse(label: string, promise: Promise<unknown>) {
  const logged = promise.catch((e) => {
    console.error(`[after-response:${label}]`, e)
  })
  try {
    waitUntil(logged)
  } catch {
    // Buiten Vercel (lokaal/tests) is er geen request-context — gewoon laten lopen
    void logged
  }
}
