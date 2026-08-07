'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Scissors, RefreshCw, CheckCircle2, Play, Check, X } from 'lucide-react'
import ShiftClockInModal from '../components/ShiftClockInModal'

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

interface Capster {
  id: number
  name: string
}

export default function QueuePage() {
  const [queue, setQueue] = useState<BookingQueue[]>([])
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [loading, setLoading] = useState(true)

  // Shift Modal State
  const [showShiftModal, setShowShiftModal] = useState(false)

  // Capster Picker Modal State on Start Haircut
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null)
  const [pickerCapsterId, setPickerCapsterId] = useState<number | null>(null)

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

  const checkShift = async () => {
    try {
      const res = await fetch('/api/shift')
      const data = await res.json()
      if (!data.hasActiveShift) {
        setShowShiftModal(true)
      }
    } catch (err) {
      console.error('Shift check error', err)
    }
  }

  const fetchCapsters = async () => {
    try {
      const res = await fetch('/api/admin/capsters')
      const data = await res.json()
      if (data.capsters) setCapsters(data.capsters)
    } catch (err) {
      console.error('Capsters fetch error', err)
    }
  }

  useEffect(() => {
    fetchQueue()
    checkShift()
    fetchCapsters()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const openStartHaircutModal = (bookingId: number) => {
    setSelectedBookingId(bookingId)
    if (capsters.length > 0) {
      setPickerCapsterId(capsters[0].id)
    }
  }

  const confirmStartHaircut = async () => {
    if (!selectedBookingId) return
    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBookingId,
          status: 'in_progress',
          capster_id: pickerCapsterId
        })
      })
      if (res.ok) {
        setSelectedBookingId(null)
        fetchQueue()
      }
    } catch (err) {
      console.error('Failed to start haircut', err)
    }
  }

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
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f7fc] p-4 sm:p-6 min-h-full relative text-[#10224f]">
      {/* Shift Clock-in Modal */}
      <ShiftClockInModal
        isOpen={showShiftModal}
        username="kasir"
        onClockInSuccess={() => setShowShiftModal(false)}
      />

      {/* Capster Picker Modal for Mulai Cukur */}
      {selectedBookingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-[#e9e6f2] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e9e6f2] pb-3">
              <h3 className="text-sm font-bold text-[#10224f] flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#7c5ce8]" />
                <span>Pilih Barber Cukur</span>
              </h3>
              <button onClick={() => setSelectedBookingId(null)} className="text-[#6b7590] hover:text-[#10224f]">&times;</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b7590] mb-2">Siapa Barber yang Memotong?</label>
              <select
                value={pickerCapsterId || ''}
                onChange={(e) => setPickerCapsterId(Number(e.target.value))}
                className="w-full h-11 px-3.5 bg-[#F8F5F0] border border-[#e9e6f2] rounded-xl text-xs text-[#10224f] font-bold focus:outline-none focus:border-[#7c5ce8]"
              >
                {capsters.map((c) => (
                  <option key={c.id} value={c.id}>
                    💈 {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedBookingId(null)}
                className="flex-1 h-11 rounded-xl bg-[#F8F5F0] hover:bg-[#E9E3DB] border border-[#e9e6f2] text-[#10224f] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={confirmStartHaircut}
                className="flex-1 h-11 rounded-xl bg-[#7c5ce8] hover:bg-[#9E6421] text-white font-bold text-xs shadow-md shadow-[#7c5ce8]/20"
              >
                Mulai Cukur Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl bg-white border border-[#e9e6f2] rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e9e6f2] pb-4">
          <div>
            <h1 className="text-xl font-black tracking-wider text-[#10224f] flex items-center gap-2">
              ANTRIAN CUKUR ROME BOIS
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#7c5ce8]/15 text-[#7c5ce8] border border-[#7c5ce8]/30">
                OPERATOR CONTROL
              </span>
            </h1>
            <p className="text-xs text-[#6b7590]">Pilih Barber bertugas dan jalankan proses cukur pelanggan</p>
          </div>
          <button
            onClick={fetchQueue}
            className="p-2 rounded-xl bg-[#F8F5F0] text-[#6b7590] hover:text-[#10224f] transition-colors border border-[#e9e6f2]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7c5ce8]' : ''}`} />
          </button>
        </div>

        {/* Section 1: Sedang Dilayani (In Progress) */}
        <div className="p-6 rounded-3xl bg-[#7c5ce8]/10 border border-[#7c5ce8]/30 space-y-4">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#9E6421] block">
            ✂️ SEKARANG SEDANG DILAYANI (IN PROGRESS)
          </span>

          {currentServing ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#10224f]">{currentServing.customer_name}</h2>
                <p className="text-xs text-[#6b7590] mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#7c5ce8]" />
                  Jam <strong className="text-[#7c5ce8] font-mono">{currentServing.start_time} - {currentServing.end_time}</strong>
                  <span>&middot; Barber: <strong className="text-[#10224f] font-bold">{currentServing.capster_name || 'Budi Barbershop'}</strong></span>
                </p>
              </div>
              <button
                onClick={() => updateStatus(currentServing.id, 'completed')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5E806B] hover:bg-[#5E806B]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#5E806B]/20 active:scale-95 transition-all shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Selesaikan Cukur (Completed)</span>
              </button>
            </div>
          ) : (
            <div className="py-4 text-center text-[#6b7590] text-xs font-semibold">
              Belum ada pelanggan yang sedang dicukur. Klik "Mulai Cukur" di bawah!
            </div>
          )}
        </div>

        {/* Section 2: Daftar Antrian Menunggu (Waiting List) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b7590] flex items-center justify-between">
            <span>Daftar Menunggu Antrian ({waitingQueue.length})</span>
            <span className="text-[10px] text-[#8792a8] font-normal">Tekan "Mulai Cukur" untuk memilih barber</span>
          </h3>

          {waitingQueue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#e9e6f2] rounded-2xl text-xs text-[#6b7590]">
              Belum ada antrian reservasi menunggu saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {waitingQueue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#F8F5F0] border border-[#e9e6f2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-white text-[#7c5ce8] font-extrabold font-mono flex items-center justify-center shrink-0 border border-[#e9e6f2]">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-[#10224f] text-sm">{item.customer_name}</h4>
                      <p className="text-[11px] text-[#6b7590] font-mono">HP: {item.customer_phone || 'Pelanggan Umum'} &middot; Jam: <strong className="text-[#7c5ce8]">{item.start_time}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#e9e6f2]">
                    <button
                      onClick={() => openStartHaircutModal(item.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#7c5ce8] hover:bg-[#9E6421] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Mulai Cukur</span>
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'cancelled')}
                      className="p-2 rounded-xl bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 transition-colors"
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
