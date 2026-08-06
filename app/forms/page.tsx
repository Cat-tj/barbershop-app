'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Scissors, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react'

interface Service {
  id: number
  name: string
  price: number
  duration: number
}

interface Slot {
  time: string
  status: 'available' | 'taken' | 'mine'
}

export default function PublicBookingForm() {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedServices, setSelectedServices] = useState<number[]>([1])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Load Services
  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        if (data.services && data.services.length > 0) {
          setServices(data.services)
        } else {
          setServices([
            { id: 1, name: 'Potong Cukur Gentleman', price: 50000, duration: 30 },
            { id: 2, name: 'Cukur + Keramas + Head Massage', price: 75000, duration: 45 },
            { id: 3, name: 'Coloring / Semir Hair Trend', price: 120000, duration: 60 },
          ])
        }
      })
      .catch(() => {
        setServices([
          { id: 1, name: 'Potong Cukur Gentleman', price: 50000, duration: 30 },
          { id: 2, name: 'Cukur + Keramas + Head Massage', price: 75000, duration: 45 },
        ])
      })
      .finally(() => setLoadingServices(false))
  }, [])

  // Load Time Slots for selected date (10.00 - 22.00)
  useEffect(() => {
    if (!bookingDate) return
    setLoadingSlots(true)
    fetch(`/api/bookings/slots?date=${bookingDate}&capster_id=1&phone=${customerPhone}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          // Filter slots from 10:00 to 22:00
          const filtered = data.slots.filter((s: Slot) => {
            const hour = parseInt(s.time.split(':')[0], 10)
            return hour >= 10 && hour <= 22
          })
          setSlots(filtered)
        }
      })
      .catch(() => {
        // Fallback slots 10:00 to 22:00
        const defaultSlots: Slot[] = []
        for (let h = 10; h <= 22; h++) {
          const hh = h.toString().padStart(2, '0')
          defaultSlots.push({ time: `${hh}:00`, status: 'available' })
          if (h < 22) defaultSlots.push({ time: `${hh}:30`, status: 'available' })
        }
        setSlots(defaultSlots)
      })
      .finally(() => setLoadingSlots(false))
  }, [bookingDate, customerPhone])

  function toggleService(id: number) {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id))
      }
    } else {
      setSelectedServices([...selectedServices, id])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) {
      setError('Nama wajib diisi.')
      return
    }

    if (!customerPhone.trim()) {
      setError('Nomor HP wajib diisi.')
      return
    }

    if (!selectedTime) {
      setError('Silakan pilih jam potong cukur.')
      return
    }

    setSubmitting(true)

    try {
      const payloadServices = services
        .filter((s) => selectedServices.includes(s.id))
        .map((s) => ({ service_id: s.id, price: s.price }))

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          capster_id: 1,
          booking_date: bookingDate,
          start_time: selectedTime,
          services: payloadServices,
          is_new_member: true,
          booking_type: 'potong_di_tempat',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal membuat reservasi')
      }

      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 my-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-2xl flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
            R
          </div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-2">
            ROMEBOIS
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              RESERVATION
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Booking Cukur & Jadwal Online Altora
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center py-8 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Reservasi Berhasil!</h2>
            <p className="text-xs text-zinc-400 max-w-md">
              Jadwal cukur kamu pada tanggal <span className="font-bold text-amber-400">{bookingDate}</span> jam{' '}
              <span className="font-bold text-amber-400">{selectedTime}</span> telah terdaftar di sistem ROMEBOIS Barbershop.
            </p>
            <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Nama Pelanggan</span>
                <span className="font-bold text-zinc-200">{customerName}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Nomor HP / Member</span>
                <span className="font-mono text-zinc-200">{customerPhone}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-sm">
                <span className="text-zinc-400">Total Biaya</span>
                <span className="text-amber-500">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccess(false)
                setSelectedTime('')
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-600 transition-colors"
            >
              Buat Reservasi Baru
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Data Pelanggan */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <User className="w-4 h-4" /> 1. Data Member / Pelanggan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Alexander The Great"
                    className="w-full h-11 px-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="085200000000"
                    className="w-full h-11 px-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Pilih Layanan */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Scissors className="w-4 h-4" /> 2. Pilih Layanan Cukur
              </h3>
              {loadingServices ? (
                <div className="p-4 text-center text-xs text-zinc-500">Memuat paket cukur...</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {services.map((svc) => {
                    const isSelected = selectedServices.includes(svc.id)
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 text-zinc-100 shadow-md shadow-amber-500/5'
                            : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-zinc-200">{svc.name}</div>
                          <div className="text-[11px] text-zinc-500">{svc.duration || 30} Menit</div>
                        </div>
                        <div className="font-extrabold text-sm text-amber-400 font-mono">
                          Rp {svc.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Pilih Tanggal & Jam */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> 3. Tanggal & Jam Potong (10:00 - 22:00)
              </h3>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Pilih Tanggal</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full h-11 px-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Slot Jam Grid */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-2">Pilih Jam Cukur Tersedia</label>
                {loadingSlots ? (
                  <div className="p-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Memeriksa slot jam...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((s) => {
                      const isTaken = s.status === 'taken'
                      const isSelected = selectedTime === s.time
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={isTaken}
                          onClick={() => setSelectedTime(s.time)}
                          className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                            isTaken
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-600 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:text-amber-400'
                          }`}
                        >
                          {s.time}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Total & Submit */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Total Estimasi Cukur</span>
                <span className="text-xl font-black text-amber-500 font-mono">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Konfirmasi Reservasi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          &copy; {new Date().getFullYear()} ROMEBOIS Barbershop &middot; Online Reservation System
        </p>
      </div>
    </div>
  )
}
