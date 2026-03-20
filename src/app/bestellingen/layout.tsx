import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'

export default async function BestellingenLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, tier, is_admin, avatar_url')
    .eq('id', user.id)
    .single()

  const [
    { count: configCount },
    { count: orderCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    profile?.is_admin
      ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
      : Promise.resolve({ count: 0 }),
  ])

  return (
    <div className="min-h-screen bg-lx-divider">
      <Sidebar
        userName={profile?.full_name ?? user.email ?? 'Gebruiker'}
        company={profile?.company ?? ''}
        tier={profile?.tier ?? 'Studio'}
        configCount={configCount ?? 0}
        orderCount={orderCount ?? 0}
        isAdmin={profile?.is_admin ?? false}
        avatarUrl={profile?.avatar_url ?? null}
        pendingCount={pendingCount ?? 0}
      />
      <main className="lg:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
