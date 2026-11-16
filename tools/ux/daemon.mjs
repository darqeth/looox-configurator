// Eén browser per testpersoon. Neemt opdrachten aan via HTTP en geeft na elke stap een schermfoto terug.
import { chromium } from 'playwright';
import http from 'http';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { execFileSync } from 'child_process';
const [naam, poort, uit] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
const acc = JSON.parse(readFileSync('.tmp/ux/accounts.json', 'utf8'))[naam];
const mobiel = naam === 'debby';
const map = `${uit}/${naam}`; mkdirSync(map, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext(mobiel
  ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'nl-NL', acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
  : { viewport: { width: 1366, height: 768 }, locale: 'nl-NL', acceptDownloads: true });
let page = await context.newPage();
let stap = 0; const meldingen = []; const kiezers = [];
const log = (o) => appendFileSync(`${map}/log.jsonl`, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');

async function pdfNaarBeeld(buf, label) {
  const basis = `${map}/pdf-${String(++stap).padStart(3, '0')}`;
  writeFileSync(basis + '.pdf', buf);
  try { execFileSync('pdftoppm', ['-r', '70', '-png', basis + '.pdf', basis]); } catch {}
  const { readdirSync } = await import('fs');
  const paginas = readdirSync(map).filter((f) => f.startsWith(basis.split('/').pop() + '-') && f.endsWith('.png')).sort().map((f) => `${map}/${f}`);
  meldingen.push(`${label}. Het is een PDF van ${paginas.length} pagina('s). Bekijk de pagina's hier: ${paginas.join(' , ')}`);
}
function koppel(p) {
  p.on('console', (m) => { if (m.type() === 'error') log({ console: m.text().slice(0, 300) }) });
  p.on('pageerror', (e) => log({ pageerror: String(e).slice(0, 300) }));
  p.on('dialog', async (d) => { meldingen.push(`Er verscheen een browsermelding: "${d.message()}" (automatisch bevestigd met OK)`); await d.accept().catch(() => {}); });
  p.on('filechooser', (f) => { kiezers.push(f); meldingen.push('Er is een venster geopend om een bestand te kiezen. Gebruik de opdracht "bestand <pad>" om een bestand te kiezen.'); });
  p.on('download', async (d) => {
    const pad = `${map}/download-${d.suggestedFilename()}`; await d.saveAs(pad).catch(() => {});
    if (/\.pdf$/i.test(pad)) await pdfNaarBeeld(readFileSync(pad), `Er is een bestand gedownload: ${d.suggestedFilename()}`);
    else meldingen.push(`Er is een bestand gedownload: ${pad}`);
  });
}
koppel(page);
context.on('page', async (nieuw) => {
  koppel(nieuw);
  await nieuw.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  const url = nieuw.url();
  try {
    const r = await context.request.get(url);
    if ((r.headers()['content-type'] ?? '').includes('pdf')) {
      await pdfNaarBeeld(await r.body(), 'Er opende een nieuw tabblad met een document'); await nieuw.close().catch(() => {}); return;
    }
  } catch {}
  page = nieuw; meldingen.push('Er is een nieuw tabblad geopend; je kijkt nu naar dat tabblad. Met "tabblad-sluiten" ga je terug.');
});

async function foto() {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  const pad = `${map}/stap-${String(++stap).padStart(3, '0')}.png`;
  await page.screenshot({ path: pad, scale: 'css' }).catch(async () => { await page.waitForTimeout(1500); await page.screenshot({ path: pad, scale: 'css' }); });
  const s = await page.evaluate(() => ({ y: Math.round(scrollY), h: document.documentElement.scrollHeight, v: innerHeight, w: innerWidth })).catch(() => null);
  const uit = [`Scherm: ${pad}`, `Adresbalk: ${page.url()}`];
  if (s) uit.push(`Schermmaat ${s.w} x ${s.v} px. Je staat op ${s.y} px van boven; de pagina is ${s.h} px hoog${s.y + s.v < s.h - 5 ? ' (er staat nog meer onder dit beeld)' : ''}.`);
  while (meldingen.length) uit.push('LET OP: ' + meldingen.shift());
  return uit.join('\n');
}
// Scrollen op de plek van de muis of vinger, zodat ook een venster binnen de pagina meeschuift
async function veeg(x, y, dy) {
  if (mobiel) { const cdp = await context.newCDPSession(page); await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -dy, speed: 1600 }).catch(() => {}); await cdp.detach().catch(() => {}); }
  else { await page.mouse.move(x, y); await page.mouse.wheel(0, dy); }
}
const num = (x) => { const n = Number(x); if (!Number.isFinite(n)) throw new Error('Geef coördinaten als getallen, bijvoorbeeld: klik 640 300'); return n };
async function doe(cmd, a) {
  switch (cmd) {
    case 'open': await page.goto(/^https?:/.test(a[0]) ? a[0] : 'https://' + a[0], { waitUntil: 'domcontentloaded', timeout: 45000 }); break;
    case 'kijk': break;
    case 'klik': mobiel ? await page.touchscreen.tap(num(a[0]), num(a[1])) : await page.mouse.click(num(a[0]), num(a[1])); break;
    case 'dubbelklik': await page.mouse.dblclick(num(a[0]), num(a[1])); break;
    case 'beweeg': await page.mouse.move(num(a[0]), num(a[1])); break;
    case 'sleep': await page.mouse.move(num(a[0]), num(a[1])); await page.mouse.down(); await page.mouse.move(num(a[2]), num(a[3]), { steps: 12 }); await page.waitForTimeout(150); await page.mouse.up(); break;
    case 'typ': await page.keyboard.type(a.join(' '), { delay: 12 }); break;
    case 'typ-email': await page.keyboard.type(acc.email, { delay: 12 }); break;
    case 'typ-wachtwoord': await page.keyboard.type(acc.password, { delay: 12 }); break;
    case 'toets': await page.keyboard.press(a[0]); break;
    case 'scroll': { const vp = page.viewportSize(); await veeg(vp.width / 2, vp.height / 2, (a[0] === 'omhoog' ? -1 : 1) * (a[1] ? num(a[1]) : 500)); break; }
    case 'scroll-op': await veeg(num(a[0]), num(a[1]), (a[2] === 'omhoog' ? -1 : 1) * (a[3] ? num(a[3]) : 400)); break;
    case 'terug': await page.goBack({ timeout: 20000 }).catch(() => {}); break;
    case 'wacht': await page.waitForTimeout(Math.min(20, num(a[0] ?? 2)) * 1000); break;
    case 'bestand': { const k = kiezers.pop(); if (!k) throw new Error('Er staat geen venster open om een bestand te kiezen. Klik eerst op de knop om een bestand toe te voegen.'); await k.setFiles(a.join(' ')); break; }
    case 'tabblad-sluiten': { const alle = context.pages(); if (alle.length > 1) { await page.close(); page = context.pages().at(-1); } break; }
    default: throw new Error('Onbekende opdracht: ' + cmd);
  }
  return foto();
}
let bezig = Promise.resolve();
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => body += c);
  req.on('end', () => {
    bezig = bezig.then(async () => {
      let uit;
      try { const { cmd, args } = JSON.parse(body); log({ cmd, args: /wachtwoord/.test(cmd) ? [] : args }); uit = cmd === 'stop' ? 'gestopt' : await doe(cmd, args ?? []);
        if (cmd === 'stop') { res.end(uit); await browser.close(); process.exit(0); } }
      catch (e) { uit = 'Dat lukte niet: ' + String(e.message ?? e).split('\n')[0] + '\n' + await foto().catch(() => ''); }
      log({ url: page.url(), stap }); res.end(uit);
    });
  });
}).listen(poort, '127.0.0.1', () => console.log(naam, 'luistert op', poort));
