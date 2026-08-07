'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Service {
  id: number
  name: string
  price: number
  duration: number | null
}

interface Product {
  id: number
  name: string
  price: number
}

import { formatRupiah as formatRp } from '@/lib/currency'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export default function CatalogPage() {
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, pRes] = await Promise.all([
          supabase.from('services').select('id, name, price, duration').order('name'),
          supabase.from('products').select('id, name, price').eq('category', 'product').order('name'),
        ])
        if (sRes.data) setServices(sRes.data)
        if (pRes.data) setProducts(pRes.data)
      } catch (err) {
        console.error('Catalog load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f7fc]">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f7fc] p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-base font-bold text-slate-900">ROMEBOIS</h1>
        <p className="text-xs text-slate-400">Daftar Harga</p>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Layanan</h2>
        </div>
        {services.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Tidak ada layanan</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {services.map(s => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-slate-800 truncate">{s.name}</p>
                  {s.duration && (
                    <p className="text-xs text-slate-400">{formatDuration(s.duration)}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-purple-500 flex-shrink-0">{formatRp(s.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Produk</h2>
        </div>
        {products.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Tidak ada produk</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {products.map(p => (
              <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm text-slate-800 truncate flex-1 mr-3">{p.name}</p>
                <span className="text-sm font-semibold text-purple-500 flex-shrink-0">{formatRp(p.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-400">
        Harga dapat berubah sewaktu-waktu · {new Date().getFullYear()} ROMEBOIS
      </p>
    </div>
  )
}
