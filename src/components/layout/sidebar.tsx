'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'

interface SidebarProps {
  userName: string
  company: string
  tier: string
  orderCount: number
  configCount: number
  isAdmin: boolean
  pendingCount?: number
  avatarUrl?: string | null
}

export default function Sidebar({ userName, company, tier, orderCount, configCount, isAdmin, pendingCount = 0, avatarUrl }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const firstLetter = userName?.charAt(0)?.toUpperCase() ?? 'U'

  const tierProgress = tier === 'Studio' ? 30 : tier === 'Signature' ? 65 : 100
const tierLabel = tier === 'Studio'
    ? `${orderCount}/10 orders → Signature`
    : tier === 'Signature'
    ? `${orderCount}/25 orders → Atelier`
    : 'Hoogste tier bereikt'

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/></svg>,
    },
    {
      href: '/configuraties',
      label: 'Configuraties',
      badge: configCount > 0 ? String(configCount) : null,
      badgeStyle: 'default',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
    },
    {
      href: '/bestellingen',
      label: 'Bestellingen',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    },
    {
      href: '/looox-circle',
      label: 'LoooX Circle',
      badge: tier,
      badgeStyle: 'tier',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
    {
      href: '/account',
      label: 'Mijn account',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ]

  const adminItems = [
    {
      href: '/admin/gebruikers',
      label: 'Gebruikers',
      badge: pendingCount > 0 ? String(pendingCount) : null,
      badgeStyle: 'pending',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      href: '/admin/configuraties',
      label: 'Klantconfiguraties',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18"/><path d="M8 15h4"/></svg>,
    },
    {
      href: '/admin/producten',
      label: 'Producten & prijzen',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    },
    {
      href: '/admin/meldingen',
      label: 'Meldingen',
      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    },
  ]

  function NavItem({ item }: { item: typeof navItems[0] }) {
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/12 text-white'
            : 'text-white/55 hover:bg-white/9 hover:text-white/95'
        }`}
      >
        <span className={isActive ? 'opacity-100' : 'opacity-75'}>{item.icon}</span>
        {item.label}
        {item.badge && (
          <span className={`ml-auto text-[10px] font-semibold px-1.5 py-px rounded-full ${
            item.badgeStyle === 'tier'
              ? 'bg-[#5DA87A]/20 text-[#6EBD8E]'
              : item.badgeStyle === 'pending'
              ? 'bg-amber-400/90 text-white'
              : 'bg-white/13 text-white/75'
          }`}>
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-lx-sidebar-bg">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/8 text-center">
        <img src="/logo-looox-grey.svg" alt="LoooX" className="h-14 brightness-0 invert opacity-90 mx-auto" />
        <p className="text-white/30 text-[10.5px] mt-1.5 tracking-wide">Configurator Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-0.5">
        <p className="text-white/45 text-[9.5px] font-semibold tracking-widest uppercase px-3 pb-2">Menu</p>
        {navItems.map((item) => <NavItem key={item.href} item={item} />)}

        {isAdmin && (
          <div className="mt-4">
            <p className="text-white/45 text-[9.5px] font-semibold tracking-widest uppercase px-3 pb-2 pt-1">Beheer</p>
            {adminItems.map((item) => <NavItem key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      {/* LoooX Circle widget */}
      <div className="px-3 pb-3">
        <div className="bg-white/7 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/45 text-[9px] font-bold tracking-widest uppercase">LoooX Circle</span>
            <span className="bg-[#5DA87A]/22 text-[#6EBD8E] text-[9.5px] font-bold px-2 py-px rounded-full">{tier}</span>
          </div>
          <div className="bg-white/10 rounded-full h-1 overflow-hidden mb-1.5">
            <div className="bg-[#5FA87A] h-full rounded-full transition-all" style={{ width: `${tierProgress}%` }} />
          </div>
          <p className="text-white/32 text-[9.5px] m-0">
            {tierLabel}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <Link
          href="/configurator/nieuw"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 bg-lx-cta hover:bg-lx-cta-hover text-white rounded-xl py-2.5 text-[13.5px] font-semibold transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Nieuwe spiegel
        </Link>
      </div>

      {/* User */}
      <div className="border-t border-white/8 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#5DA87A]/25 flex items-center justify-center text-[#6EBD8E] text-sm font-semibold">{firstLetter}</div>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-medium truncate">{userName}</p>
            <p className="text-white/38 text-[11px] truncate">{company}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Uitloggen"
              className="text-white/35 hover:text-white/90 hover:bg-white/10 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 min-h-screen fixed top-0 left-0 bottom-0 z-40 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-white border-b border-black/7">
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu openen"
          className="text-lx-text-primary p-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <img src="/logo-looox-grey.svg" alt="LoooX" className="h-14" />
        <div className="w-8" />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/45 z-39 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-40 w-[min(320px,100vw)] transition-transform duration-240 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
