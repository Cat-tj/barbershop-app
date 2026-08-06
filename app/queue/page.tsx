'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Scissors, RefreshCw, CheckCircle2 } from 'lucide-react'

interface BookingQueue {
  id: number
  customer_name: string
  customer_phone: string | null
  start_time: string
  end_time: string
  booking_date: string
  status: string
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
    const interval = setInterval(fetchQueue, 10000) // Auto-refresh queue every 10s
    return () => clearInterval(interval)
  }, [])

  const currentServing = queue[0]
  const upcomingQueue = queue.slice(1)

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6 min-h-full">
      <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-black tracking-wider text-zinc-100 flex items-center gap-2">
              ANTRIAN CUKUR HARI INI
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                LIVE TV / MONITOR
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Daftar Antrian Cukur & Reservasi Online Form</p>
          </div>
          <button
            onClick={fetchQueue}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Current Serving */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-400 block mb-1">
              ✂️ SEKARANG SEDANG DILAYANI
            </span>
            {currentServing ? (
              <div>
                <h2 className="text-2xl font-black text-zinc-100">{currentServing.customer_name}</h2>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Jam <strong className="text-amber-400 font-mono">{currentServing.start_time} - {currentServing.end_time}</strong>
                  {currentServing.capster_name && (
                    <span>&middot; Capster: <strong className="text-zinc-200">{currentServing.capster_name}</strong></span>
                  )}
                </p>
              </div>
            ) : (
              <span className="text-xl font-bold text-zinc-500">&mdash; Belum Ada Antrian Dilayani &mdash;</span>
            )}
          </div>
          {currentServing && (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>In Progress</span>
            </div>
          )}
        </div>

        {/* Upcoming Queue */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Berikutnya Dalam Antrian ({upcomingQueue.length})
          </h3>

          {upcomingQueue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-500">
              Belum ada reservasi antrian berikutnya untuk hari ini.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingQueue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-zinc-800 text-amber-400 font-bold font-mono flex items-center justify-center">
                      #{index + 2}
                    </span>
                    <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{item.customer_name}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">{item.customer_phone || 'Pelanggan Umum'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 font-mono block">{item.start_time}</span>
                    <span className="text-[10px] text-zinc-500">Estimasi Selesai: {item.end_time}</span>
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
