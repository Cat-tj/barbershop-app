'use client'

import { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Calendar, CheckCircle2, UserCheck, AlertCircle, Award } from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

interface CapsterKPI {
  id: number
  name: string
  base_salary: number
  total_haircuts: number
  total_shift_days: number
  total_revenue: number
  estimated_commission: number
}

export default function CapsterPortalPage() {
  const [kpi, setKpi] = useState<CapsterKPI | null>(null)
  const [clockedIn, setClockedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/kpi?capster_id=1')
      .then(res => res.json())
      .then(data => {
        if (data.capsters && data.capsters.length > 0) {
          setKpi(data.capsters[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-[#F7F4EF] min-h-full p-4 sm:p-6 space-y-6 text-[#26231F] font-sans">
      {/* Capster Portal Header */}
      <div className="bg-white border border-[#DED7CE] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#B7792B] text-white font-black text-xl flex items-center justify-center shadow-lg shadow-[#B7792B]/20">
            💈
          </div>
          <div>
            <h1 className="text-xl font-black text-[#26231F] flex items-center gap-2">
              PORTAL CAPSTER ROME BOIS
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#56806A]/10 text-[#56806A] border border-[#56806A]/30">
                STAFF DASHBOARD
              </span>
            </h1>
            <p className="text-xs text-[#746E66]">Selamat bertugas, <strong className="text-[#B7792B]">{kpi?.name || 'Barber Rome Bois'}</strong></p>
          </div>
        </div>

        {/* Clock In Button */}
        <button
          onClick={() => setClockedIn(!clockedIn)}
          className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
            clockedIn
              ? 'bg-[#56806A] text-white shadow-[#56806A]/20'
              : 'bg-[#B7792B] hover:bg-[#7A4B16] text-white shadow-[#B7792B]/20'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{clockedIn ? '● Sudah Clock-In Today' : 'Clock-In Turun Kerja'}</span>
        </button>
      </div>

      {/* KPI & Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#DED7CE] space-y-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#746E66] flex items-center gap-1.5">
            <Scissors className="w-4 h-4 text-[#B7792B]" /> Total Potong Cukur
          </span>
          <p className="text-2xl font-black text-[#26231F] font-mono">{loading ? '...' : `${kpi?.total_haircuts || 0} Kepala`}</p>
          <p className="text-[11px] text-[#746E66]">Jumlah cukur selesai bulan ini</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#DED7CE] space-y-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#746E66] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#56806A]" /> Shift Kehadiran
          </span>
          <p className="text-2xl font-black text-[#56806A] font-mono">{loading ? '...' : `${kpi?.total_shift_days || 0} Hari`}</p>
          <p className="text-[11px] text-[#746E66]">Total hari turun kerja bulan ini</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#DED7CE] space-y-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#746E66] flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#7A4B16]" /> Omset Tercipta
          </span>
          <p className="text-xl font-black text-[#26231F] font-mono">{loading ? '...' : formatRupiah(kpi?.total_revenue || 0)}</p>
          <p className="text-[11px] text-[#746E66]">Nilai transaksi jasa & produk</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#B7792B]/10 border border-[#B7792B]/30 space-y-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#7A4B16] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#B7792B]" /> Estimasi Komisi Saya
          </span>
          <p className="text-xl font-black text-[#B7792B] font-mono">{loading ? '...' : formatRupiah(kpi?.estimated_commission || 0)}</p>
          <p className="text-[11px] text-[#746E66]">Komisi jasa & penjualan produk</p>
        </div>
      </div>

      {/* Today's Queue & Assigned Customers */}
      <div className="bg-white border border-[#DED7CE] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#26231F] border-b border-[#DED7CE] pb-3">
          Jadwal Pelanggan Cukur Saya Hari Ini
        </h3>

        <div className="space-y-2">
          <div className="p-4 rounded-2xl bg-[#F1ECE5] border border-[#DED7CE] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#26231F] text-sm block">Alexander The Great</span>
              <span className="text-[#746E66]">Potong Cukur Gentleman &middot; Jam 14:00</span>
            </div>
            <button className="px-4 py-2 rounded-xl bg-[#B7792B] text-white font-bold text-xs">
              Mulai Cukur
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#F1ECE5] border border-[#DED7CE] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#26231F] text-sm block">Budi Santoso</span>
              <span className="text-[#746E66]">Cukur + Keramas + Head Massage &middot; Jam 15:30</span>
            </div>
            <span className="text-[#746E66] font-semibold">Menunggu</span>
          </div>
        </div>
      </div>
    </div>
  )
}
