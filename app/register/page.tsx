'use client'

import { useState } from 'react'
import { UserPlus, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setMessage({ type: 'error', text: 'Nama dan nomor HP wajib diisi' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal mendaftarkan member' })
        return
      }

      setMessage({ type: 'success', text: `Berhasil! Member ${name} terdaftar. ID: ${data.member_id}` })
      setName('')
      setPhone('')
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-full p-4 sm:p-6" style={{ background: '#f8f7fc' }}>
      <div className="max-w-md mx-auto w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}>
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#10224f' }}>Daftarkan Member Baru</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7590' }}>
            Isi data di bawah untuk mendaftarkan pelanggan baru sebagai member Rome Bois
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(18px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.45)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium" style={{ color: '#10224f' }}>
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                required
                placeholder="Masukkan nama pelanggan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[48px] rounded-lg border bg-white/70 px-4 text-base outline-none transition-colors duration-150 focus:bg-white focus:ring-2"
                style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'color-mix(in srgb, #7c5ce8 20%, transparent)' } as React.CSSProperties}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium" style={{ color: '#10224f' }}>
                Nomor HP / WhatsApp
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-h-[48px] rounded-lg border bg-white/70 px-4 text-base outline-none transition-colors duration-150 focus:bg-white focus:ring-2"
                style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'color-mix(in srgb, #7c5ce8 20%, transparent)' } as React.CSSProperties}
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
                style={{
                  background: message.type === 'success' ? '#e4f5ee' : '#fdeaec',
                  color: message.type === 'success' ? '#0e7a57' : '#ef4444',
                }}
              >
                {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] mt-1 rounded-lg text-white font-semibold text-base transition-opacity disabled:opacity-50 hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}
            >
              {loading ? (
                <div className="mx-auto w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Daftarkan Member
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
