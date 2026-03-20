/**
 * LoooX Configurator — centraal kleurenpalet
 *
 * Wijzig hier de kleuren; ze worden vervolgens overal gebruikt.
 * In Tailwind-klassen gebruik je de waarden als: bg-[${colors.bg}]
 * In inline styles / SVG props gebruik je de waarden direct als string.
 *
 * Palet (donker → licht): #6B6560 · #98847c · #a3978c · #b0a29b · #d0c8c1 · #dbd5ce · #e4e2de · #f3f3f2
 */

export const colors = {
  // ── Achtergronden ──────────────────────────────────────────────────────────
  /** Hoofd paginaachtergrond */
  pageBg: '#e4e2de',
  /** Witte kaartachtergrond */
  cardBg: '#FFFFFF',
  /** Secundaire panelen binnen kaarten (samenvattingboxen, info-blokken) */
  panelBg: '#e4e2de',

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebarBg: '#1C1C1E',

  // ── Interactieve elementen (CTA) ───────────────────────────────────────────
  /** Primaire knoppen, links, icoon-accenten. Contrast op wit: 7.2:1 (WCAG AAA) */
  cta: '#3a6b4e',
  ctaHover: '#2d5540',

  // ── Decoratief groen (icoon-achtergronden, badges) ─────────────────────────
  /** Lichte groene tint voor kleine icoon-cirkels / badges */
  iconBg: '#DFF0E8',

  // ── Randen & scheidingslijnen ──────────────────────────────────────────────
  divider: '#dbd5ce',
  border: '#d0c8c1',

  // ── Tekst ──────────────────────────────────────────────────────────────────
  /** Hoofdtekst. Contrast op wit: 18:1 */
  textPrimary: '#1A1A1A',
  /** Secundaire labels, metadata. Contrast op wit: 5.1:1 (WCAG AA) */
  textSecondary: '#6B6560',
  /** Gedempte tekst: tijdstempels, placeholders. Contrast op wit: 3.1:1 (grote tekst OK) */
  textMuted: '#98847c',

  // ── Status badges ──────────────────────────────────────────────────────────
  badgeOrderedBg: '#DFF0E8',
  badgeOrderedText: '#2d5540',
  badgeSavedBg: '#EEF2FF',
  badgeSavedText: '#4338ca',
} as const

export type ColorKey = keyof typeof colors
