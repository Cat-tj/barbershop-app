'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Scissors,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Calendar,
  Package,
  UserCheck,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Menu,
  X
} from 'lucide-react'

interface SidebarProps {
  userRole?: string
  username?: string
}

export default function Sidebar({ userRole = 'admin', username = 'Kasir' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { name: 'Kasir (POS)', href: '/', icon: ShoppingBag },
    { name: 'Antrian', href: '/queue', icon: Users },
    { name: 'Dashboard Omset', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pelanggan & Member', href: '/members', icon: UserCheck },
    { name: 'Pembelian Stok', href: '/purchases', icon: Package },
    { name: 'Jadwal & Kalender', href: '/calendar', icon: Calendar },
  ]

  if (userRole === 'admin') {
    navItems.push({ name: 'Kelola User', href: '/admin', icon: ShieldAlert })
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 w-64 text-zinc-300 select-none">
      {/* Header Branding */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black text-xl shadow-lg shadow-amber-500/20">
            R
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-sm text-zinc-100 flex items-center gap-1.5">
              ROMEBOIS
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ERP
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Powered by Altora
            </p>
          </div>
        </div>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          Menu Operasional
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/5'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-300'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
            </Link>
          )
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-xs">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold text-zinc-200 truncate">{username}</span>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-amber-400/80">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Top Navbar Header for Mobile */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black text-sm">
              R
            </div>
            <span className="font-extrabold tracking-wider text-xs text-zinc-100">ROMEBOIS ERP</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden md:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>
    </>
  )
}
