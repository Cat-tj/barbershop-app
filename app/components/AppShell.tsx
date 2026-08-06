'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'

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

const PUBLIC_PATHS = ['/booking', '/login', '/catalog', '/register', '/forms']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setSession(getSessionFromCookie())
  }, [mounted, pathname])

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isLoginPage = pathname === '/login'
  const isFormsPage = pathname === '/forms'

  useEffect(() => {
    if (!mounted) return
    if (isLoginPage || isFormsPage) return
    const s = getSessionFromCookie()
    if (!s && !isPublic) {
      router.replace('/login')
    }
  }, [mounted, pathname, isPublic, isLoginPage, isFormsPage, router])

  if (!mounted) return null

  if (isLoginPage || isFormsPage) {
    return <>{children}</>
  }

  if (!session && !isPublic) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Altora ERP Sidebar */}
      <Sidebar userRole={session?.role} username={session?.username} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 bg-gradient-to-b from-zinc-950 to-zinc-900/60">
          <div className="w-full h-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
