'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Scissors, CheckCircle2, Sparkles, AlertCircle, Loader2, Award, Search, Check } from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

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

interface MemberInfo {
  id: number
  name_masked: string
  phone: string
  tier_name: string
  total_points: number
  total_spent: number
  visit_count: number
  rewards_available: number
}

export default function PublicBookingForm() {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedServices, setSelectedServices] = useState<number[]>([1])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  
  // Member Lookup State
  const [checkingMember, setCheckingMember] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberMessage, setMemberMessage] = useState('')

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
          const filtered = data.slots.filter((s: Slot) => {
            const hour = parseInt(s.time.split(':')[0], 10)
            return hour >= 10 && hour <= 22
          })
          setSlots(filtered)
        }
      })
      .catch(() => {
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

  // Automatic Customer Point Lookup on Phone blur/change
  const handleCheckMember = async () => {
    if (!customerPhone.trim() || customerPhone.length < 8) return
    setCheckingMember(true)
    setMemberMessage('')
    try {
      const res = await fetch(`/api/member/lookup?phone=${encodeURIComponent(customerPhone.trim())}`)
      const data = await res.json()
      if (data.found && data.member) {
        setMemberInfo(data.member)
      } else {
        setMemberInfo(null)
        setMemberMessage(data.message || 'Nomor ini belum terdaftar sebagai member Rome Bois.')
      }
    } catch {
      setMemberInfo(null)
    } finally {
      setCheckingMember(false)
    }
  }

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
    <div className="min-h-screen bg-[#F7F4EF] text-[#26231F] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Header Branding */}
      <div className="w-full max-w-xl bg-white border border-[#DED7CE] rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 my-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#B7792B] text-white font-black text-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#B7792B]/20">
            RB
          </div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-2 text-[#26231F]">
            ROME BOIS
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#B7792B]/10 text-[#B7792B] border border-[#B7792B]/30">
              BARBERSHOP
            </span>
          </h1>
          <p className="text-xs text-[#746E66] mt-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#B7792B]" /> Cek Poin Member & Reservasi Cukur Online
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center py-8 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#56806A]/15 text-[#56806A] border border-[#56806A]/40 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#26231F]">Reservasi Berhasil!</h2>
            <p className="text-xs text-[#746E66] max-w-md">
              Jadwal cukur kamu pada tanggal <span className="font-bold text-[#B7792B]">{bookingDate}</span> jam{' '}
              <span className="font-bold text-[#B7792B]">{selectedTime}</span> telah terdaftar di ROME BOIS.
            </p>
            <div className="w-full bg-[#F1ECE5] border border-[#DED7CE] rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#DED7CE] pb-2">
                <span className="text-[#746E66]">Nama Pelanggan</span>
                <span className="font-bold text-[#26231F]">{customerName}</span>
              </div>
              <div className="flex justify-between border-b border-[#DED7CE] pb-2">
                <span className="text-[#746E66]">Nomor HP / Member</span>
                <span className="font-mono text-[#26231F]">{customerPhone}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-sm">
                <span className="text-[#746E66]">Total Biaya</span>
                <span className="text-[#B7792B]">{formatRupiah(totalPrice)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSuccess(false)
                setSelectedTime('')
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#B7792B] text-white font-bold text-xs hover:bg-[#7A4B16] transition-colors"
            >
              Buat Reservasi Baru
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#B45C54]/10 border border-[#B45C54]/30 text-[#B45C54] text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Customer Point Checker & Identification */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7792B] flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> 1. Cek Poin Member & Identification</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#746E66] mb-1">Nomor WhatsApp / HP Member</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={handleCheckMember}
                      placeholder="081299887766"
                      className="w-full h-11 px-3.5 bg-[#F1ECE5] border border-[#DED7CE] rounded-xl text-sm font-mono text-[#26231F] focus:outline-none focus:border-[#B7792B]"
                    />
                    <button
                      type="button"
                      onClick={handleCheckMember}
                      className="absolute right-2 top-2 h-7 px-3 rounded-lg bg-[#B7792B] text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      {checkingMember ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      <span>Cek Poin</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#746E66] mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Budi Santoso"
                    className="w-full h-11 px-3.5 bg-[#F1ECE5] border border-[#DED7CE] rounded-xl text-sm text-[#26231F] focus:outline-none focus:border-[#B7792B]"
                  />
                </div>
              </div>

              {/* Member Point Card Preview */}
              {memberInfo && (
                <div className="p-4 rounded-2xl bg-[#B7792B]/10 border border-[#B7792B]/30 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#B7792B]/20 pb-2">
                    <span className="font-bold text-[#7A4B16] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#B7792B]" /> Member Found: {memberInfo.name_masked}
                    </span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-[#B7792B] text-white">
                      {memberInfo.tier_name}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                    <div>
                      <span className="block text-[10px] text-[#746E66]">Poin Anda</span>
                      <strong className="text-sm text-[#B7792B]">{memberInfo.total_points} Pts</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#746E66]">Kunjungan</span>
                      <strong className="text-sm text-[#26231F]">{memberInfo.visit_count}x</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#746E66]">Voucher Diskon</span>
                      <strong className="text-xs text-[#56806A]">{formatRupiah(memberInfo.rewards_available)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {memberMessage && (
                <p className="text-[11px] text-[#746E66] italic">{memberMessage}</p>
              )}
            </div>

            {/* Step 2: Choose Services */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7792B] flex items-center gap-1.5">
                <Scissors className="w-4 h-4" /> 2. Pilih Layanan Cukur
              </h3>
              {loadingServices ? (
                <div className="p-4 text-center text-xs text-[#746E66]">Memuat paket cukur...</div>
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
                            ? 'bg-[#B7792B]/10 border-[#B7792B] text-[#26231F]'
                            : 'bg-[#F1ECE5] border-[#DED7CE] text-[#746E66] hover:border-[#B7792B]/50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-[#26231F]">{svc.name}</div>
                          <div className="text-[11px] text-[#746E66]">{svc.duration || 30} Menit</div>
                        </div>
                        <div className="font-extrabold text-sm text-[#B7792B] font-mono">
                          {formatRupiah(svc.price)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Date & Slots */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7792B] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> 3. Tanggal & Jam Cukur (10:00 - 22:00)
              </h3>
              <div>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#F1ECE5] border border-[#DED7CE] rounded-xl text-sm text-[#26231F] focus:outline-none focus:border-[#B7792B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#746E66] mb-2">Pilih Jam Cukur Tersedia</label>
                {loadingSlots ? (
                  <div className="p-4 text-center text-xs text-[#746E66] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#B7792B]" /> Memeriksa slot jam...
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
                              ? 'bg-[#E5DFD5] border-[#DED7CE] text-[#A39C93] line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#B7792B] text-white border-[#B7792B] shadow-md shadow-[#B7792B]/20 scale-105'
                              : 'bg-[#F1ECE5] border-[#DED7CE] text-[#26231F] hover:border-[#B7792B] hover:text-[#B7792B]'
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
            <div className="pt-4 border-t border-[#DED7CE] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#746E66]">Total Biaya Cukur</span>
                <span className="text-xl font-black text-[#B7792B] font-mono">
                  {formatRupiah(totalPrice)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-[#B7792B] hover:bg-[#7A4B16] text-white font-bold text-sm transition-all shadow-lg shadow-[#B7792B]/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Konfirmasi Reservasi ROME BOIS</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] text-[#746E66]">
          &copy; {new Date().getFullYear()} ROME BOIS Barbershop &middot; Technology by Altora
        </p>
      </div>
    </div>
  )
}
