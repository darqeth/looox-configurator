import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import React from 'react'
import OfferteDocument from './offerte-document'
import MeubelDocument from './meubel-document'
import type { ConfigOptions } from './helpers'
import { prepareAttachmentForPdf } from './prepare-attachment'
import { haalPdfBijlage, voegPdfBijlageToe } from './samenvoegen'
import { leesMeubel } from '@/lib/meubel-opslag'
import { isAdminOrSubAdmin } from '@/lib/company-utils'

// Eén plek die de klantofferte van een configuratie maakt: gebruikt door de
// losse offerte-download en door de projectofferte (één PDF per regel, samengevoegd).

export type OfferteConfig = {
  id: string
  name: string | null
  article_number: string | null
  width: number | null
  height: number | null
  total_price: number | string
  selected_options: unknown
  created_at: string
}

export type OfferteDealer = {
  name: string | null
  company: string | null
  email: string
  phone: string | null
  address: string | null
  shippingAddress: string | null
}

export async function getOfferteDealer(supabase: SupabaseClient, userId: string, email: string): Promise<OfferteDealer> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, phone, address, shipping_address')
    .eq('id', userId)
    .single()
  return {
    name: profile?.full_name ?? null,
    company: profile?.company ?? null,
    email,
    phone: profile?.phone ?? null,
    address: profile?.address ?? null,
    shippingAddress: (profile as { shipping_address?: string | null } | null)?.shipping_address ?? null,
  }
}

/**
 * Wie staat er als afzender op de offerte? Normaal degene die downloadt. Downloadt LoooX
 * (admin) de offerte van een dealer, dan horen de gegevens van die dealer erop, niet die van LoooX.
 */
export async function offerteDealerVoor(supabase: SupabaseClient, user: { id: string; email?: string | null }, eigenaarId: string | null | undefined): Promise<OfferteDealer> {
  if (eigenaarId && eigenaarId !== user.id && await isAdminOrSubAdmin(supabase, user.id)) {
    const { data: eigenaar } = await supabase.from('profiles').select('email').eq('id', eigenaarId).maybeSingle()
    return getOfferteDealer(supabase, eigenaarId, eigenaar?.email ?? '')
  }
  return getOfferteDealer(supabase, user.id, user.email ?? '')
}

export async function renderOfferteBuffer(supabase: SupabaseClient, config: OfferteConfig, dealer: OfferteDealer): Promise<Buffer> {
  // Meubel (configurator 2.0): eigen document met de brutoprijs van de offerte
  const meubel = leesMeubel(config.selected_options)
  if (meubel) {
    return voegPdfBijlageToe(await renderToBuffer(React.createElement(MeubelDocument, {
      variant: 'offerte',
      projectName: config.name,
      date: config.created_at,
      articleNumber: config.article_number,
      dealer: { name: dealer.name, company: dealer.company, email: dealer.email, phone: dealer.phone, address: dealer.address },
      meubel,
      unitPrice: Number(config.total_price),
      quantity: meubel.quantity,
      attachmentUrl: await prepareAttachmentForPdf(meubel.attachmentUrl),
    }) as React.ReactElement<DocumentProps>), await haalPdfBijlage(meubel.attachmentUrl))
  }

  // Aangevinkt sfeerbeeld voor deze configuratie (besluit V3, exclusief)
  const { data: viz } = await supabase
    .from('visualisations')
    .select('image_path')
    .eq('configuration_id', config.id)
    .eq('in_pdf', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const visualisationUrl = viz?.image_path
    ? supabase.storage.from('visualisations').getPublicUrl(viz.image_path).data.publicUrl
    : null

  const opts = (config.selected_options ?? {}) as ConfigOptions
  const quantity = (opts.quantity as number | undefined) ?? 1
  const totalPrice = Number(config.total_price)
  // Projectspiegels: total_price is al het totaal voor alle stuks; stuksprijs terugrekenen
  const isProjectspiegel = (opts.shape as string | undefined) === 'projectspiegel'
  const unitPrice = isProjectspiegel && quantity > 1
    ? Math.round((totalPrice / quantity) * 100) / 100
    : totalPrice
  const attachmentUrl = await prepareAttachmentForPdf(opts.attachmentUrl as string | null)

  return voegPdfBijlageToe(await renderToBuffer(React.createElement(OfferteDocument, {
    configName: config.name,
    configDate: config.created_at,
    articleNumber: config.article_number,
    dealer,
    config: { width: config.width, height: config.height, options: opts },
    unitPrice,
    quantity,
    attachmentUrl,
    visualisationUrl,
  }) as React.ReactElement<DocumentProps>), await haalPdfBijlage(opts.attachmentUrl as string | null))
}

export function pdfResponseHeaders(filename: string, lengte: number): Record<string, string> {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Content-Length': lengte.toString(),
  }
}
