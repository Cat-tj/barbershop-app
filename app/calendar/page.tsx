'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Scissors, DollarSign, Award, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react'

interface CapsterKPI {
  id: number
  name: string
  base_salary: number
  total_haircuts: number
  total_shift_days: number
  total_revenue: number
  estimated_commission: number
  daily: Record<string, { haircuts: number; revenue: number; commission: number; attended: boolean }>
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default function CalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)) // YYYY-MM
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>('all')
  const [kpiData, setKpiData] = useState<CapsterKPI[]>([])
  const [loading, setLoading] = useState(true)

  const [year, monthNum] = selectedMonth.split('-').map(Number)
  const monthDate = new Date(year, monthNum - 1, 1)

  const fetchKpi = async () => {
    setLoading(true)
    try {
      const url = `/api/kpi?month=${selectedMonth}${selectedCapsterId !== 'all' ? `&capster_id=${selectedCapsterId}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.capsters) setKpiData(data.capsters)
    } catch (err) {
      console.error('Failed to fetch KPI', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKpi()
  }, [selectedMonth, selectedCapsterId])

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1)
    setSelectedMonth(d.toISOString().substring(0, 7))
  }

  const nextMonth = () => {
    const d = new Date(year, monthNum, 1)
    setSelectedMonth(d.toISOString().substring(0, 7))
  }

  // Summary aggregation across displayed capsters
  const totalHaircuts = kpiData.reduce((acc, c) => acc + c.total_haircuts, 0)
  const totalShiftDays = kpiData.reduce((acc, c) => acc + c.total_shift_days, 0)
  const totalRevenue = kpiData.reduce((acc, c) => acc + c.total_revenue, 0)
  const totalCommission = kpiData.reduce((acc, c) => acc + c.estimated_commission, 0)

  // Calendar Days Grid Construction
  const daysInMonth = getDaysInMonth(year, monthNum - 1)
  const firstDayOfWeek = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7 // Monday start (0=Mon, 6=Sun)

  const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 p-4 sm:p-6 min-h-full space-y-6">
      {/* Header Controls */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            KALENDER HARI KERJA & KPI BARBER
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pantau kehadiran shift turun kerja, jumlah cukur, & estimasi komisi bulanan
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Capster Selector */}
          <select
            value={selectedCapsterId}
            onChange={(e) => setSelectedCapsterId(e.target.value)}
            className="h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="all">💈 Semua Capster / Barber</option>
            {kpiData.map((c) => (
              <option key={c.id} value={c.id}>
                👤 {c.name}
              </option>
            ))}
          </select>

          {/* Month Navigator */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 shrink-0">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-amber-400 px-3 capitalize">{monthName}</span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-amber-400" /> Total Potong Cukur
          </span>
          <p className="text-2xl font-black text-zinc-100 font-mono">{loading ? '...' : `${totalHaircuts} Kepala`}</p>
          <p className="text-[11px] text-zinc-500">Jumlah cukur selesai bulan ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Total Shift Turun Kerja
          </span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{loading ? '...' : `${totalShiftDays} Hari`}</p>
          <p className="text-[11px] text-zinc-500">Jumlah hari buka toko / clock-in</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" /> Total Omset Tercipta
          </span>
          <p className="text-xl font-black text-zinc-100 font-mono">{loading ? '...' : formatRp(totalRevenue)}</p>
          <p className="text-[11px] text-zinc-500">Total nilai transaksi jasa + produk</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/40 space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Estimasi Total Komisi
          </span>
          <p className="text-xl font-black text-amber-400 font-mono">{loading ? '...' : formatRp(totalCommission)}</p>
          <p className="text-[11px] text-zinc-400">Komisi belum termasuk gaji pokok</p>
        </div>
      </div>

      {/* Monthly Attendance & Haircuts Calendar Grid */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span>KALENDER KEHADIRAN & DETAIL HARIAN ({monthName})</span>
          </h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Shift Turun Kerja
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ada Cukur
            </span>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-zinc-500 pb-1 border-b border-zinc-800/60">
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div>Sab</div>
          <div>Min</div>
        </div>

        {/* Calendar Days */}
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 flex justify-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[85px] bg-zinc-950/30 rounded-xl border border-zinc-900 opacity-30" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1
              const dayStr = dayNum.toString().padStart(2, '0')
              const fullDateStr = `${selectedMonth}-${dayStr}`

              // Gather stats for this date across selected capster(s)
              let dayAttended = false
              let dayHaircuts = 0
              let dayRevenue = 0
              let dayCommission = 0

              kpiData.forEach((c) => {
                const stat = c.daily[fullDateStr]
                if (stat) {
                  if (stat.attended) dayAttended = true
                  dayHaircuts += stat.haircuts
                  dayRevenue += stat.revenue
                  dayCommission += stat.commission
                }
              })

              return (
                <div
                  key={fullDateStr}
                  className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    dayAttended
                      ? 'bg-gradient-to-b from-emerald-500/10 via-zinc-900 to-zinc-900 border-emerald-500/40 shadow-sm'
                      : dayHaircuts > 0
                      ? 'bg-zinc-900 border-amber-500/30'
                      : 'bg-zinc-950/80 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${dayAttended ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {dayNum}
                    </span>
                    {dayAttended && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        SHIFT
                      </span>
                    )}
                  </div>

                  {dayHaircuts > 0 || dayRevenue > 0 ? (
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                        <span>✂️ {dayHaircuts} Cukur</span>
                      </p>
                      <p className="text-[10px] font-mono text-zinc-300">
                        {formatRp(dayRevenue)}
                      </p>
                      {dayCommission > 0 && (
                        <p className="text-[9px] font-mono text-emerald-400 font-semibold">
                          +{formatRp(dayCommission)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600 italic">
                      {dayAttended ? 'Libur cukur' : 'Off'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
