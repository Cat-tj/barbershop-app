'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  today: { revenue: number; orders: number; bookings: number }
  top_services: { name: string; count: number; revenue: number }[]
  top_products: { name: string; qty: number; revenue: number }[]
  top_capsters: { name: string; orders: number; commission: number }[]
  low_stock: { name: string; stock: number; threshold: number }[]
  recent_orders: { customer_name: string; total: number; time: string; capster_name: string }[]
  revenue_last_7_days: { date: string; revenue: number }[]
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatShortRp(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Failed to load dashboard')
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const today = new Date()
  const dateStr = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { today: todayData, top_services, top_products, top_capsters, low_stock, recent_orders, revenue_last_7_days } = data
  const avgOrderValue = todayData.orders > 0 ? todayData.revenue / todayData.orders : 0
  const maxRevenue = Math.max(...revenue_last_7_days.map(d => d.revenue), 1)

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-zinc-100">Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-0.5">{dateStr}</p>
      </div>

      {/* KPI Cards — 3 cols */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/80">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Revenue</p>
          <p className="text-sm font-bold text-amber-400">{formatRp(todayData.revenue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/80">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Orders</p>
          <p className="text-sm font-bold text-zinc-200">{todayData.orders}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/80">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Avg Order</p>
          <p className="text-sm font-bold text-zinc-200">{formatRp(avgOrderValue)}</p>
        </div>
      </div>

      {/* Revenue chart — CSS bar chart for last 7 days */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800/80 p-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Revenue (7 Days)</h2>
        <div className="flex items-end gap-1 h-28">
          {revenue_last_7_days.map((d) => {
            const pct = (d.revenue / maxRevenue) * 100
            const dayLabel = new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short' })
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] text-zinc-500 flex-shrink-0">
                  {d.revenue > 0 ? formatShortRp(d.revenue) : ''}
                </span>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm bg-amber-500/70 min-h-[4px] transition-all"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 flex-shrink-0">{dayLabel}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Services + Top Products — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top 5 Services */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800/80 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Services</h2>
          </div>
          {top_services.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-600">No services today</p>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {top_services.map((s, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <span className="text-[10px] text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-xs text-zinc-300 truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-zinc-500">{s.count}x</span>
                    <span className="text-xs text-amber-400 font-medium w-20 text-right">{formatRp(s.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Products */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800/80 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Products</h2>
          </div>
          {top_products.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-600">No products today</p>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {top_products.map((p, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <span className="text-[10px] text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-xs text-zinc-300 truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-zinc-500">{p.qty}x</span>
                    <span className="text-xs text-amber-400 font-medium w-20 text-right">{formatRp(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Capsters leaderboard */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Capsters</h2>
        </div>
        {top_capsters.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-600">No capster data today</p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {top_capsters.map((c, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <span className={`text-[10px] font-bold w-4 text-right flex-shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-zinc-300 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-zinc-500">{c.orders} orders</span>
                  <span className="text-xs text-amber-400 font-medium w-20 text-right">{formatRp(c.commission)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recent Orders</h2>
        </div>
        {recent_orders.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-600">No orders today</p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {recent_orders.map((o, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-xs text-zinc-300 truncate">{o.customer_name}</p>
                  <p className="text-[10px] text-zinc-600">{o.time}{o.capster_name ? ` · ${o.capster_name}` : ''}</p>
                </div>
                <span className="text-xs text-amber-400 font-medium flex-shrink-0">{formatRp(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      {low_stock.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-amber-800/40 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-amber-800/40 bg-amber-500/5">
            <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⚠ Low Stock</h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {low_stock.map((p, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-300 truncate flex-1 mr-2">{p.name}</span>
                <span className={`text-xs font-medium flex-shrink-0 ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {p.stock} / {p.threshold}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
