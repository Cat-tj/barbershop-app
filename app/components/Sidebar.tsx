'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Scissors, LayoutDashboard, ShoppingBag, Users, Calendar,
  Package, UserCheck, LogOut, ChevronRight, ShieldAlert,
  Sparkles, Menu, X, DollarSign, Settings
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
    { name: 'Gaji Capster', href: '/payroll', icon: DollarSign },
    { name: 'Jadwal & Kalender', href: '/calendar', icon: Calendar },
  ]

  if (userRole === 'capster') {
    navItems.push({ name: 'Portal Capster Saya', href: '/capster', icon: Scissors })
  }

  if (userRole === 'admin') {
    navItems.push({ name: 'Hak Akses & Permission', href: '/admin/access-control', icon: ShieldAlert })
    navItems.push({ name: 'Pengaturan', href: '/admin', icon: Settings })
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

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/82 backdrop-blur-xl border-r w-64 text-[#10224f] select-none p-3 my-2 ml-2 rounded-3xl shadow-sm" style={{ borderColor: '#e9e6f2' }}>
      {/* Header Branding */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e9e6f2' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0" style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)', boxShadow: '0 4px 12px rgba(124,92,232,.25)' }}>
            RB
          </div>
          <div className="min-w-0">
            <h1 className="font-black tracking-wider text-xs flex items-center gap-1.5 truncate" style={{ color: '#10224f' }}>
              ROME BOIS
            </h1>
            <p className="text-[10px] flex items-center gap-1 font-medium truncate" style={{ color: '#6b7590' }}>
              <Sparkles className="w-2.5 h-2.5 shrink-0" style={{ color: '#7c5ce8' }} /> Technology by Altora
            </p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg shrink-0"
          style={{ color: '#6b7590' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-1 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider" style={{ color: '#8792a8' }}>
          Menu Operasional
        </div>

        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group border"
              style={active ? {
                background: 'rgba(124,92,232,.12)',
                color: '#7c5ce8',
                borderColor: 'rgba(124,92,232,.3)',
              } : {
                color: '#6b7590',
                borderColor: 'transparent',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" style={active ? { color: '#7c5ce8' } : { color: '#6b7590' }} />
                <span className="truncate">{item.name}</span>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#7c5ce8' }} />}
            </Link>
          )
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-2 border-t rounded-2xl" style={{ borderColor: '#e9e6f2', background: 'rgba(255,255,255,.6)' }}>
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border mb-2" style={{ borderColor: '#e9e6f2' }}>
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(124,92,232,.12)', color: '#7c5ce8' }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="truncate min-w-0">
              <span className="block text-xs font-bold truncate" style={{ color: '#10224f' }}>{username}</span>
              <span className="block text-[10px] uppercase font-bold tracking-wider" style={{ color: '#7c5ce8' }}>
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}
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
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ background: '#f8f7fc', borderColor: '#e9e6f2' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-white border"
            style={{ borderColor: '#e9e6f2', color: '#7c5ce8' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm text-white" style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}>
              RB
            </div>
            <span className="font-extrabold tracking-wider text-xs" style={{ color: '#10224f' }}>ROME BOIS</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
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
