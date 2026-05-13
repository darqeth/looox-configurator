import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', 'mark@rmsanitair.nl');
await page.fill('input[type="password"]', 'RMS4n1t41r!@');
await Promise.all([
  page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
console.log('Klaar, start client-side navigatie test\n');

async function clientNav(label, href, h1Text) {
  const t = Date.now();
  await page.locator(`a[href="${href}"]`).first().click();
  await page.waitForFunction(
    (text) => document.querySelector('h1')?.textContent?.trim().includes(text),
    h1Text,
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8000 }).catch(() => {});
  const ms = Date.now() - t;
  console.log(`${label}: ${ms}ms`);
}

await clientNav('Configuraties (1e)', '/configuraties', 'Configuraties');
await page.waitForTimeout(300);
await clientNav('Bestellingen  (1e)', '/bestellingen', 'Bestellingen');
await page.waitForTimeout(300);
await clientNav('Dashboard     (1e)', '/dashboard', 'Goedemiddag');
await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);

console.log('--- cache actief ---');
await clientNav('Configuraties (2e)', '/configuraties', 'Configuraties');
await page.waitForTimeout(100);
await clientNav('Bestellingen  (2e)', '/bestellingen', 'Bestellingen');
await page.waitForTimeout(100);
await clientNav('Configuraties (3e)', '/configuraties', 'Configuraties');
await page.waitForTimeout(100);
await clientNav('Dashboard     (2e)', '/dashboard', 'Goedemiddag');
await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 15000 }).catch(() => {});

await browser.close();
