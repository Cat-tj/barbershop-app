'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Service {
  id: number
  name: string
  price: number
  duration: number | null
}

interface Capster {
  id: number
  name: string
  active: boolean
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00',
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [selectedCapster, setSelectedCapster] = useState<number | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: capsterData } = await supabase
        .from('capsters')
        .select('id, name, active')
        .eq('active', true)
        .order('name')
      if (capsterData) setCapsters(capsterData)

      const { data: serviceData } = await supabase
        .from('services')
        .select('id, name, price, duration')
        .order('name')
      if (serviceData) setServices(serviceData)
    }
    loadData()
  }, [])

  const selectedServiceData = services.find(s => s.id === selectedService)

  const handleSubmit = async () => {
    setMessage(null)

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Nama diperlukan.' })
      return
    }
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Nomor telepon diperlukan.' })
      return
    }
    if (!selectedService) {
      setMessage({ type: 'error', text: 'Pilih layanan.' })
      return
    }
    if (!selectedCapster) {
      setMessage({ type: 'error', text: 'Pilih capster.' })
      return
    }
    if (!date) {
      setMessage({ type: 'error', text: 'Pilih tanggal.' })
      return
    }
    if (!time) {
      setMessage({ type: 'error', text: 'Pilih jam.' })
      return
    }

    setLoading(true)
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          service_id: selectedService,
          capster_id: selectedCapster,
          booking_date: date,
          booking_time: time,
          status: 'confirmed',
          booking_type: 'potong_di_tempat',
        })
        .select('id')
        .single()

      if (error) throw error

      setBookingId(booking.id)
      setMessage({
        type: 'success',
        text: `Booking berhasil! ID: ${booking.id}`,
      })

      // Reset form
      setName('')
      setPhone('')
      setSelectedService(null)
      setSelectedCapster(null)
      setDate(new Date().toISOString().split('T')[0])
      setTime('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking gagal'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-widest text-amber-500">ROMEBOIS</h1>
          <p className="text-sm text-zinc-400 mt-1">Book your appointment</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                : 'bg-red-900/40 text-red-300 border border-red-700/50'
            }`}
          >
            {message.text}
            {bookingId && message.type === 'success' && (
              <div className="mt-2 text-xs text-emerald-400/80 space-y-0.5">
                <p>Nama: {name || '—'}</p>
                <p>Layanan: {selectedServiceData?.name || '—'}</p>
                <p>Capster: {capsters.find(c => c.id === selectedCapster)?.name || '—'}</p>
                <p>Tanggal: {date} · {time}</p>
              </div>
            )}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="08123456789"
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Service</label>
            <select
              value={selectedService ?? ''}
              onChange={e => setSelectedService(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-zinc-900 text-zinc-500">Select a service</option>
              {services.map(s => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                  {s.name} — Rp {s.price.toLocaleString()}
                </option>
              ))}
            </select>
            {services.length === 0 && (
              <p className="text-xs text-zinc-600 mt-1">Loading services...</p>
            )}
          </div>

          {/* Capster */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Capster</label>
            <select
              value={selectedCapster ?? ''}
              onChange={e => setSelectedCapster(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-zinc-900 text-zinc-500">Select a capster</option>
              {capsters.map(c => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-100">
                  {c.name}
                </option>
              ))}
            </select>
            {capsters.length === 0 && (
              <p className="text-xs text-zinc-600 mt-1">Loading capsters...</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preferred Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         focus:outline-none focus:border-amber-500/50 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preferred Time</label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100
                         focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-zinc-900 text-zinc-500">Select a time</option>
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot} className="bg-zinc-900 text-zinc-100">
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700
                       disabled:text-zinc-500 text-zinc-950 font-semibold text-sm transition-colors
                       focus:outline-none focus:ring-2 focus:ring-amber-500/50 mt-2"
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-8">
          ROMEBOIS Barbershop
        </p>

      </div>
    </div>
  )
}
