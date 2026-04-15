import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'LoooX Configurator <noreply@rmsanitair.com>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://configurator.looox.nl'

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
              <img src="${SITE_URL}/logo-looox-grey.svg" alt="LoooX" height="48" style="height:48px;" />
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

  await resend.emails.send({
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

  await resend.emails.send({
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
  await resend.emails.send({
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

// ─── Email: Bestellingsbevestiging ───────────────────────────────────────────

export async function sendOrderConfirmationEmail({
  to,
  name,
  orderNumber,
  projectName,
  quantity,
  totalPrice,
}: {
  to: string
  name: string
  orderNumber: string
  projectName: string
  quantity: number
  totalPrice: number
}) {
  const formatted = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totalPrice)

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bestelling ontvangen — ${orderNumber}`,
    html: baseTemplate(`
      ${h1('Bestelling ontvangen!')}
      ${p(`Hoi ${name}, je bestelling is succesvol geplaatst. We gaan er zo snel mogelijk mee aan de slag.`)}
      <table style="width:100%;border-top:1px solid #ececec;margin-top:20px;padding-top:20px;">
        <tr><td style="font-size:13px;color:#666;padding:6px 0;">Ordernummer</td><td style="font-size:13px;font-weight:600;text-align:right;">${orderNumber}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding:6px 0;">Project</td><td style="font-size:13px;font-weight:600;text-align:right;">${projectName}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding:6px 0;">Aantal</td><td style="font-size:13px;font-weight:600;text-align:right;">${quantity}×</td></tr>
        <tr style="border-top:1px solid #ececec;"><td style="font-size:14px;font-weight:700;padding:10px 0 0;">Totaal</td><td style="font-size:14px;font-weight:700;text-align:right;padding-top:10px;">${formatted}</td></tr>
      </table>
      ${btn(`${SITE_URL}/bestellingen`, 'Bestellingen bekijken')}
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
  await resend.emails.send({
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
