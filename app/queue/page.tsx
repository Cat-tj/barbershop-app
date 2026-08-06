'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Scissors, RefreshCw, CheckCircle2, Play, Check, X } from 'lucide-react'

interface BookingQueue {
  id: number
  customer_name: string
  customer_phone: string | null
  start_time: string
  end_time: string
  booking_date: string
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  capster_name?: string
}

export default function QueuePage() {
  const [queue, setQueue] = useState<BookingQueue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      if (data.bookings) setQueue(data.bookings)
    } catch (err) {
      console.error('Failed to load queue', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000) // Auto-refresh queue every 5s
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id: number, status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) fetchQueue()
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const currentServing = queue.find((q) => q.status === 'in_progress')
  const waitingQueue = queue.filter((q) => q.status === 'confirmed')

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-4 sm:p-6 min-h-full">
      <div className="w-full max-w-3xl bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-black tracking-wider text-zinc-100 flex items-center gap-2">
              ANTRIAN CUKUR & MONITOR OPERATOR
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                OPERATOR CONTROL
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Tekan tombol aksi untuk mengubah status pelanggan (Mulai Cukur / Selesai)</p>
          </div>
          <button
            onClick={fetchQueue}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Section 1: Sedang Dilayani (In Progress) */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/40 space-y-4">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-400 block">
            ✂️ SEKARANG SEDANG DILAYANI (IN PROGRESS)
          </span>

          {currentServing ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-zinc-100">{currentServing.customer_name}</h2>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Jam <strong className="text-amber-400 font-mono">{currentServing.start_time} - {currentServing.end_time}</strong>
                  <span>&middot; HP: <strong className="text-zinc-200 font-mono">{currentServing.customer_phone || '—'}</strong></span>
                </p>
              </div>
              <button
                onClick={() => updateStatus(currentServing.id, 'completed')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Selesaikan Cukur (Completed)</span>
              </button>
            </div>
          ) : (
            <div className="py-4 text-center text-zinc-500 text-sm font-semibold">
              Belum ada pelanggan yang sedang dicukur. Pilih dari daftar antrian di bawah untuk memulai!
            </div>
          )}
        </div>

        {/* Section 2: Daftar Antrian Menunggu (Waiting List) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Daftar Menunggu Antrian ({waitingQueue.length})</span>
            <span className="text-[10px] text-zinc-500 font-normal">Tekan "Mulai Cukur" untuk memindahkan ke In Progress</span>
          </h3>

          {waitingQueue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-500">
              Belum ada antrian reservasi menunggu saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {waitingQueue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-zinc-800 text-amber-400 font-bold font-mono flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{item.customer_name}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">HP: {item.customer_phone || 'Pelanggan Umum'} &middot; Jam: <strong className="text-amber-400">{item.start_time}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800/80">
                    <button
                      onClick={() => updateStatus(item.id, 'in_progress')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-zinc-950" />
                      <span>Mulai Cukur</span>
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'cancelled')}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors"
                      title="Batalkan Antrian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
