/**
 * Leesbare foutmelding voor de gebruiker. Een fout uit een server action komt in productie
 * aan als een Engelse standaardtekst zonder inhoud; die tonen we niet, dan geldt de terugval.
 */
export function foutTekst(e: unknown, terugval: string): string {
  if (!(e instanceof Error) || !e.message) return terugval
  if (/Server Components render|digest property/i.test(e.message)) return terugval
  return e.message
}
