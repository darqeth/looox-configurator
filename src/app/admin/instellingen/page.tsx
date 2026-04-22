import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import NotificatieEmailsForm from './notificatie-emails-form'

export default async function InstellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

  const { data: settings } = await supabase
    .from('app_settings')
    .select('notification_emails')
    .eq('id', 'singleton')
    .single()

  const emails: string[] = settings?.notification_emails ?? ['marketing@rmsanitair.nl']

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-2xl">
      <h1 className="text-[20px] font-bold text-lx-text-primary mb-1">Instellingen</h1>
      <p className="text-[13px] text-lx-text-secondary mb-6">Beheer notificaties en systeeminstellingen.</p>

      <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-lx-divider">
          <p className="text-[14px] font-semibold text-lx-text-primary">Notificatie e-mailadressen</p>
          <p className="text-[12px] text-lx-text-secondary mt-0.5">
            Alle systeem­notificaties (nieuwe aanmeldingen, bestellingen, akkoord tekeningen) worden naar deze adressen verstuurd.
          </p>
        </div>
        <div className="p-5">
          <NotificatieEmailsForm initialEmails={emails} />
        </div>
      </div>
    </div>
  )
}
