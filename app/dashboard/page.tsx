'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  today: { revenue: number; orders: number; bookings: number }
  top_services: { name: string; count: number; revenue: number }[]
  top_capsters: { name: string; orders: number; commission: number }[]
  low_stock: { name: string; stock: number; threshold: number }[]
  recent_orders: { customer_name: string; total: number; time: string; capster_name: string }[]
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
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

  const { today: todayData, top_services, top_capsters, low_stock, recent_orders } = data

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-3 sm:p-4 space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-zinc-100">Dashboard</h1>
        <p className="text-xs text-zinc-500">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900 rounded-lg p-3 text-center border border-zinc-800">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Revenue</p>
          <p className="text-sm font-bold text-amber-400 mt-1">{formatRp(todayData.revenue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 text-center border border-zinc-800">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Orders</p>
          <p className="text-sm font-bold text-zinc-200 mt-1">{todayData.orders}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 text-center border border-zinc-800">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Bookings</p>
          <p className="text-sm font-bold text-zinc-200 mt-1">{todayData.bookings}</p>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Top Services</h2>
        </div>
        {top_services.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-600">No services today</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {top_services.map((s, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-300 truncate flex-1 mr-2">{s.name}</span>
                <span className="text-xs text-zinc-500 w-14 text-right">{s.count}x</span>
                <span className="text-xs text-amber-400 w-24 text-right font-medium">{formatRp(s.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Capsters */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Top Capsters</h2>
        </div>
        {top_capsters.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-600">No capster data today</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {top_capsters.map((c, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-300 truncate flex-1 mr-2">{c.name}</span>
                <span className="text-xs text-zinc-500 w-14 text-right">{c.orders} orders</span>
                <span className="text-xs text-amber-400 w-24 text-right font-medium">{formatRp(c.commission)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock */}
      {low_stock.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⚠ Stok Menipis</h2>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {low_stock.map((p, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-300 truncate flex-1 mr-2">{p.name}</span>
                <span className={`text-xs font-medium ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {p.stock} / {p.threshold}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Transaksi Terakhir</h2>
        </div>
        {recent_orders.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-600">No orders today</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recent_orders.map((o, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-xs text-zinc-300 truncate">{o.customer_name}</p>
                  <p className="text-[10px] text-zinc-600">{o.time}{o.capster_name ? ` · ${o.capster_name}` : ''}</p>
                </div>
                <span className="text-xs text-amber-400 font-medium flex-shrink-0">{formatRp(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
