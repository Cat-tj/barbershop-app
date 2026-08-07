'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, TrendingUp, Users, Scissors, ShoppingBag, Clock,
  AlertTriangle, Bell, ArrowRight, CreditCard, Package, Calendar,
  UserCheck, ChevronRight, Star
} from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

interface DashboardData {
  dailySummary: { total_orders: number; total_revenue: number; avg_order: number }
  topCapsters: Array<{ name: string; id: number; orders_handled: number; revenue_generated: number }>
  topServices: Array<{ name: string; qty_sold: number; revenue: number }>
  topProducts: Array<{ name: string; qty_sold: number; revenue: number }>
  recentOrders: Array<{ id: number; customer_name: string; total: number; payment_method: string; created_at: string }>
  membersOverdue: Array<{ id: number; name: string; phone: string; days_since_visit: number }>
  membersLikely: Array<{ id: number; name: string; phone: string; days_since_visit: number }>
  membersRecentHaircut: Array<{ id: number; name: string; last_visit_date: string }>
  revenueTrend: Array<{ day: string; orders: number; revenue: number }>
  paymentBreakdown: Array<{ payment_method: string; count: number; total: number }>
  lowStock: Array<{ name: string; stock: number }>
  totalMembers: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#f8f7fc' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#7c5ce8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const { dailySummary: ds, topCapsters, topServices, topProducts, recentOrders, membersOverdue, membersLikely, membersRecentHaircut, revenueTrend, paymentBreakdown, lowStock, totalMembers } = data

  return (
    <div className="flex-1 flex flex-col min-h-full p-4 sm:p-6 space-y-5" style={{ background: '#f8f7fc' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#10224f' }}>
            <LayoutDashboard className="w-6 h-6" style={{ color: '#7c5ce8' }} />
            Dashboard CRM
          </h1>
          <p className="text-xs mt-1" style={{ color: '#6b7590' }}>Ringkasan operasional & insight pelanggan</p>
        </div>
        <div className="flex gap-2 text-xs">
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={period === p ? { background: 'rgba(124,92,232,.12)', color: '#7c5ce8' } : { background: 'white', color: '#6b7590', border: '1px solid #e9e6f2' }}>
              {p === 'today' ? 'Hari Ini' : p === 'week' ? '7 Hari' : 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: TrendingUp, label: 'Omset', value: formatRupiah(ds.total_revenue), color: '#7c5ce8' },
          { icon: ShoppingBag, label: 'Transaksi', value: `${ds.total_orders}`, color: '#0e7a57' },
          { icon: TrendingUp, label: 'Rata-rata', value: formatRupiah(ds.avg_order), color: '#3b82f6' },
          { icon: Users, label: 'Total Member', value: `${totalMembers}`, color: '#d97706' },
          { icon: AlertTriangle, label: 'Member Overdue', value: `${membersOverdue.length}`, color: '#ef4444' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e9e6f2' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              </div>
              <span className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold font-mono" style={{ color: '#10224f' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* REVENUE TREND */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4" style={{ color: '#10224f' }}>📈 Trend Omset 7 Hari</h3>
          {revenueTrend.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#8792a8' }}>Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {revenueTrend.map(r => {
                const maxRev = Math.max(...revenueTrend.map(x => x.revenue), 1)
                return (
                  <div key={r.day} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono w-12 shrink-0" style={{ color: '#6b7590' }}>
                      {new Date(r.day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(r.revenue / maxRev) * 100}%`, background: 'linear-gradient(90deg, #7c5ce8, #a78bfa)' }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold w-20 text-right" style={{ color: '#10224f' }}>{formatRupiah(r.revenue)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PAYMENT BREAKDOWN */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4" style={{ color: '#10224f' }}>💳 Metode Pembayaran</h3>
          {paymentBreakdown.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#8792a8' }}>Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map(p => {
                const colors: Record<string, string> = { cash: '#0e7a57', qris: '#7c5ce8', debit: '#3b82f6' }
                const c = colors[p.payment_method] || '#6b7590'
                return (
                  <div key={p.payment_method} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" style={{ color: c }} />
                      <span className="text-xs font-bold uppercase" style={{ color: c }}>{p.payment_method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono" style={{ color: '#10224f' }}>{formatRupiah(p.total)}</p>
                      <p className="text-[10px]" style={{ color: '#8792a8' }}>{p.count} transaksi</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TOP CAPSTERS */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: '#10224f' }}>
            <Scissors className="w-4 h-4" style={{ color: '#7c5ce8' }} /> Top Capster
          </h3>
          <div className="space-y-2">
            {topCapsters.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: '#8792a8' }}>Belum ada data</p>
            ) : topCapsters.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: i === 0 ? 'rgba(217,119,6,.12)' : i === 1 ? 'rgba(100,116,139,.1)' : 'rgba(124,92,232,.08)', color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : '#7c5ce8' }}>
                  {i === 0 ? <Star className="w-3.5 h-3.5" /> : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: '#10224f' }}>{c.name}</p>
                  <p className="text-[10px]" style={{ color: '#8792a8' }}>{c.orders_handled} transaksi</p>
                </div>
                <p className="text-xs font-bold font-mono" style={{ color: '#7c5ce8' }}>{formatRupiah(c.revenue_generated)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* LOW STOCK ALERTS */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: '#10224f' }}>
            <Package className="w-4 h-4" style={{ color: '#ef4444' }} /> Stok Menipis
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: '#0e7a57' }}>Semua stok aman ✓</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map(p => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#fdeaec', border: '1px solid rgba(239,68,68,.15)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#10224f' }}>{p.name}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: '#ef4444' }}>{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CRM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MEMBERS OVERDUE — Warning */}
        <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'linear-gradient(135deg, rgba(239,68,68,.04), rgba(239,68,68,.01))' }}>
          <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-4 h-4" /> ⚠️ Belum Potong &gt;30 Hari
          </h3>
          <p className="text-[10px] mb-3" style={{ color: '#6b7590' }}>Member ini perlu dihubungi (WA reminder)</p>
          {membersOverdue.length === 0 ? (
            <p className="text-xs py-2" style={{ color: '#0e7a57' }}>Tidak ada overdue ✓</p>
          ) : (
            <div className="space-y-2">
              {membersOverdue.map(m => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:shadow-sm transition-all">
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#10224f' }}>{m.name}</p>
                    <p className="text-[10px]" style={{ color: '#8792a8' }}>{Math.round(m.days_since_visit)} hari lalu</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8792a8' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* MEMBERS LIKELY — Coming Soon */}
        <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(124,92,232,.3)', background: 'linear-gradient(135deg, rgba(124,92,232,.04), rgba(124,92,232,.01))' }}>
          <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#7c5ce8' }}>
            <Clock className="w-4 h-4" /> 🕐 Estimasi Akan Potong (20-30 hari)
          </h3>
          <p className="text-[10px] mb-3" style={{ color: '#6b7590' }}>Kirim promo / reminder booking</p>
          {membersLikely.length === 0 ? (
            <p className="text-xs py-2" style={{ color: '#8792a8' }}>Tidak ada yang estimasi</p>
          ) : (
            <div className="space-y-2">
              {membersLikely.map(m => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:shadow-sm transition-all">
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#10224f' }}>{m.name}</p>
                    <p className="text-[10px]" style={{ color: '#8792a8' }}>{Math.round(m.days_since_visit)} hari lalu</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8792a8' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* MEMBERS RECENT — Baru Potong */}
        <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(14,122,87,.3)', background: 'linear-gradient(135deg, rgba(14,122,87,.04), rgba(14,122,87,.01))' }}>
          <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#0e7a57' }}>
            <Scissors className="w-4 h-4" /> ✂️ Baru Potong Hari Ini
          </h3>
          <p className="text-[10px] mb-3" style={{ color: '#6b7590' }}>Member yang sudah datang hari ini</p>
          {membersRecentHaircut.length === 0 ? (
            <p className="text-xs py-2" style={{ color: '#8792a8' }}>Belum ada yang potong hari ini</p>
          ) : (
            <div className="space-y-2">
              {membersRecentHaircut.map(m => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:shadow-sm transition-all">
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#10224f' }}>{m.name}</p>
                    <p className="text-[10px]" style={{ color: '#8792a8' }}>{new Date(m.last_visit_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8792a8' }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TOP SERVICES */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: '#10224f' }}>
            <Scissors className="w-4 h-4" style={{ color: '#7c5ce8' }} /> Layanan Terlaris
          </h3>
          {topServices.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: '#8792a8' }}>Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {topServices.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-5 text-center" style={{ color: '#7c5ce8' }}>#{i + 1}</span>
                    <span className="text-xs font-semibold" style={{ color: '#10224f' }}>{s.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono" style={{ color: '#7c5ce8' }}>{s.qty_sold}x</p>
                    <p className="text-[10px]" style={{ color: '#8792a8' }}>{formatRupiah(s.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT ORDERS */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: '#10224f' }}>
            <ShoppingBag className="w-4 h-4" style={{ color: '#7c5ce8' }} /> Transaksi Terbaru
          </h3>
          {recentOrders.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: '#8792a8' }}>Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#10224f' }}>{o.customer_name}</p>
                    <p className="text-[10px]" style={{ color: '#8792a8' }}>
                      {new Date(o.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {o.payment_method}
                    </p>
                  </div>
                  <p className="text-xs font-bold font-mono" style={{ color: '#10224f' }}>{formatRupiah(o.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
