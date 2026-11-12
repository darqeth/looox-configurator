import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { projectKop, projectRegel, projectTotaal, type ProjectConfigRij } from '@/lib/project'
import { formatCents } from '@/lib/meubel-config'

export const metadata = { title: 'Projecten | LoooX Configurator' }

// Overzicht van de projecten (winkelmandjes) van de ingelogde gebruiker:
// open projecten bovenaan, daaronder wat al besteld is.
export default async function ProjectenPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: rijen } = await supabase
    .from('configurations')
    .select('id, name, total_price, status, width, height, selected_options, project_id, updated_at')
    .eq('user_id', userId)
    .not('project_id', 'is', null)
    .in('status', ['saved', 'ordered'])
    .order('created_at')
    .limit(1000)

  // Regels per project bundelen
  const perProject = new Map<string, (ProjectConfigRij & { updated_at: string })[]>()
  for (const rij of rijen ?? []) {
    const id = rij.project_id as string
    perProject.set(id, [...(perProject.get(id) ?? []), rij])
  }
  const projecten = [...perProject.entries()].map(([id, configs]) => {
    const regels = configs.map(projectRegel)
    return {
      id,
      kop: projectKop(configs),
      regels,
      totaal: projectTotaal(regels),
      besteld: regels.some((r) => r.besteld),
      bijgewerkt: configs.reduce((laatst, c) => (c.updated_at > laatst ? c.updated_at : laatst), ''),
    }
  }).sort((a, b) => Number(a.besteld) - Number(b.besteld) || b.bijgewerkt.localeCompare(a.bijgewerkt))

  const open = projecten.filter((p) => !p.besteld)
  const besteld = projecten.filter((p) => p.besteld)

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Projecten</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Meerdere producten samen in één offerte en één bestelling</p>
      </div>

      {projecten.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-lx-icon-bg flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-5 h-5 text-lx-cta" />
          </div>
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen projecten</p>
          <p className="text-[13px] text-lx-text-secondary max-w-md mx-auto leading-relaxed">
            Kies bij het opslaan van een product voor &ldquo;Opslaan en nog een product toevoegen&rdquo;, of open het menu van een configuratie en kies &ldquo;Product toevoegen&rdquo;.
          </p>
          <Link href="/configurator/nieuw" className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors mt-5">
            Nieuwe configuratie
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {[{ titel: 'Open', lijst: open }, { titel: 'Besteld', lijst: besteld }].filter((g) => g.lijst.length > 0).map((groep) => (
            <section key={groep.titel}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">{groep.titel} · {groep.lijst.length}</h2>
              <ul className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden divide-y divide-lx-divider">
                {groep.lijst.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projecten/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-lx-panel-bg/50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-lx-cta" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-lx-text-primary truncate">{p.kop.naam}</p>
                        <p className="text-[11.5px] text-lx-text-secondary mt-0.5 truncate">
                          {p.regels.length} {p.regels.length === 1 ? 'regel' : 'regels'} · {p.regels.map((r) => r.titel).join(', ')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold text-lx-text-primary tabular-nums">{formatCents(p.totaal.totaalCents)}</p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5">
                          {p.totaal.opAanvraag > 0 ? `${p.totaal.opAanvraag} op aanvraag` : 'ex. BTW'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-lx-text-muted flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
