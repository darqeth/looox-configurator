import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Download, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hasMeubelAccess } from '@/lib/meubel-access'
import { isUuid, projectKop, projectRegel, projectTotaal } from '@/lib/project'
import { formatCents } from '@/lib/meubel-config'
import ProjectNaam from './project-naam'
import RegelActies from './regel-acties'
import ProjectBestellen from './project-bestellen'
import { berekenProjectOrderRegel, projectOrderTotaalCents } from '@/lib/project-order'

export const metadata = { title: 'Project | LoooX Configurator' }

// Het project is het winkelmandje: alle regels samen worden één offerte en één bestelling.
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  // RLS bepaalt welke regels de aanroeper mag zien (eigen, of als manager die van collega's)
  const [{ data: configs }, meubelToegang, { data: profiel }, { data: lid }] = await Promise.all([
    supabase
      .from('configurations')
      .select('id, name, article_number, total_price, status, width, height, selected_options, project_id')
      .eq('project_id', id)
      .in('status', ['saved', 'ordered'])
      .order('created_at'),
    hasMeubelAccess(supabase, userId),
    supabase.from('profiles').select('korting').eq('id', userId).single(),
    supabase.from('company_members').select('can_order').eq('user_id', userId).maybeSingle(),
  ])
  if (!configs || configs.length === 0) notFound()

  const kop = projectKop(configs)
  const regels = configs.map(projectRegel)
  const totaal = projectTotaal(regels)
  const besteld = regels.some((r) => r.besteld)
  const heeftNetto = regels.some((r) => r.netto)
  const heeftBruto = regels.some((r) => !r.netto && !r.opAanvraag)

  // Voorvertoning van de bestelling: zelfde berekening als placeProjectOrder op de server
  const orderRegels = configs.map((c) => berekenProjectOrderRegel(c, profiel?.korting ?? 50))
  // can_order is leidend; geen member-rij = mag bestellen
  const magBestellen = lid ? (lid.can_order ?? true) : true
  const heeftMeubel = regels.some((r) => r.soort === 'meubel')
  const blokkade = orderRegels.find((r) => r.fout)?.fout
    ?? (heeftMeubel && !meubelToegang ? 'Dit account heeft geen toegang tot Tailor-Made.' : null)

  // Besteld project: het gezamenlijke ordernummer erbij
  const { data: orders } = besteld
    ? await supabase.from('orders').select('order_number, order_group').in('configuration_id', configs.map((c) => c.id)).limit(1)
    : { data: null }
  const orderNummer = orders?.[0]?.order_group ?? orders?.[0]?.order_number ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-4xl">
      <Link href="/projecten" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-lx-text-secondary hover:text-lx-text-primary transition-colors mb-4">
        <ArrowLeft size={14} /> Projecten
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Project</p>
          <ProjectNaam projectId={id} naam={kop.naam} referentie={kop.referentie} bewerkbaar={!besteld} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/pdf/project/${id}`}
            download
            className="inline-flex items-center gap-1.5 border border-black/10 bg-white hover:bg-lx-panel-bg text-lx-text-primary text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Download size={15} /> Offerte
          </a>
          {!besteld && (
            <Link
              href={`/configurator/nieuw?project=${id}`}
              className="inline-flex items-center gap-1.5 border border-black/10 bg-white hover:bg-lx-panel-bg text-lx-text-primary text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={15} /> Product toevoegen
            </Link>
          )}
          {!besteld && magBestellen && (
            <ProjectBestellen
              projectId={id}
              naam={kop.naam}
              totaalCents={projectOrderTotaalCents(orderRegels)}
              fout={blokkade}
              regels={orderRegels.map((r) => ({
                id: r.configId, titel: r.regel.titel, omschrijving: r.regel.omschrijving,
                quantity: r.quantity, totaalCents: Math.round(r.totalPrice * 100), opAanvraag: r.regel.opAanvraag,
              }))}
            />
          )}
        </div>
      </div>

      {besteld && (
        <p className="text-[12.5px] text-lx-text-secondary bg-white rounded-xl border border-black/6 px-4 py-3 mb-4">
          Dit project is besteld{orderNummer ? ` onder ${orderNummer}` : ''} en kan niet meer worden aangepast.
        </p>
      )}

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <ul className="divide-y divide-lx-divider">
          {regels.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/icons/shapes/${r.soort === 'meubel' ? 'meubel' : r.soort === 'projectspiegel' ? 'projectspiegel' : 'rechthoek'}.svg`} width="15" height="15" alt="" />
              </div>
              <div className="flex-1 min-w-[180px]">
                <p className="text-[13px] font-semibold text-lx-text-primary">{r.titel}</p>
                <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{r.omschrijving}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-bold text-lx-text-primary tabular-nums">
                  {r.opAanvraag ? 'Op aanvraag' : formatCents(r.totaalCents)}
                </p>
                <p className="text-[11px] text-lx-text-secondary mt-0.5 tabular-nums">
                  {r.quantity}×{!r.opAanvraag && r.quantity > 1 ? ` ${formatCents(r.stukCents)}` : ''}{r.opAanvraag ? '' : r.netto ? ' · netto' : ' · bruto'}
                </p>
              </div>
              {!besteld && <RegelActies configId={r.id} titel={r.titel} laatste={regels.length === 1} />}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-lx-panel-bg border-t border-lx-divider">
          <div>
            <p className="text-[12.5px] font-medium text-lx-text-secondary">
              Totaal ex. BTW · {regels.length} {regels.length === 1 ? 'regel' : 'regels'}, {totaal.stuks} {totaal.stuks === 1 ? 'stuk' : 'stuks'}
            </p>
            {(totaal.opAanvraag > 0 || (heeftNetto && heeftBruto)) && (
              <p className="text-[11.5px] text-lx-text-muted mt-0.5">
                {totaal.opAanvraag > 0 && `${totaal.opAanvraag} ${totaal.opAanvraag === 1 ? 'regel is' : 'regels zijn'} op aanvraag en ${totaal.opAanvraag === 1 ? 'telt' : 'tellen'} niet mee. `}
                {heeftNetto && heeftBruto && 'Projectspiegels staan er netto in, de rest bruto.'}
              </p>
            )}
          </div>
          <p className="text-[20px] font-bold text-lx-cta tabular-nums flex-shrink-0">{formatCents(totaal.totaalCents)}</p>
        </div>
      </div>

      {!besteld && (
        <p className="text-[12px] text-lx-text-muted mt-4 leading-relaxed">
          De bedragen hierboven staan zoals op de offerte. Bij bestellen zie je het netto totaal.
        </p>
      )}
    </div>
  )
}
