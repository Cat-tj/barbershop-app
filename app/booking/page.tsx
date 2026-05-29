'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Capster {
  id: number
  name: string
  active: boolean
}

interface Service {
  id: number
  name: string
  price: number
  duration: number | null
}

interface SelectedService extends Service {
  selected: boolean
}

interface TimeSlot {
  time: string
  label: string
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let h = 9; h < 21; h++) {
    const hh = h.toString().padStart(2, '0')
    slots.push({ time: `${hh}:00`, label: `${hh}:00` })
    slots.push({ time: `${hh}:30`, label: `${hh}:30` })
  }
  // include 21:00
  slots.push({ time: '21:00', label: '21:00' })
  return slots
}

export default function BookingPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [selectedCapster, setSelectedCapster] = useState<number | null>(null)
  const [services, setServices] = useState<SelectedService[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const timeSlots = generateTimeSlots()

  useEffect(() => {
    async function loadData() {
      // fetch capsters
      const { data: capsterData } = await supabase
        .from('capsters')
        .select('id, name, active')
        .eq('active', true)
        .order('name')
      if (capsterData) setCapsters(capsterData)

      // fetch services
      const { data: serviceData } = await supabase
        .from('services')
        .select('id, name, price, duration')
        .order('name')
      if (serviceData) {
        setServices(serviceData.map((s: Service) => ({ ...s, selected: false })))
      }
    }
    loadData()
  }, [])

  const toggleService = (id: number) => {
    setServices(prev =>
      prev.map(s => (s.id === id ? { ...s, selected: !s.selected } : s))
    )
  }

  const selectedServices = services.filter(s => s.selected)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 30), 0)

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  const handleBook = async () => {
    setMessage(null)

    if (!customerName.trim()) {
      setMessage({ type: 'error', text: 'Customer name is required.' })
      return
    }
    if (!selectedCapster) {
      setMessage({ type: 'error', text: 'Please select a capster.' })
      return
    }
    if (selectedServices.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one service.' })
      return
    }
    if (!selectedTime) {
      setMessage({ type: 'error', text: 'Please select a time slot.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          capster_id: selectedCapster,
          booking_date: date,
          start_time: selectedTime,
          services: selectedServices.map(s => ({
            service_id: s.id,
            price: s.price,
          })),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Booking failed')
      setMessage({ type: 'success', text: `Booking confirmed! ID: ${result.booking_id}` })
      // reset form
      setSelectedCapster(null)
      setSelectedTime(null)
      setCustomerName('')
      setCustomerPhone('')
      setServices(prev => prev.map(s => ({ ...s, selected: false })))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking</h1>
          <p className="text-zinc-400 text-sm mt-1">Schedule a new appointment</p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                : 'bg-red-900/50 text-red-300 border border-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* DATE PICKER */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <label className="block text-sm font-medium text-zinc-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* CAPSTER SELECTOR */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <label className="block text-sm font-medium text-zinc-300">Capster</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {capsters.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCapster(c.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCapster === c.id
                    ? 'bg-emerald-600 text-white border border-emerald-500'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {c.name}
              </button>
            ))}
            {capsters.length === 0 && (
              <p className="text-zinc-500 text-sm col-span-full py-2">No capsters available</p>
            )}
          </div>
        </div>

        {/* SERVICES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <label className="block text-sm font-medium text-zinc-300">Services</label>
          <div className="space-y-2">
            {services.map(s => (
              <label
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  s.selected
                    ? 'bg-emerald-900/30 border border-emerald-700'
                    : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={() => toggleService(s.id)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-zinc-200">{s.name}</span>
                  {s.duration && (
                    <span className="text-xs text-zinc-500 ml-2">{formatDuration(s.duration)}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  Rp {s.price.toLocaleString()}
                </span>
              </label>
            ))}
            {services.length === 0 && (
              <p className="text-zinc-500 text-sm py-2">No services available</p>
            )}
          </div>

          {/* TOTAL */}
          {selectedServices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
              <div className="text-sm text-zinc-400">
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                {totalDuration > 0 && ` · ~${formatDuration(totalDuration)}`}
              </div>
              <div className="text-lg font-bold text-emerald-400">
                Rp {totalPrice.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* TIME SLOTS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <label className="block text-sm font-medium text-zinc-300">Time Slot</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {timeSlots.map(slot => (
              <button
                key={slot.time}
                type="button"
                onClick={() => setSelectedTime(slot.time)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedTime === slot.time
                    ? 'bg-emerald-600 text-white border border-emerald-500'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOMER INFO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <label className="block text-sm font-medium text-zinc-300">Customer</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100
                           placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100
                           placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* BOOK BUTTON */}
        <button
          type="button"
          onClick={handleBook}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700
                     disabled:text-zinc-500 text-white font-semibold text-base transition-colors
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {loading ? 'Booking...' : 'Book Now'}
        </button>
      </div>
    </div>
  )
}
