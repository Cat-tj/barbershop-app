'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Capster {
  id: number
  name: string
}

interface Booking {
  id: number
  customer_name: string
  customer_phone: string | null
  capster_id: number
  booking_date: string
  start_time: string
  end_time: string
  booking_type: string
  notes: string | null
  services?: { name: string }[]
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 9; h < 21; h++) {
    const hh = h.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  slots.push('21:00')
  return slots
}

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  const monday = new Date(date.getFullYear(), date.getMonth(), diff)
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDayShort(d: Date): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return days[d.getDay()]
}

export default function CalendarPage() {
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.getFullYear(), now.getMonth(), diff)
    return monday
  })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const weekDates = getWeekDates(currentWeekStart)
  const timeSlots = generateTimeSlots()

  // Fetch capsters
  useEffect(() => {
    supabase
      .from('capsters')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setCapsters(data)
      })
  }, [])

  // Fetch bookings for the week
  useEffect(() => {
    setLoading(true)
    const startDate = formatDate(weekDates[0])
    const endDate = formatDate(weekDates[6])

    async function fetchBookings() {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          customer_phone,
          capster_id,
          booking_date,
          start_time,
          end_time,
          booking_type,
          notes,
          booking_items(
            services(name)
          )
        `)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .neq('status', 'cancelled')

      if (data) {
        const enriched = data.map((b: Record<string, unknown>) => {
          const items = b.booking_items as { services: { name: string } }[] | undefined
          const serviceNames = items?.map(i => i.services?.name).filter(Boolean) || []
          return {
            ...b,
            services: serviceNames.map(n => ({ name: n })),
          } as Booking
        })
        setBookings(enriched)
      }
      setLoading(false)
    }
    fetchBookings().catch(() => setLoading(false))
  }, [currentWeekStart])

  // Build booking map: key = "date|capster_id|time" -> Booking
  const bookingMap = new Map<string, Booking>()
  for (const b of bookings) {
    const time = b.start_time?.substring(0, 5)
    if (time) {
      const key = `${b.booking_date}|${b.capster_id}|${time}`
      bookingMap.set(key, b)
    }
  }

  const prevWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() - 7)
    setCurrentWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() + 7)
    setCurrentWeekStart(d)
  }

  const weekLabel = `${weekDates[0].getDate()}-${weekDates[6].getDate()} ${weekDates[0].toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`

  if (capsters.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-4">
        <p className="text-zinc-500 text-sm">No active capsters found.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h1 className="text-base font-bold text-zinc-100">Calendar</h1>
        <p className="text-xs text-zinc-500">{weekLabel}</p>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center border-b border-zinc-800">
        <button
          onClick={prevWeek}
          className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        >
          ◀
        </button>
        <div className="flex-1 grid grid-cols-7">
          {weekDates.map((d, i) => (
            <div key={i} className="text-center py-2">
              <p className="text-[10px] text-zinc-500">{formatDayShort(d)}</p>
              <p className="text-xs font-medium text-zinc-300">{d.getDate()}</p>
            </div>
          ))}
        </div>
        <button
          onClick={nextWeek}
          className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        >
          ▶
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr>
                <th className="sticky left-0 z-20 bg-zinc-950 border-b border-zinc-800 px-2 py-1.5 text-left text-[10px] text-zinc-500 font-medium w-12">
                  Time
                </th>
                {capsters.map(c => (
                  <th
                    key={c.id}
                    className="border-b border-zinc-800 px-1 py-1.5 text-center text-[10px] text-zinc-400 font-medium min-w-[80px]"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDates.map((date, dateIdx) => {
                const dateStr = formatDate(date)
                return timeSlots.map((time, timeIdx) => (
                  <tr key={`${dateStr}-${time}`}>
                    {timeIdx === 0 && (
                      <td
                        className="sticky left-0 z-10 bg-zinc-950 border-b border-zinc-800 px-2 py-0.5 text-left text-[10px] text-zinc-500 font-medium"
                        rowSpan={timeSlots.length}
                      >
                        <div className="text-xs font-semibold text-zinc-300">{formatDayShort(date)}</div>
                        <div className="text-[10px]">{date.getDate()}/{date.getMonth() + 1}</div>
                      </td>
                    )}
                    <td className="border-b border-zinc-800/50 px-0.5 py-0.5 text-center text-[10px] text-zinc-600">
                      {time}
                    </td>
                    {capsters.map(cap => {
                      const key = `${dateStr}|${cap.id}|${time}`
                      const booking = bookingMap.get(key)
                      return (
                        <td
                          key={cap.id}
                          className={`border-b border-zinc-800/50 px-1 py-0.5 align-top ${booking ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={() => booking && setSelectedBooking(booking)}
                        >
                          {booking ? (
                            <div className="bg-green-900/40 border border-green-800/50 rounded px-1 py-0.5 text-[10px] leading-tight">
                              <p className="text-green-300 font-medium truncate">{booking.customer_name}</p>
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Popup */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-xs w-full space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100">{selectedBooking.customer_name}</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
            {selectedBooking.customer_phone && (
              <p className="text-xs text-zinc-400">📱 {selectedBooking.customer_phone}</p>
            )}
            <p className="text-xs text-zinc-400">
              📅 {selectedBooking.booking_date} · {selectedBooking.start_time?.substring(0, 5)} - {selectedBooking.end_time?.substring(0, 5)}
            </p>
            {selectedBooking.services && selectedBooking.services.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Services</p>
                <div className="space-y-0.5">
                  {selectedBooking.services.map((s, i) => (
                    <p key={i} className="text-xs text-zinc-300">{s.name}</p>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Type: {selectedBooking.booking_type === 'dipanggil' ? 'Dipanggil' : 'Potong di Tempat'}
            </p>
            {selectedBooking.notes && (
              <p className="text-xs text-zinc-500 italic">Note: {selectedBooking.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
