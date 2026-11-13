import type { ConfigOptions } from '@/lib/pdf/helpers'
import { clampMmsQuantity, isMmsAllowed, resolveMmsUnitPrice } from '@/lib/mms'
import { computeOrderTotals } from '@/lib/order-pricing'
import { calcMeubelNettoCents } from '@/lib/meubel-config'
import { leesMeubel, tekeningMelding, meubelPrijsInput } from '@/lib/meubel-opslag'
import { projectRegel, type ProjectConfigRij, type ProjectRegel } from '@/lib/project'

// Wat een projectregel kost bij bestellen. Eén functie voor de bestelmodal
// (voorvertoning) en voor de server (placeProjectOrder), zodat de dealer exact
// het bedrag ziet dat besteld wordt. Per regel gelden dezelfde regels als bij een
// losse bestelling; een kortingscode bestaat op projectniveau niet.

export interface ProjectOrderRegel {
  configId: string
  regel: ProjectRegel
  quantity: number
  /** Zoals in orders.unit_price: bruto bij maatwerk spiegels, netto bij projectspiegels en meubels */
  unitPrice: number
  /** Netto regeltotaal in euro: wat de dealer voor deze regel betaalt */
  totalPrice: number
  /** Dealerkorting die op deze regel is toegepast (0 bij netto geprijsde regels) */
  korting: number
  /** Staffelkorting als fractie, alleen bij maatwerk spiegels */
  staffelPct: number
  /** Niet meer te bestellen, met de reden (meubel dat niet meer in de prijslijst staat) */
  fout: string | null
}

export function berekenProjectOrderRegel(config: ProjectConfigRij, dealerKortingPct: number): ProjectOrderRegel {
  const opts = (config.selected_options ?? {}) as unknown as ConfigOptions
  const regel = projectRegel(config)
  const basis = { configId: config.id, regel, staffelPct: 0, fout: null as string | null }

  // Het hulpje vult in, de dealer beslist: eerst nalopen en opslaan, dan pas bestellen
  if (regel.nalopen) {
    return { ...basis, quantity: regel.quantity, korting: 0, unitPrice: 0, totalPrice: 0, fout: `${regel.titel} is door het hulpje ingevuld en nog niet nagelopen. Open de regel, controleer de keuzes en sla hem op.` }
  }

  const meubel = leesMeubel(opts)
  if (meubel) {
    // Solid Surface: de waskom moet een plaats hebben (getekend of op een eigen maattekening).
    // Hout: alleen bij een eigen tekening met uitsparingen; zonder gaten bestellen mag.
    if (meubel.tekeningOntbreekt) {
      return { ...basis, quantity: meubel.quantity, korting: 0, unitPrice: 0, totalPrice: 0, fout: tekeningMelding(meubel) }
    }
    const nettoCents = meubel.opAanvraag ? 0 : calcMeubelNettoCents(meubelPrijsInput(meubel))
    if (nettoCents === null) {
      return { ...basis, quantity: meubel.quantity, korting: 0, unitPrice: 0, totalPrice: 0, fout: `${meubel.model.naam} staat niet meer in de prijslijst. Open de regel en sla hem opnieuw op.` }
    }
    return { ...basis, quantity: meubel.quantity, korting: 0, unitPrice: nettoCents / 100, totalPrice: (nettoCents * meubel.quantity) / 100 }
  }

  const shape = opts.shape as string | undefined
  const aantal = Math.max(1, Math.floor(Number(opts.quantity) || 1))
  if (shape === 'op-aanvraag') {
    return { ...basis, quantity: aantal, korting: dealerKortingPct, unitPrice: 0, totalPrice: 0 }
  }

  const isProjectspiegel = shape === 'projectspiegel'
  const opgeslagen = Number(config.total_price)
  // Projectspiegel: total_price is het netto totaal; maatwerk: bruto per stuk
  const unitPrice = isProjectspiegel ? Math.round((opgeslagen / aantal) * 100) / 100 : opgeslagen
  const totals = computeOrderTotals({
    brutoUnitPrice: unitPrice,
    dealerKortingPct,
    quantity: aantal,
    isProjectspiegel,
    discount: null,
    mmsQuantity: isProjectspiegel || !isMmsAllowed(shape) ? 0 : clampMmsQuantity(opts.mmsQuantity),
    mmsUnitPrice: resolveMmsUnitPrice(opts.mmsUnitPrice),
  })
  return {
    ...basis, quantity: aantal, korting: isProjectspiegel ? 0 : dealerKortingPct,
    unitPrice, totalPrice: totals.total, staffelPct: totals.staffelPct,
  }
}

/** Netto totaal van het project in centen, over de regels met een prijs. */
export function projectOrderTotaalCents(regels: ProjectOrderRegel[]): number {
  return regels.reduce((som, r) => som + Math.round(r.totalPrice * 100), 0)
}
