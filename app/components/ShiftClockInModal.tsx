'use client'

import React, { useState, useEffect } from 'react'
import { Store, DollarSign, Users, Clock, CheckCircle2, Loader2 } from 'lucide-react'

interface Capster {
  id: number
  name: string
  phone: string | null
}

interface ShiftClockInModalProps {
  isOpen: boolean
  username: string
  onClockInSuccess: () => void
}

export default function ShiftClockInModal({ isOpen, username, onClockInSuccess }: ShiftClockInModalProps) {
  const [openingCash, setOpeningCash] = useState<string>('200000')
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [selectedCapsters, setSelectedCapsters] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch('/api/admin/capsters')
      .then((res) => res.json())
      .then((data) => {
        if (data.capsters) {
          setCapsters(data.capsters)
          setSelectedCapsters(data.capsters.map((c: Capster) => c.id))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen])

  const toggleCapster = (id: number) => {
    if (selectedCapsters.includes(id)) {
      if (selectedCapsters.length > 1) {
        setSelectedCapsters(selectedCapsters.filter((c) => c !== id))
      }
    } else {
      setSelectedCapsters([...selectedCapsters, id])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_username: username,
          opening_cash: Number(openingCash) || 0,
          capster_ids: selectedCapsters,
        }),
      })

      if (!res.ok) throw new Error('Gagal membuka shift kasir.')
      onClockInSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka shift toko.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-100 flex items-center gap-2">
              OPEN STORE / SHIFT KASIR
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DAILY CLOCK-IN
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Kasir: <strong className="text-amber-400 font-mono">{username}</strong></p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Input Uang Laci Awal */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" /> 1. Input Nominal Uang Modal Laci Awal (Rp)
            </label>
            <input
              type="number"
              required
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="200000"
              className="w-full h-11 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500/60"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Uang pecahan kembalian awal di laci meja kasir pagi ini.</p>
          </div>

          {/* Step 2: Pilih Capster Shift Hari Ini */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" /> 2. Pilih Barber / Capster Bertugas Shift Hari Ini
            </label>
            {loading ? (
              <div className="p-4 text-center text-xs text-zinc-500">Memuat daftar barber...</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {capsters.map((c) => {
                  const isSelected = selectedCapsters.includes(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCapster(c.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 text-zinc-100 font-bold'
                          : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-sm">{c.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Buka Toko & Verifikasi Shift Kasir</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
