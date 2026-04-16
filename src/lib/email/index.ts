import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'LoooX Configurator <noreply@looox.nl>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://configurator.looox.nl'
const INTERNAL_EMAIL = 'marketing@rmsanitair.nl'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
}

const GLAS_LABELS: Record<string, string> = {
  helder: 'Helder',
  brons: 'Brons',
  grijs: 'Grijs',
  zwart: 'Zwart',
}

export function formatDimensions(
  shape: string,
  width: number | null,
  height: number | null,
  diameter: number | null,
  organicSizeKey: string | null,
) {
  if (shape === 'rond' && diameter) return `⌀${diameter} cm`
  if (shape === 'organic' && organicSizeKey) return organicSizeKey
  if (shape === 'op-aanvraag') return 'Op aanvraag'
  if (width && height) return `${width} × ${height} cm`
  return '—'
}

// ─── Templates ────────────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LoooX Configurator</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <img src="${SITE_URL}/logo-looox-grey.svg" alt="LoooX" height="96" style="height:96px;" />
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:#888;">
              LoooX Configurator · <a href="${SITE_URL}" style="color:#888;">configurator.looox.nl</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#3d6b54;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;margin-top:24px;">${label}</a>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;">${text}</h1>`
}

function p(text: string, muted = false) {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${muted ? '#666' : '#1a1a1a'};">${text}</p>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #ececec;margin:24px 0;" />`
}

function row(label: string, value: string, bold = false) {
  return `<tr>
    <td style="font-size:13px;color:#666;padding:6px 0;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="font-size:13px;font-weight:${bold ? '700' : '600'};text-align:right;">${value}</td>
  </tr>`
}

function orderTable(rows: string) {
  return `<table style="width:100%;border-collapse:collapse;border-top:1px solid #ececec;margin-top:20px;padding-top:20px;">${rows}</table>`
}

// ─── Order details builder ────────────────────────────────────────────────────

export type OrderEmailDetails = {
  orderNumber: string
  projectName: string
  shape: string
  width: number | null
  height: number | null
  diameter: number | null
  organicSizeKey: string | null
  glasKleur?: string | null
  directLight?: string | null
  indirectLight?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

function buildOrderRows(d: OrderEmailDetails) {
  const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
  const dimensions = formatDimensions(d.shape, d.width, d.height, d.diameter, d.organicSizeKey)
  const shapeLabel = SHAPE_LABELS[d.shape] ?? d.shape
  const glasLabel = d.glasKleur ? (GLAS_LABELS[d.glasKleur] ?? d.glasKleur) : null

  return [
    row('Ordernummer', d.orderNumber),
    row('Project', d.projectName || '—'),
    row('Vorm', shapeLabel),
    row('Afmeting', dimensions),
    glasLabel ? row('Glaskleur', glasLabel) : '',
    d.directLight ? row('Directe verlichting', d.directLight) : '',
    d.indirectLight ? row('Indirecte verlichting', d.indirectLight) : '',
    row('Aantal', `${d.quantity}×`),
    d.quantity > 1 ? row('Stukprijs', fmt(d.unitPrice)) : '',
    `<tr style="border-top:1px solid #ececec;">
      <td style="font-size:14px;font-weight:700;padding:10px 0 0;padding-right:16px;">Totaal</td>
      <td style="font-size:14px;font-weight:700;text-align:right;padding-top:10px;">${fmt(d.totalPrice)}</td>
    </tr>`,
  ].join('')
}

// ─── Email: Uitnodiging collega ───────────────────────────────────────────────

export async function sendInviteEmail({
  to,
  inviterName,
  companyName,
  token,
}: {
  to: string
  inviterName: string
  companyName: string
  token: string
}) {
  const link = `${SITE_URL}/registreer?invite=${token}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${inviterName} nodigt je uit voor LoooX Configurator`,
    html: baseTemplate(`
      ${h1('Je bent uitgenodigd!')}
      ${p(`<strong>${inviterName}</strong> heeft je uitgenodigd om deel te nemen aan het team van <strong>${companyName}</strong> in de LoooX Configurator.`)}
      ${p('Klik op de knop hieronder om je account aan te maken. De uitnodiging is 7 dagen geldig.', true)}
      ${btn(link, 'Uitnodiging accepteren')}
      ${divider()}
      ${p('Of kopieer deze link: <a href="' + link + '" style="color:#3d6b54;">' + link + '</a>', true)}
    `),
  })
}

// ─── Email: Welkomstmail ──────────────────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  name,
  isInvited = false,
}: {
  to: string
  name: string
  isInvited?: boolean
}) {
  const subject = isInvited
    ? 'Welkom bij LoooX Configurator'
    : 'Je accountaanvraag is ontvangen'

  const body = isInvited
    ? `
      ${h1(`Welkom, ${name}!`)}
      ${p('Je account is aangemaakt. Je kunt nu inloggen en aan de slag met de LoooX Configurator.')}
      ${btn(`${SITE_URL}/login`, 'Inloggen')}
    `
    : `
      ${h1(`Bedankt voor je aanvraag, ${name}!`)}
      ${p('We hebben je aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen.')}
      ${p('Zodra je account is goedgekeurd ontvang je een e-mail en kun je inloggen.', true)}
    `

  await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html: baseTemplate(body),
  })
}

// ─── Email: Wachtwoord reset ──────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string
  name: string
  resetLink: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Wachtwoord opnieuw instellen',
    html: baseTemplate(`
      ${h1('Wachtwoord opnieuw instellen')}
      ${p(`Hoi ${name}, we hebben een verzoek ontvangen om het wachtwoord van je account te resetten.`)}
      ${p('Klik op de knop hieronder om een nieuw wachtwoord in te stellen. Deze link is 1 uur geldig.', true)}
      ${btn(resetLink, 'Wachtwoord instellen')}
      ${divider()}
      ${p('Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.', true)}
    `),
  })
}

// ─── Email: Bestellingsbevestiging (klant) ───────────────────────────────────

export async function sendOrderConfirmationEmail({
  to,
  name,
  order,
  pdfBuffer,
}: {
  to: string
  name: string
  order: OrderEmailDetails
  pdfBuffer?: Buffer
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bestelling ontvangen — ${order.orderNumber}`,
    html: baseTemplate(`
      ${h1('Bestelling ontvangen!')}
      ${p(`Hoi ${name}, je bestelling is succesvol geplaatst. We gaan er zo snel mogelijk mee aan de slag.`)}
      ${orderTable(buildOrderRows(order))}
      ${btn(`${SITE_URL}/bestellingen`, 'Bestellingen bekijken')}
      ${divider()}
      ${p('In de bijlage vind je de volledige orderbevestiging als PDF.', true)}
    `),
    attachments: pdfBuffer ? [{
      filename: `LoooX-Order-${order.orderNumber}.pdf`,
      content: pdfBuffer,
    }] : undefined,
  })
}

// ─── Email: Interne ordernotificatie (marketing) ──────────────────────────────

export async function sendInternalOrderEmail({
  order,
  customer,
  pdfBuffer,
}: {
  order: OrderEmailDetails
  customer: {
    name: string | null
    company: string | null
    email: string
    phone: string | null
    address: string | null
  }
  pdfBuffer?: Buffer
}) {
  const customerRows = [
    customer.name ? row('Naam', customer.name) : '',
    customer.company ? row('Bedrijf', customer.company) : '',
    row('E-mail', `<a href="mailto:${customer.email}" style="color:#3d6b54;">${customer.email}</a>`),
    customer.phone ? row('Telefoon', customer.phone) : '',
    customer.address ? row('Adres', customer.address) : '',
  ].join('')

  const orderRows = buildOrderRows(order)

  await getResend().emails.send({
    from: FROM,
    to: INTERNAL_EMAIL,
    subject: `Nieuwe bestelling — ${order.orderNumber} (${customer.company ?? customer.name ?? customer.email})`,
    html: baseTemplate(`
      ${h1('Nieuwe bestelling!')}
      ${p('Hoi Collega, er is zojuist een spiegel besteld via de configurator. In de bijlage vind je de bestelling en hieronder een kort overzicht:')}
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Klantgegevens</p>
      ${orderTable(customerRows)}
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Bestelling</p>
      ${orderTable(orderRows)}
      ${divider()}
      ${p('Liefs, de configurator', true)}
    `),
    attachments: pdfBuffer ? [{
      filename: `LoooX-Order-${order.orderNumber}.pdf`,
      content: pdfBuffer,
    }] : undefined,
  })
}

// ─── Email: Account goedgekeurd ──────────────────────────────────────────────

export async function sendApprovalEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Je account is goedgekeurd — LoooX Configurator',
    html: baseTemplate(`
      ${h1(`Welkom, ${name}!`)}
      ${p('Goed nieuws: je account is goedgekeurd en je kunt nu inloggen in de LoooX Configurator.')}
      ${p('Configureer je eerste spiegel en sla hem op als offerte of plaats direct een bestelling.', true)}
      ${btn(`${SITE_URL}/login`, 'Inloggen')}
    `),
  })
}

// ─── Email: App update notificatie ───────────────────────────────────────────

export async function sendUpdateNotificationEmail({
  to,
  title,
  body,
}: {
  to: string
  title: string
  body?: string | null
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Nieuwe update: ${title}`,
    html: baseTemplate(`
      ${h1('Nieuwe update beschikbaar')}
      ${p(`<strong>${title}</strong>`)}
      ${body ? p(body, true) : ''}
      ${btn(`${SITE_URL}/dashboard`, 'Bekijk in configurator')}
    `),
  })
}
