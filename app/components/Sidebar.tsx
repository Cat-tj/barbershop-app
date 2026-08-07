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
  X,
  DollarSign
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
    <div className="flex flex-col h-full bg-[#f8f7fc] border-r border-[#e9e6f2] w-64 text-[#10224f] select-none p-3 my-2 ml-2 rounded-3xl shadow-sm">
      {/* Header Branding */}
      <div className="p-4 border-b border-[#e9e6f2] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#7c5ce8] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#7c5ce8]/20">
            RB
          </div>
          <div>
            <h1 className="font-black tracking-wider text-xs text-[#10224f] flex items-center gap-1.5">
              ROME BOIS
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#7c5ce8]/15 text-[#7c5ce8] border border-[#7c5ce8]/30">
                BARBERSHOP
              </span>
            </h1>
            <p className="text-[10px] text-[#6b7590] flex items-center gap-1 font-medium">
              <Sparkles className="w-2.5 h-2.5 text-[#7c5ce8]" /> Technology by Altora
            </p>
          </div>
        </div>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-[#6b7590] hover:text-[#10224f] rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-1 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-[#8792a8]">
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group ${
                isActive
                  ? 'bg-[#7c5ce8]/15 text-[#7c5ce8] border border-[#7c5ce8]/30 shadow-sm'
                  : 'text-[#6b7590] hover:text-[#10224f] hover:bg-white/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#7c5ce8]' : 'text-[#6b7590] group-hover:text-[#10224f]'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#7c5ce8]" />}
            </Link>
          )
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-2 border-t border-[#e9e6f2] bg-white/60 rounded-2xl">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e9e6f2] mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#7c5ce8]/15 text-[#7c5ce8] font-extrabold flex items-center justify-center text-xs">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold text-[#10224f] truncate">{username}</span>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-[#7c5ce8]">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded-xl bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
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
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#f8f7fc] border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-purple-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: 'linear-gradient(135deg, var(--color-primary-dark, #6344c0), var(--color-primary, #7c5ce8))', color: 'white' }}>
              RB
            </div>
            <span className="font-extrabold tracking-wider text-xs" style={{ color: '#1e293b' }}>ROMEBOIS ERP</span>
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
