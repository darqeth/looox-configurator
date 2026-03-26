import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import OrderDocument from './order-document'
import type { ConfigOptions } from './helpers'

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
  }
  config: {
    name: string | null
    width: number | null
    height: number | null
    options: ConfigOptions
  }
  unitPrice: number
  totalPrice: number
  quantity: number
  notes: string | null
  attachmentUrl: string | null
}

export async function renderOrderPDF(input: OrderRenderInput): Promise<Buffer> {
  return renderToBuffer(
    React.createElement(OrderDocument, input) as React.ReactElement<DocumentProps>
  )
}
