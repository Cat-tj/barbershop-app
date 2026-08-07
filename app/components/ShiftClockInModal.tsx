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
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-500 border border-purple-500/30">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              OPEN STORE / SHIFT KASIR
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DAILY CLOCK-IN
              </span>
            </h3>
            <p className="text-xs text-slate-500">Kasir: <strong className="text-purple-500 font-mono">{username}</strong></p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Input Uang Laci Awal */}
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-purple-500" /> 1. Input Nominal Uang Modal Laci Awal
            </label>
            <div className="relative">
              <input
                type="number"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="200000"
                className="w-full h-11 px-3.5 bg-[#f8f7fc] border border-slate-200 rounded-xl text-sm font-mono text-purple-500 font-bold focus:outline-none focus:border-purple-500/60"
              />
              <div className="mt-1 text-right text-xs font-mono font-bold text-emerald-400">
                Format: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(openingCash) || 0)}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Uang pecahan kembalian awal di laci meja kasir pagi ini.</p>

          {/* Step 2: Pilih Capster Shift Hari Ini */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-500" /> 2. Pilih Barber / Capster Bertugas Shift Hari Ini
            </label>
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Memuat daftar barber...</div>
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
                          ? 'bg-purple-500/15 border-purple-500/60 text-slate-900 font-bold'
                          : 'bg-[#f8f7fc] border-slate-200/80 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-sm">{c.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mt-2"
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
