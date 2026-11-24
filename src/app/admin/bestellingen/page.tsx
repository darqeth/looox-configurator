import { redirect } from 'next/navigation'

// Bestellingen staan nu samen met de offertes onder Configuraties. Deze route
// blijft bestaan voor oude links (bladwijzers, knoppen in mails).
export default function AdminBestellingenPage() {
  redirect('/admin/configuraties?status=besteld')
}
