import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MilestoneForm from './milestone-form'
import MilestoneList from './milestone-list'
import DiscountCodeForm from './discount-code-form'
import DiscountCodeList, { type Code as DiscountCode } from './discount-code-list'

export default async function AdminMilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { tab } = await searchParams
  const activeTab = tab === 'kortingen' ? 'kortingen' : 'milestones'

  const [{ data: milestones }, { data: rawDiscountCodes }, { data: codeUses }] = await Promise.all([
    supabase.from('milestones').select('*').order('sort_order').order('created_at'),
    supabase
      .from('discount_codes')
      .select('id, code, type, value, use_type, user_id, used_at, expires_at, created_at, profiles(company, full_name)')
      .is('milestone_id', null)
      .order('created_at', { ascending: false }),
    supabase.from('discount_code_uses').select('code_id'),
  ])

  // Bereken use_count per code
  const useCountMap: Record<string, number> = {}
  for (const u of codeUses ?? []) {
    useCountMap[u.code_id] = (useCountMap[u.code_id] ?? 0) + 1
  }
  const discountCodes: DiscountCode[] = (rawDiscountCodes ?? []).map(c => ({
    ...c,
    value: Number(c.value),
    profiles: Array.isArray(c.profiles) ? (c.profiles[0] ?? null) : c.profiles,
    use_count: useCountMap[c.id] ?? 0,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-3xl">
      <h1 className="text-[20px] font-bold text-lx-text-primary mb-1">Milestones &amp; Korting</h1>
      <p className="text-[13px] text-lx-text-secondary mb-6">
        Beheer achievements en kortingscodes voor dealers.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {[
          { key: 'milestones', label: 'Mijlpalen' },
          { key: 'kortingen', label: 'Kortingscodes' },
        ].map((t) => (
          <a
            key={t.key}
            href={t.key === 'milestones' ? '/admin/milestones' : '/admin/milestones?tab=kortingen'}
            className={`px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-lx-text-primary text-white'
                : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {activeTab === 'milestones' ? (
        <>
          <MilestoneForm />
          <MilestoneList milestones={milestones ?? []} />
        </>
      ) : (
        <>
          <DiscountCodeForm />
          <DiscountCodeList codes={discountCodes} />
        </>
      )}
    </div>
  )
}
