'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Lock, User, Eye, EyeOff, Scissors } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setError('Username atau password salah. Silakan coba lagi.')
        setLoading(false)
        return
      }

      const data = await res.json()

      const isSecure = location.protocol === 'https:'
      document.cookie = `session=${data.token}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`

      router.push('/')
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  function fillDemoAccount(user: string, pass: string) {
    setUsername(user)
    setPassword(pass)
  }

  return (
    <div
      className="flex min-h-screen flex-1 md:grid md:grid-cols-2"
      style={{
        '--color-primary': '#7c5ce8',
        '--color-primary-dark': '#6344c0',
      } as React.CSSProperties}
    >
      {/* Form side */}
      <div
        className="flex flex-1 items-center justify-center px-4 py-10"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(16,34,79,.2) 0%, rgba(124,92,232,.16) 45%, rgba(14,122,87,.2) 100%), radial-gradient(1000px 620px at 8% -5%, rgba(16,34,79,.38) 0%, transparent 60%), radial-gradient(900px 560px at 100% 0%, rgba(14,122,87,.38) 0%, transparent 55%), radial-gradient(800px 700px at 50% 120%, rgba(124,92,232,.32) 0%, transparent 60%)',
        }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-6 shadow-xl sm:p-8"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(18px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.45)',
          }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            {/* Rome Bois Logo Mark */}
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
              }}
            >
              <span className="text-5xl font-black text-white tracking-tighter">RB</span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1e293b' }}>
                Rome Bois Barbershop
              </h1>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Kelola kasir, antrian, dan jadwal barbershop-mu.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm text-center"
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium" style={{ color: '#1e293b' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-[48px] rounded-lg border bg-white/70 px-4 text-base outline-none transition-colors duration-150 focus:bg-white focus:ring-2"
                style={{
                  borderColor: '#e2e6ec',
                  color: '#1e293b',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: '#1e293b' }}>
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[48px] w-full rounded-lg border bg-white/70 px-4 pr-10 text-base outline-none transition-colors duration-150 focus:bg-white focus:ring-2"
                  style={{
                    borderColor: '#e2e6ec',
                    color: '#1e293b',
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? 'Sembunyikan' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] mt-1 rounded-lg text-white font-semibold text-base transition-opacity disabled:opacity-50 hover:opacity-90 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
              }}
            >
              {loading ? (
                <div className="mx-auto w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Masuk
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: '#e2e6ec' }}>
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: '#64748b' }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
              Akun Cepat (Click to fill):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => fillDemoAccount('admin', 'admin123')}
                className="px-3 py-2 rounded-lg border transition-all hover:shadow-sm text-left"
                style={{ borderColor: '#e2e6ec', background: 'rgba(255,255,255,0.7)' }}
              >
                <span className="block text-xs font-semibold" style={{ color: '#1e293b' }}>Anang (Admin)</span>
                <span className="block text-[10px]" style={{ color: '#94a3b8' }}>anang@gmail.com</span>
              </button>
              <button
                onClick={() => fillDemoAccount('kasir', 'admin123')}
                className="px-3 py-2 rounded-lg border transition-all hover:shadow-sm text-left"
                style={{ borderColor: '#e2e6ec', background: 'rgba(255,255,255,0.7)' }}
              >
                <span className="block text-xs font-semibold" style={{ color: '#1e293b' }}>Kasir (User)</span>
                <span className="block text-[10px]" style={{ color: '#94a3b8' }}>kasir</span>
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px]" style={{ color: '#94a3b8' }}>
            &copy; {new Date().getFullYear()} Rome Bois Barbershop &middot; Altora ERP Platform
          </p>
        </div>
      </div>

      {/* Visual side — desktop only */}
      <div className="relative hidden md:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(124,92,232,.10) 0%, rgba(124,92,232,.32) 100%), linear-gradient(135deg, #6344c0 0%, #7c5ce8 50%, #0e7a57 100%)',
          }}
        />
        <p
          className="absolute bottom-8 right-8 max-w-xs text-right text-lg italic text-white"
          style={{ textShadow: '0 2px 14px rgba(0,0,0,.5)' }}
        >
          &ldquo;Bisnis secantik ini, pantas dikelola sepintar itu.&rdquo;
        </p>
      </div>
    </div>
  )
}
