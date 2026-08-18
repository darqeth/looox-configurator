import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import OrderDocument from './order-document'
import type { ConfigOptions } from './helpers'
import { prepareAttachmentForPdf } from './prepare-attachment'

export type OrderRenderInput = {
  orderNumber: string
  orderDate: string
  articleNumber: string | null | undefined
  status: string
  dealer: {
    name: string | null
    company: string | null
    email: string
    phone: string | null
    address: string | null
    shippingAddress?: string | null
  }
  config: {
    name: string | null
    width: number | null
    height: number | null
    options: ConfigOptions
  }
  unitPrice: number
  korting: number
  quantity: number
  notes: string | null
  attachmentUrl: string | null
}

export async function renderOrderPDF(input: OrderRenderInput): Promise<Buffer> {
  const staffelKortingPct = typeof (input.config.options as Record<string, unknown>)?.staffelKortingPct === 'number'
    ? (input.config.options as Record<string, unknown>).staffelKortingPct as number
    : undefined
  // Bijlage normaliseren zodat react-pdf 'm kan insluiten (iPhone-JPEG-fix)
  const attachmentUrl = await prepareAttachmentForPdf(input.attachmentUrl)
  return renderToBuffer(
    React.createElement(OrderDocument, { ...input, attachmentUrl, staffelKortingPct }) as React.ReactElement<DocumentProps>
  )
}
