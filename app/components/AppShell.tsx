'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface UserSession {
  id: number
  username: string
  role: 'admin' | 'user'
}

function parseJwtPayload(token: string): UserSession | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && Date.now() >= payload.exp * 1000) return null
    return payload as UserSession
  } catch {
    return null
  }
}

function getSessionFromCookie(): UserSession | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)session=([^;]*)/)
  if (!match) return null
  return parseJwtPayload(decodeURIComponent(match[1]))
}

const PUBLIC_PATHS = ['/booking', '/login', '/catalog']
const ADMIN_PATHS = ['/dashboard', '/store', '/purchases', '/admin', '/calendar']

const MAIN_TABS = [
  { href: '/', label: 'POS', icon: '\u{1F488}' },
  { href: '/booking', label: 'Booking', icon: '\u{1F4C5}' },
  { href: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}', adminOnly: true },
  { href: '/more', label: 'More', icon: '\u{2699}\u{FE0F}', isMore: true },
]

const MORE_ITEMS = [
  { href: '/store', label: 'Store', icon: '\u{1F3EA}' },
  { href: '/purchases', label: 'Purchases', icon: '\u{1F4E6}' },
  { href: '/admin', label: 'Admin', icon: '\u{1F6E0}\u{FE0F}' },
  { href: '/calendar', label: 'Calendar', icon: '\u{1F4C6}' },
  { href: '/catalog', label: 'Catalog', icon: '\u{1F4CB}' },
  { href: '/queue', label: 'Queue', icon: '\u{1F465}' },
  { href: '/members', label: 'Members', icon: '\u{1F465}' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSession(getSessionFromCookie())
  }, [])

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isLoginPage = pathname === '/login'

  // Redirect if not authenticated and not on public page
  useEffect(() => {
    if (!mounted) return
    if (isLoginPage) return
    const s = getSessionFromCookie()
    if (!s && !isPublic) {
      router.replace('/login')
    }
  }, [mounted, pathname, isPublic, isLoginPage, router])

  const doLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    document.cookie = 'session=; path=/; max-age=0'
    setSession(null)
    router.replace('/login')
  }, [router])

  // Show nothing during auth check on protected pages
  if (!mounted) return null

  // Login page: no shell
  if (isLoginPage) {
    return <>{children}</>
  }

  // Not authenticated on protected page
  if (!session && !isPublic) {
    return null
  }

  const isAdmin = session?.role === 'admin'
  const activeTab = MAIN_TABS.find(t => {
    if (t.isMore) return moreOpen
    if (t.href === '/') return pathname === '/'
    return pathname.startsWith(t.href + '/') || pathname === t.href
  })

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-800">
        <h1 className="text-base font-bold tracking-widest text-amber-500">ROMEBOIS</h1>
        <div className="flex items-center gap-3">
          {session && (
            <span className="text-xs text-zinc-400">
              {session.username}
              <span className="text-[10px] text-zinc-600 ml-1">({session.role})</span>
            </span>
          )}
          {session && (
            <button
              onClick={doLogout}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-zinc-900 border-t border-zinc-800 flex items-stretch z-50">
        {MAIN_TABS.map(tab => {
          if (tab.adminOnly && !isAdmin) return null
          if (tab.isMore) {
            const isActive = moreOpen
            return (
              <button
                key={tab.href}
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-amber-500' : 'text-zinc-500'
                }`}
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                <span className="text-[10px] leading-none">{tab.label}</span>
              </button>
            )
          }
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <button
              key={tab.href}
              onClick={() => {
                setMoreOpen(false)
                router.push(tab.href)
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-amber-500' : 'text-zinc-500'
              }`}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span className="text-[10px] leading-none">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More bottom sheet */}
      <div
        className={`fixed bottom-14 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-xl z-50 transition-transform duration-300 ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 px-2">More</p>
          {MORE_ITEMS.map(item => {
            if (ADMIN_PATHS.includes(item.href) && !isAdmin) return null
            return (
              <button
                key={item.href}
                onClick={() => {
                  setMoreOpen(false)
                  router.push(item.href)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
          {session && (
            <button
              onClick={() => { setMoreOpen(false); doLogout() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors mt-2"
            >
              <span className="text-sm">{'\u{1F6AA}'}</span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
