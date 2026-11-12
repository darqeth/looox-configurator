import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import ProjectVoorblad from './project-voorblad'
import { renderOrderPDF } from './render-order'
import { voegPdfsSamen } from './samenvoegen'
import type { ConfigOptions } from './helpers'
import { projectRegel, type ProjectConfigRij, type ProjectRegel } from '@/lib/project'

// Eén PDF voor een projectorder: voorblad met de netto regels en het totaal,
// daarna de orderbevestiging per regel. Gebruikt voor de mailbijlage bij het
// bestellen en voor de download achteraf.

export type ProjectOrderPdfRegel = {
  config: ProjectConfigRij & { article_number?: string | null }
  /** Ordernummer van deze regel (ORD-…-1) */
  orderNumber: string
  quantity: number
  /** Zoals in orders.unit_price */
  unitPrice: number
  /** Netto regeltotaal */
  totalPrice: number
  /** Dealerkorting voor het spiegeldocument; 0 bij netto geprijsde regels */
  korting: number
  status: string
}

export async function renderProjectOrderPdf(input: {
  groep: string
  datum: string
  projectNaam: string
  referentie: string
  notes: string | null
  dealer: { name: string | null; company: string | null; email: string; phone: string | null; address: string | null; shippingAddress?: string | null }
  regels: ProjectOrderPdfRegel[]
}): Promise<Buffer> {
  const nettoRegels: ProjectRegel[] = input.regels.map((r) => ({
    ...projectRegel(r.config),
    quantity: r.quantity,
    netto: true,
    totaalCents: Math.round(r.totalPrice * 100),
    stukCents: Math.round((r.totalPrice / r.quantity) * 100),
  }))

  const voorblad = await renderToBuffer(React.createElement(ProjectVoorblad, {
    variant: 'order',
    projectNaam: input.projectNaam,
    referentie: input.referentie,
    orderNummer: input.groep,
    datum: input.datum,
    dealer: input.dealer,
    regels: nettoRegels,
  }) as React.ReactElement<DocumentProps>)

  // Na elkaar: react-pdf en sharp gebruiken veel geheugen per document
  const perRegel: Buffer[] = []
  for (const r of input.regels) {
    const opts = (r.config.selected_options ?? {}) as unknown as ConfigOptions
    perRegel.push(await renderOrderPDF({
      orderNumber: r.orderNumber,
      orderDate: input.datum,
      articleNumber: r.config.article_number,
      status: r.status,
      dealer: input.dealer,
      config: { name: r.config.name, width: r.config.width, height: r.config.height, options: opts },
      unitPrice: r.unitPrice,
      korting: r.korting,
      quantity: r.quantity,
      notes: input.notes,
      attachmentUrl: (opts.attachmentUrl as string | null) ?? null,
    }))
  }
  return voegPdfsSamen([voorblad, ...perRegel])
}
