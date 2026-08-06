'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ShieldCheck, ArrowRight, Lock, User, Eye, EyeOff } from 'lucide-react'

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
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      const data = await res.json()

      const isSecure = location.protocol === 'https:'
      document.cookie = `session=${data.token}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax${isSecure ? '; Secure' : ''}`

      router.push('/')
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  function fillDemoAccount(user: string, pass: string) {
    setUsername(user)
    setPassword(pass)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Background Altora Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-2xl mb-4 shadow-lg shadow-amber-500/20">
            R
          </div>
          <h1 className="text-xl font-black tracking-wider text-zinc-100 flex items-center gap-2">
            ROMEBOIS
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              ERP
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Powered by Altora Enterprise System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Username / Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full h-10 pl-9 pr-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                placeholder="anang@gmail.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-10 pl-9 pr-10 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk Ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80">
          <p className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Akun Cepat (Click to fill):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillDemoAccount('anang@gmail.com', 'romebois123icat')}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/40 text-left transition-all group"
            >
              <span className="block text-[11px] font-bold text-zinc-200 group-hover:text-amber-400">Anang (Admin)</span>
              <span className="block text-[9px] text-zinc-500 truncate">anang@gmail.com</span>
            </button>
            <button
              onClick={() => fillDemoAccount('kasir', 'romebois123icat')}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/40 text-left transition-all group"
            >
              <span className="block text-[11px] font-bold text-zinc-200 group-hover:text-amber-400">Kasir (User)</span>
              <span className="block text-[9px] text-zinc-500 truncate">kasir</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          &copy; {new Date().getFullYear()} ROMEBOIS Barbershop &middot; Altora ERP Platform
        </p>
      </div>
    </div>
  )
}
