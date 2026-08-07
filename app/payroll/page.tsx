'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Scissors, ShoppingBag, Calendar, Award, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

interface DailyBreakdown {
  date: string; haircuts: number; products: number
  service_rev: number; product_rev: number; service_comm: number; product_comm: number
}

interface CapsterPayroll {
  capster_id: number; capster_name: string; base_salary: number
  service_revenue: number; service_commission: number
  product_revenue: number; product_commission: number
  total_haircuts: number; total_products: number
  shift_days: number; attendance_bonus: number; total_gaji: number
  daily_breakdown: Record<string, DailyBreakdown>
}

interface PayrollTotals {
  total_base_salary: number; total_service_commission: number
  total_product_commission: number; total_attendance_bonus: number
  total_gaji: number; total_capsters: number
}

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7))
  const [capsters, setCapsters] = useState<CapsterPayroll[]>([])
  const [totals, setTotals] = useState<PayrollTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/payroll?month=${month}`)
      .then(r => r.json())
      .then(data => {
        setCapsters(data.capsters || [])
        setTotals(data.totals || null)
      })
      .finally(() => setLoading(false))
  }, [month])

  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(d.toISOString().substring(0, 7))
  }

  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(d.toISOString().substring(0, 7))
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="flex-1 flex flex-col min-h-full p-4 sm:p-6 space-y-6" style={{ background: '#f8f7fc' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1e293b' }}>
            <DollarSign className="w-6 h-6" style={{ color: '#7c5ce8' }} />
            Perhitungan Gaji Capster
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Rekap gaji pokok, komisi, dan bonus hadir per capster
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white rounded-xl border px-4 py-2" style={{ borderColor: '#e2e6ec' }}>
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronDown className="w-4 h-4" style={{ color: '#64748b' }} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#1e293b' }}>{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronUp className="w-4 h-4" style={{ color: '#64748b' }} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e6ec' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f3e8ff' }}>
                <Scissors className="w-4 h-4" style={{ color: '#7c5ce8' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase" style={{ color: '#64748b' }}>Gaji Pokok</span>
            </div>
            <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{formatRupiah(totals.total_base_salary)}</p>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e6ec' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                <Scissors className="w-4 h-4" style={{ color: '#2563eb' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase" style={{ color: '#64748b' }}>Komisi Jasa</span>
            </div>
            <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{formatRupiah(totals.total_service_commission)}</p>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e6ec' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
                <ShoppingBag className="w-4 h-4" style={{ color: '#d97706' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase" style={{ color: '#64748b' }}>Komisi Produk</span>
            </div>
            <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{formatRupiah(totals.total_product_commission)}</p>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e6ec' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#d1fae5' }}>
                <Calendar className="w-4 h-4" style={{ color: '#16a34a' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase" style={{ color: '#64748b' }}>Bonus Hadir</span>
            </div>
            <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{formatRupiah(totals.total_attendance_bonus)}</p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: '#7c5ce8', background: 'linear-gradient(135deg, rgba(124,92,232,.08), rgba(126,37,130,.04))' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,92,232,.15)' }}>
                <Award className="w-4 h-4" style={{ color: '#7c5ce8' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase" style={{ color: '#7c5ce8' }}>TOTAL GAJI</span>
            </div>
            <p className="text-lg font-black" style={{ color: '#6344c0' }}>{formatRupiah(totals.total_gaji)}</p>
          </div>
        </div>
      )}

      {/* Per Capster Detail */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: '#e2e6ec' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#7c5ce8', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>Menghitung gaji capster...</p>
          </div>
        ) : capsters.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: '#e2e6ec' }}>
            <p className="text-sm" style={{ color: '#64748b' }}>Belum ada data transaksi bulan ini</p>
          </div>
        ) : (
          capsters.map(p => (
            <div key={p.capster_id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e6ec' }}>
              {/* Capster Header */}
              <button
                onClick={() => setExpanded(expanded === p.capster_id ? null : p.capster_id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg" style={{ background: 'linear-gradient(135deg, #7c5ce8, #6344c0)' }}>
                    {p.capster_name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-sm" style={{ color: '#1e293b' }}>{p.capster_name}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {p.total_haircuts} cukur · {p.shift_days} hari kerja · {formatRupiah(p.service_revenue + p.product_revenue)} omset
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: '#7c5ce8' }}>{formatRupiah(p.total_gaji)}</p>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>Total Gaji</p>
                </div>
              </button>

              {/* Expanded Detail */}
              {expanded === p.capster_id && (
                <div className="border-t px-5 pb-5" style={{ borderColor: '#e2e6ec' }}>
                  {/* Wage Breakdown */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                    <div className="p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>Gaji Pokok</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{formatRupiah(p.base_salary)}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>Komisi Jasa</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{formatRupiah(p.service_commission)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{p.total_haircuts} layanan · {formatRupiah(p.service_revenue)}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>Komisi Produk</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{formatRupiah(p.product_commission)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{p.total_products} produk · {formatRupiah(p.product_revenue)}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>Bonus Hadir</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{formatRupiah(p.attendance_bonus)}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{p.shift_days} hari</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(124,92,232,.06)', border: '1px solid rgba(124,92,232,.15)' }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: '#7c5ce8' }}>TOTAL</p>
                      <p className="text-sm font-black" style={{ color: '#6344c0' }}>{formatRupiah(p.total_gaji)}</p>
                    </div>
                  </div>

                  {/* Daily Breakdown Table */}
                  {Object.keys(p.daily_breakdown).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold mb-2" style={{ color: '#1e293b' }}>Detail Per Hari</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th className="text-left p-2 font-semibold" style={{ color: '#64748b' }}>Tanggal</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Cukur</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Produk</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Omset Jasa</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Komisi Jasa</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Omset Produk</th>
                              <th className="text-right p-2 font-semibold" style={{ color: '#64748b' }}>Komisi Produk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(p.daily_breakdown).sort((a, b) => a.date.localeCompare(b.date)).map(d => (
                              <tr key={d.date} className="border-t" style={{ borderColor: '#f1f5f9' }}>
                                <td className="p-2 font-medium" style={{ color: '#1e293b' }}>
                                  {new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="p-2 text-right" style={{ color: '#1e293b' }}>{d.haircuts}</td>
                                <td className="p-2 text-right" style={{ color: '#1e293b' }}>{d.products}</td>
                                <td className="p-2 text-right" style={{ color: '#64748b' }}>{formatRupiah(d.service_rev)}</td>
                                <td className="p-2 text-right font-semibold" style={{ color: '#7c5ce8' }}>{formatRupiah(d.service_comm)}</td>
                                <td className="p-2 text-right" style={{ color: '#64748b' }}>{formatRupiah(d.product_rev)}</td>
                                <td className="p-2 text-right font-semibold" style={{ color: '#d97706' }}>{formatRupiah(d.product_comm)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
