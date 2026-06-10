import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'LoooX Configurator <noreply@looox.nl>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://configurator.looox.nl'

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
  if (width && height) return `B ${width} × H ${height} cm`
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
              <img src="${SITE_URL}/logo-looox-grey.png" alt="LoooX" width="250" height="202" style="width:250px;height:202px;" />
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

// Escape voor alle door gebruikers aangeleverde strings die in HTML-templates
// belanden (namen, bedrijven, projectnamen, redenen) — voorkomt HTML-injectie
// in mails naar LoooX-medewerkers en klanten (audit S4).
function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
  /** Prijsopbouw — zelfde semantiek als computeOrderTotals (netto-gebaseerd) */
  dealerKortingPct?: number
  nettoUnitPrice?: number
  staffelPct?: number
  discountAmount?: number
}

function buildOrderRows(d: OrderEmailDetails) {
  const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
  const dimensions = formatDimensions(d.shape, d.width, d.height, d.diameter, d.organicSizeKey)
  const shapeLabel = SHAPE_LABELS[d.shape] ?? d.shape
  const glasLabel = d.glasKleur ? (GLAS_LABELS[d.glasKleur] ?? d.glasKleur) : null

  return [
    row('Ordernummer', d.orderNumber),
    row('Project', esc(d.projectName) || '—'),
    row('Vorm', shapeLabel),
    row('Afmeting', dimensions),
    glasLabel ? row('Glaskleur', glasLabel) : '',
    d.directLight ? row('Directe verlichting', d.directLight) : '',
    d.indirectLight ? row('Indirecte verlichting', d.indirectLight) : '',
    row('Aantal', `${d.quantity}×`),
    d.shape === 'op-aanvraag'
      ? `<tr style="border-top:1px solid #ececec;">
          <td style="font-size:14px;font-weight:700;padding:10px 0 0;padding-right:16px;">Prijs</td>
          <td style="font-size:14px;font-weight:700;text-align:right;padding-top:10px;">Op offerte</td>
        </tr>`
      : [
          // Prijsopbouw: bruto → dealerkorting → staffel → kortingscode → netto
          // totaal — identiek aan de bestelmodal en de PDF
          d.dealerKortingPct ? row('Catalogusprijs p/st', fmt(d.unitPrice)) : '',
          d.dealerKortingPct ? row('Dealerkorting', `−${d.dealerKortingPct}%`) : '',
          d.staffelPct ? row('Staffelkorting', `−${Math.round(d.staffelPct * 100)}%`) : '',
          d.nettoUnitPrice != null && d.quantity > 1 ? row('Netto p/st', fmt(d.nettoUnitPrice)) : '',
          d.nettoUnitPrice == null && d.quantity > 1 ? row('Stukprijs', fmt(d.unitPrice)) : '',
          d.discountAmount ? row('Kortingscode', `−${fmt(d.discountAmount)}`) : '',
          `<tr style="border-top:1px solid #ececec;">
            <td style="font-size:14px;font-weight:700;padding:10px 0 0;padding-right:16px;">Totaal</td>
            <td style="font-size:14px;font-weight:700;text-align:right;padding-top:10px;">${fmt(d.totalPrice)}</td>
          </tr>`,
        ].join(''),
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
  const link = `${SITE_URL}/invite/${token}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${inviterName} nodigt je uit voor LoooX Configurator`,
    html: baseTemplate(`
      ${h1('Je bent uitgenodigd!')}
      ${p(`<strong>${esc(inviterName)}</strong> heeft je uitgenodigd om deel te nemen aan het team van <strong>${esc(companyName)}</strong> in de LoooX Configurator.`)}
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
      ${h1(`Welkom, ${esc(name)}!`)}
      ${p('Je account is aangemaakt. Je kunt nu inloggen en aan de slag met de LoooX Configurator.')}
      ${btn(`${SITE_URL}/login`, 'Inloggen')}
    `
    : `
      ${h1(`Bedankt voor je aanvraag, ${esc(name)}!`)}
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
      ${p(`Hoi ${esc(name)}, we hebben een verzoek ontvangen om het wachtwoord van je account te resetten.`)}
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
      ${p(`Hoi ${esc(name)}, je bestelling is succesvol geplaatst. We gaan er zo snel mogelijk mee aan de slag.`)}
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
  to,
  order,
  customer,
  pdfBuffer,
}: {
  to: string[]
  order: OrderEmailDetails
  customer: {
    name: string | null
    company: string | null
    email: string
    phone: string | null
    address: string | null
    shippingAddress?: string | null
  }
  pdfBuffer?: Buffer
}) {
  const customerRows = [
    customer.name ? row('Naam', esc(customer.name)) : '',
    customer.company ? row('Bedrijf', esc(customer.company)) : '',
    row('E-mail', `<a href="mailto:${esc(customer.email)}" style="color:#3d6b54;">${esc(customer.email)}</a>`),
    customer.phone ? row('Telefoon', esc(customer.phone)) : '',
    customer.address ? row('Adres', esc(customer.address)) : '',
    customer.shippingAddress ? row('Afleveradres', esc(customer.shippingAddress)) : '',
  ].join('')

  const orderRows = buildOrderRows(order)

  await getResend().emails.send({
    from: FROM,
    to,
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
      ${h1(`Welkom, ${esc(name)}!`)}
      ${p('Goed nieuws: je account is goedgekeurd en je kunt nu inloggen in de LoooX Configurator.')}
      ${p('Configureer je eerste spiegel en sla hem op als offerte of plaats direct een bestelling.', true)}
      ${btn(`${SITE_URL}/login`, 'Inloggen')}
    `),
  })
}

// ─── Email: Nieuwe aanmelding (intern) ───────────────────────────────────────

export async function sendNewRegistrationEmail({
  to,
  name,
  email,
  company,
  phone,
}: {
  to: string[]
  name: string
  email: string
  company: string
  phone: string
}) {
  const customerRows = [
    row('Naam', name),
    row('Bedrijf', company || '—'),
    row('E-mail', `<a href="mailto:${email}" style="color:#3d6b54;">${email}</a>`),
    row('Telefoon', phone || '—'),
  ].join('')

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Nieuwe aanmelding — ${name} (${company || email})`,
    html: baseTemplate(`
      ${h1('Nieuwe aanmelding!')}
      ${p('Er heeft zich zojuist iemand aangemeld voor de LoooX Configurator. Hieronder de gegevens:')}
      ${divider()}
      ${orderTable(customerRows)}
      ${divider()}
      ${btn(`${SITE_URL}/admin/gebruikers`, 'Bekijk in admin')}
      ${p('Vergeet niet het account goed te keuren.', true)}
    `),
  })
}

// ─── Email: Bestelling statuswijziging ───────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<string, { label: string; message: string; color: string }> = {
  confirmed:        { label: 'Bevestigd',        message: 'Goed nieuws! Je bestelling is ontvangen en bevestigd door LoooX.', color: '#15803D' },
  goedgekeurd:      { label: 'Goedgekeurd',       message: 'Bedankt voor je goedkeuring! LoooX neemt je bestelling nu in productie.', color: '#15803D' },
  in_production:    { label: 'In productie',      message: 'Je bestelling is in productie genomen. We houden je op de hoogte.', color: '#1D4ED8' },
  shipped:          { label: 'Verzonden',         message: 'Je bestelling is verzonden en onderweg naar jou toe!', color: '#6D28D9' },
  delivered:        { label: 'Geleverd',          message: 'Je bestelling is afgeleverd. Bedankt voor je vertrouwen in LoooX!', color: '#3d6b54' },
  cancelled:        { label: 'Geannuleerd',       message: 'Je bestelling is helaas geannuleerd. Neem contact op met LoooX voor meer informatie.', color: '#DC2626' },
}

export async function sendOrderStatusEmail({
  to,
  name,
  orderNumber,
  status,
}: {
  to: string
  name: string
  orderNumber: string
  status: string
}) {
  const cfg = ORDER_STATUS_CONFIG[status]
  if (!cfg) return

  const statusBadge = `<span style="display:inline-block;background:${cfg.color}1a;color:${cfg.color};border:1px solid ${cfg.color}40;padding:4px 12px;border-radius:8px;font-size:13px;font-weight:600;">${cfg.label}</span>`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bestelling ${orderNumber} — ${cfg.label}`,
    html: baseTemplate(`
      ${h1(`Status bijgewerkt`)}
      ${p(`Hoi ${esc(name)}, de status van je bestelling is bijgewerkt.`)}
      <p style="margin:16px 0 4px;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Nieuwe status</p>
      <p style="margin:0 0 4px;">${statusBadge}</p>
      ${divider()}
      ${orderTable([row('Ordernummer', orderNumber), row('Status', cfg.label)].join(''))}
      ${p(cfg.message, true)}
      ${btn(`${SITE_URL}/bestellingen`, 'Bestellingen bekijken')}
    `),
  })
}

// ─── Email: Controle vereist (klant) ─────────────────────────────────────────

export async function sendControleVereistEmail({
  to,
  name,
  orderNumber,
  drawings,
}: {
  to: string
  name: string
  orderNumber: string
  drawings: { file_url: string; file_name: string }[]
}) {
  const drawingLinks = drawings.map(d =>
    `<tr><td style="padding:6px 0;"><a href="${d.file_url}" style="color:#3d6b54;font-size:13px;font-weight:600;text-decoration:none;">📄 ${d.file_name}</a></td></tr>`
  ).join('')

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bestelling ${orderNumber} — Tekeningen ter goedkeuring`,
    html: baseTemplate(`
      ${h1('Tekeningen ter goedkeuring')}
      ${p(`Hoi ${esc(name)}, LoooX heeft technische tekeningen klaarstaan voor je bestelling <strong>${orderNumber}</strong>.`)}
      ${p('Bekijk de tekeningen zorgvuldig en geef je goedkeuring of geef aan wat er gewijzigd moet worden.')}
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Tekeningen</p>
      <table style="width:100%;">${drawingLinks}</table>
      ${divider()}
      ${btn(`${SITE_URL}/bestellingen`, 'Tekeningen goedkeuren / afkeuren')}
      ${p('Log in op de configurator om je goedkeuring te geven of wijzigingen door te geven.', true)}
    `),
  })
}

// ─── Email: Tekeningen afgekeurd (intern LoooX) ───────────────────────────────

export async function sendAfgekeurdEmail({
  to,
  orderNumber,
  dealerName,
  dealerEmail,
  reden,
}: {
  to: string[]
  orderNumber: string
  dealerName: string
  dealerEmail: string
  reden: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Tekeningen afgekeurd — Bestelling ${orderNumber}`,
    html: baseTemplate(`
      ${h1('Tekeningen afgekeurd')}
      ${p(`Dealer <strong>${dealerName}</strong> (${dealerEmail}) heeft de tekeningen bij bestelling <strong>${orderNumber}</strong> afgekeurd.`)}
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reden van afkeuring</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#1a1a1a;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:12px 16px;">${esc(reden)}</p>
      ${divider()}
      ${btn(`${SITE_URL}/admin/bestellingen`, 'Bekijk in admin')}
    `),
  })
}

// ─── Email: Tekeningen goedgekeurd (intern LoooX) ────────────────────────────

export async function sendAkkoordInternEmail({
  to,
  orderNumber,
  dealerName,
  dealerEmail,
}: {
  to: string[]
  orderNumber: string
  dealerName: string
  dealerEmail: string
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Tekeningen goedgekeurd — Bestelling ${orderNumber}`,
    html: baseTemplate(`
      ${h1('Bestelling goedgekeurd!')}
      ${p(`Dealer <strong>${dealerName}</strong> (${dealerEmail}) heeft de tekeningen bij bestelling <strong>${orderNumber}</strong> goedgekeurd. De bestelling kan nu in productie worden genomen.`)}
      ${divider()}
      ${btn(`${SITE_URL}/admin/bestellingen`, 'Bekijk in admin')}
    `),
  })
}

// ─── Email: Support verzoek (intern) ────────────────────────────────────────

const SUPPORT_TYPE_LABELS: Record<string, string> = {
  probleem: 'Probleem',
  vraag: 'Algemene vraag',
  technisch: 'Technische vraag',
  feature: 'Feature request',
}

const SUPPORT_TYPE_COLORS: Record<string, string> = {
  probleem: '#DC2626',
  vraag: '#2563EB',
  technisch: '#D97706',
  feature: '#7C3AED',
}

export async function sendSupportEmail({
  to,
  replyTo,
  senderName,
  senderEmail,
  senderCompany,
  type,
  urgent,
  subject,
  description,
  configLabel,
  screenshotBase64,
  screenshotName,
}: {
  to: string[]
  replyTo: string
  senderName: string
  senderEmail: string
  senderCompany: string
  type: string
  urgent: boolean
  subject: string
  description: string
  configLabel?: string
  screenshotBase64?: string
  screenshotName?: string
}) {
  const typeLabel = SUPPORT_TYPE_LABELS[type] ?? type
  const color = SUPPORT_TYPE_COLORS[type] ?? '#666'
  const typeBadge = `<span style="display:inline-block;background:${color}1a;color:${color};border:1px solid ${color}40;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;">${typeLabel}</span>`
  const urgentBadge = urgent
    ? `<span style="display:inline-block;background:#DC26261a;color:#DC2626;border:1px solid #DC262640;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-left:6px;">Urgent</span>`
    : ''

  const senderRows = [
    row('Naam', esc(senderName)),
    senderCompany ? row('Bedrijf', esc(senderCompany)) : '',
    row('E-mail', `<a href="mailto:${esc(senderEmail)}" style="color:#3d6b54;">${esc(senderEmail)}</a>`),
  ].join('')

  const descriptionBlock = `<div style="margin:0;font-size:14px;line-height:1.7;color:#1a1a1a;background:#f8f8f6;border:1px solid #e8e8e4;border-radius:10px;padding:14px 16px;white-space:pre-wrap;">${description.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`

  const attachments: { filename: string; content: string }[] = []
  if (screenshotBase64 && screenshotName) {
    attachments.push({ filename: screenshotName, content: screenshotBase64 })
  }

  await getResend().emails.send({
    from: FROM,
    to,
    replyTo,
    subject: `[${typeLabel}${urgent ? ' — Urgent' : ''}] ${subject} — ${senderName} (${senderCompany || senderEmail})`,
    html: baseTemplate(`
      ${h1('Support verzoek')}
      <p style="margin:0 0 16px;">${typeBadge}${urgentBadge}</p>
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1a1a1a;">${subject.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Van</p>
      ${orderTable(senderRows)}
      ${divider()}
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Beschrijving</p>
      ${descriptionBlock}
      ${configLabel ? `${divider()}<p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Gekoppelde configuratie</p>${orderTable(row('Configuratie', configLabel))}` : ''}
      ${screenshotBase64 ? `${divider()}${p('Screenshot is bijgevoegd als bijlage.', true)}` : ''}
      ${divider()}
      ${p('Beantwoord deze e-mail direct om te reageren naar de afzender.', true)}
    `),
    attachments: attachments.length > 0 ? attachments : undefined,
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
