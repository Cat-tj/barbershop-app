'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

interface SlotItem {
  time: string
  status: 'available' | 'taken' | 'mine'
}

interface MemberInfo {
  id: number
  name: string
  phone: string
  tier_id: number
  total_points: number
  tier_name: string
  color: string
}

export default function BookingPage() {
  // --- State ---
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<MemberInfo | null | undefined>(null) // null=not checked, object=found, undefined=not found
  const [isNewMember, setIsNewMember] = useState(false)
  const [name, setName] = useState('')
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [selectedCapster, setSelectedCapster] = useState<number | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set())
  const [bookingType, setBookingType] = useState<'potong_di_tempat' | 'dipanggil'>('potong_di_tempat')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Load capsters and services on mount ---
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

  // --- Debounced phone lookup ---
  const lookupMember = useCallback((phoneNum: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const trimmed = phoneNum.trim()
      if (!trimmed) {
        setMember(null)
        setIsNewMember(false)
        return
      }
      try {
        const res = await fetch(`/api/member?phone=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        if (data.found) {
          setMember(data as MemberInfo)
          setName(data.name)
          setIsNewMember(false)
        } else {
          setMember(undefined)
          setIsNewMember(true)
        }
      } catch {
        setMember(undefined)
        setIsNewMember(true)
      }
    }, 500)
  }, [])

  // --- Fetch slots when capster or date changes ---
  useEffect(() => {
    if (!selectedCapster || !date) {
      setSlots([])
      return
    }
    setSlotsLoading(true)
    const controller = new AbortController()
    const params = new URLSearchParams({ date, capster_id: String(selectedCapster) })
    if (phone.trim()) params.set('phone', phone.trim())
    fetch(`/api/bookings/slots?${params}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.slots) setSlots(data.slots)
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false))
    return () => controller.abort()
  }, [selectedCapster, date, phone])

  // --- Clear time selection when capster or date changes ---
  useEffect(() => {
    setSelectedTime(null)
  }, [selectedCapster, date])

  // --- Computed ---
  const toggleService = (id: number) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedServiceList = services.filter(s => selectedServices.has(s.id))
  const totalPrice = selectedServiceList.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServiceList.reduce((sum, s) => sum + (s.duration || 30), 0)

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  // --- Submit ---
  const handleBook = async () => {
    setMessage(null)

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Nama diperlukan.' })
      return
    }
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Nomor telepon diperlukan.' })
      return
    }
    if (!selectedCapster) {
      setMessage({ type: 'error', text: 'Pilih capster.' })
      return
    }
    if (!selectedTime) {
      setMessage({ type: 'error', text: 'Pilih jam.' })
      return
    }
    if (selectedServiceList.length === 0) {
      setMessage({ type: 'error', text: 'Pilih minimal satu layanan.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          capster_id: selectedCapster,
          booking_date: date,
          start_time: selectedTime,
          services: selectedServiceList.map(s => ({
            service_id: s.id,
            price: s.price,
          })),
          booking_type: bookingType,
          notes: notes.trim() || null,
          is_new_member: isNewMember,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Booking gagal')
      setMessage({ type: 'success', text: `Booking berhasil! ID: ${result.booking_id}` })
      // reset form
      setSelectedCapster(null)
      setSelectedTime(null)
      setName('')
      setPhone('')
      setSelectedServices(new Set())
      setNotes('')
      setBookingType('potong_di_tempat')
      setMember(null)
      setIsNewMember(false)
      setSlots([])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking gagal'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  // --- Slot color logic ---
  function slotClasses(slot: SlotItem): string {
    const isSelected = selectedTime === slot.time
    if (isSelected) return 'bg-emerald-600 border-emerald-500 text-white'
    if (slot.status === 'mine') return 'bg-green-600/30 border-green-500 text-green-300'
    if (slot.status === 'taken') return 'bg-slate-100 text-slate-400 cursor-not-allowed'
    return 'bg-slate-100 hover:bg-slate-200 border-slate-200'
  }

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-slate-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-4">

        {/* HEADER */}
        <div>
          <h1 className="text-base font-bold tracking-tight">Booking</h1>
          <p className="text-slate-500 text-xs mt-0.5">Buat janji baru</p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                : 'bg-red-900/50 text-red-300 border border-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* SECTION 1: Phone + Member lookup */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <label className="block text-xs font-medium text-slate-500">No. Telepon</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value)
                lookupMember(e.target.value)
              }}
              placeholder="08123456789"
              className="flex-1 h-10 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => lookupMember(phone)}
              className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold
                         transition-colors focus:outline-none focus:border-emerald-500/50"
            >
              Cek
            </button>
          </div>

          {/* Member badge */}
          {member && (
            <div
              className="flex items-center gap-2 p-2 rounded-lg text-xs"
              style={{ backgroundColor: `${member.color}20`, borderColor: member.color, borderWidth: 1 }}
            >
              <span>👑</span>
              <span className="font-semibold">{member.name}</span>
              <span className="opacity-70">· {member.tier_name}</span>
              <span className="opacity-70">· {member.total_points?.toLocaleString()} pts</span>
            </div>
          )}

          {/* Name input (shown when member not found or not yet checked) */}
          {member === undefined && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nama *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama pelanggan"
                className="w-full h-9 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-900
                           placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}
          {member === null && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nama *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama pelanggan"
                className="w-full h-9 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-900
                           placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}
        </div>

        {/* SECTION 2: Capster selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-500">Capster</label>
          <div className="flex flex-wrap gap-2">
            {capsters.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCapster(c.id === selectedCapster ? null : c.id)}
                className={`h-10 px-3 rounded-lg text-xs font-medium transition-colors focus:outline-none ${
                  selectedCapster === c.id
                    ? 'bg-emerald-600 text-white border border-emerald-500'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-zinc-600'
                }`}
              >
                {c.name}
              </button>
            ))}
            {capsters.length === 0 && (
              <p className="text-slate-400 text-xs py-2">Tidak ada capster</p>
            )}
          </div>
        </div>

        {/* SECTION 3: Date picker */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-500">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-900
                       focus:outline-none focus:border-emerald-500/50"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* SECTION 4: Time grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-500">Jam</label>
          {!selectedCapster ? (
            <p className="text-xs text-slate-400 py-4 text-center">Pilih capster dulu</p>
          ) : slotsLoading ? (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {slots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={slot.status === 'taken'}
                  onClick={() => {
                    if (slot.status !== 'taken') setSelectedTime(slot.time)
                  }}
                  className={`h-9 rounded-lg text-xs font-medium transition-colors border focus:outline-none focus:border-emerald-500/50 ${slotClasses(slot)}`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: Services */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-500">Layanan</label>
          <div className="space-y-1.5">
            {services.map(s => {
              const selected = selectedServices.has(s.id)
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    selected
                      ? 'bg-emerald-900/30 border border-emerald-700'
                      : 'bg-slate-100 border border-slate-200 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleService(s.id)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-800">{s.name}</span>
                    {s.duration && (
                      <span className="text-xs text-slate-400 ml-1.5">{formatDuration(s.duration)}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">
                    Rp {s.price.toLocaleString()}
                  </span>
                </label>
              )
            })}
            {services.length === 0 && (
              <p className="text-slate-400 text-xs py-2">Tidak ada layanan</p>
            )}
          </div>

          {/* Total */}
          {selectedServiceList.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                {selectedServiceList.length} layanan
                {totalDuration > 0 && ` · ~${formatDuration(totalDuration)}`}
              </div>
              <div className="text-sm font-bold text-emerald-400">
                Rp {totalPrice.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 6: Booking type + notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <label className="block text-xs font-medium text-slate-500">Tipe Booking</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBookingType('potong_di_tempat')}
              className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors border focus:outline-none ${
                bookingType === 'potong_di_tempat'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-zinc-600'
              }`}
            >
              Potong di Tempat
            </button>
            <button
              type="button"
              onClick={() => setBookingType('dipanggil')}
              className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors border focus:outline-none ${
                bookingType === 'dipanggil'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-zinc-600'
              }`}
            >
              Dipanggil
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={2}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>
        </div>

        {/* SUBMIT */}
        <button
          type="button"
          onClick={handleBook}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200
                     disabled:text-slate-400 text-white font-semibold text-sm transition-colors
                     focus:outline-none focus:border-emerald-500/50"
        >
          {loading ? 'Booking...' : 'Book Now'}
        </button>

      </div>
    </div>
  )
}
