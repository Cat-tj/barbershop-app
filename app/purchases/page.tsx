'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: 'product' | 'consumable'
}

type PurchaseRow = {
  id: string
  item_name: string
  category: 'product' | 'consumable'
  quantity: string
  unit_price: string
  place_of_purchase: string
}

type PurchaseRecord = {
  id: number
  item_name: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  place_of_purchase: string
  is_new_item: boolean
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

let rowIdCounter = 0
function nextRowId() { return `row-${++rowIdCounter}` }

import { formatRupiah as formatRp } from '@/lib/currency'

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PurchasesPage() {
  /* ---- data ------------------------------------------------------ */
  const [products, setProducts] = useState<Product[]>([])
  const [history, setHistory] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- form state ------------------------------------------------ */
  const [rows, setRows] = useState<PurchaseRow[]>([{
    id: nextRowId(),
    item_name: '',
    category: 'product',
    quantity: '',
    unit_price: '',
    place_of_purchase: '',
  }])
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /* ---- product matching per row ---------------------------------- */
  const matchProduct = useCallback((name: string) => {
    const q = name.trim().toLowerCase()
    if (!q) return null
    return products.find(p => p.name.toLowerCase() === q) ?? null
  }, [products])

  /* ---- fetch data ------------------------------------------------ */
  const fetchData = useCallback(async () => {
    try {
      const [pRes, hRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(20),
      ])
      if (pRes.data) setProducts(pRes.data)
      if (hRes.data) setHistory(hRes.data)
    } catch (err) {
      console.error('Failed to load purchase data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ---- row helpers ----------------------------------------------- */
  const addRow = () => {
    setRows(prev => [...prev, {
      id: nextRowId(),
      item_name: '',
      category: 'product',
      quantity: '',
      unit_price: '',
      place_of_purchase: '',
    }])
  }

  const removeRow = (id: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(r => r.id !== id)
    })
  }

  const updateRow = (id: string, field: keyof PurchaseRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  /* ---- computed totals ------------------------------------------- */
  const rowTotals = rows.map(r => {
    const qty = Number(r.quantity) || 0
    const price = Number(r.unit_price) || 0
    return qty * price
  })

  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

  /* ---- submit ---------------------------------------------------- */
  const handleSubmit = async () => {
    setAlert(null)
    // Validate
    for (const r of rows) {
      if (!r.item_name.trim()) {
        setAlert({ type: 'error', message: 'Please fill Nama Barang for all rows.' })
        return
      }
      if (!r.quantity || Number(r.quantity) <= 0) {
        setAlert({ type: 'error', message: 'Quantity must be greater than 0.' })
        return
      }
      if (!r.unit_price || Number(r.unit_price) <= 0) {
        setAlert({ type: 'error', message: 'Unit price must be greater than 0.' })
        return
      }
    }

    setSubmitting(true)
    try {
      const items = rows.map(r => {
        const matched = matchProduct(r.item_name)
        return {
          item_name: r.item_name.trim(),
          category: r.category,
          quantity: Number(r.quantity),
          unit_price: Number(r.unit_price),
          place_of_purchase: r.place_of_purchase.trim() || null,
          is_new_item: !matched,
          create_product: !matched,
        }
      })

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `Server error: ${res.status}`)
      }

      const data = await res.json()
      setAlert({ type: 'success', message: `${data.count} items recorded. ${data.new_products > 0 ? `${data.new_products} new products created.` : ''}` })

      // Reset form
      setRows([{
        id: nextRowId(),
        item_name: '',
        category: 'product',
        quantity: '',
        unit_price: '',
        place_of_purchase: '',
      }])

      // Refresh history and products
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit purchases.'
      setAlert({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- loading --------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading purchases…</span>
        </div>
      </div>
    )
  }

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Alert */}
      {alert && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
          alert.type === 'success'
            ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/40 border border-red-700 text-red-300'
        }`}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-3 text-slate-500 hover:text-slate-800 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h1 className="text-base font-bold tracking-tight text-slate-900">Purchases</h1>
        <p className="text-xs text-slate-400 mt-0.5">Record inventory purchases</p>
      </div>

      {/* Content: scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Form card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">New Purchase</h2>

            {/* Rows */}
            {rows.map((r, idx) => {
              const matched = matchProduct(r.item_name)
              const total = rowTotals[idx] || 0
              return (
                <div key={r.id} className="bg-slate-100/40 border border-slate-200 rounded-lg p-3 space-y-3">
                  {/* Row header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Item #{idx + 1}</span>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(r.id)} className="text-xs text-slate-400 hover:text-red-400 transition-colors">Hapus</button>
                    )}
                  </div>

                  {/* Nama Barang */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Barang</label>
                    <input
                      type="text"
                      value={r.item_name}
                      onChange={e => updateRow(r.id, 'item_name', e.target.value)}
                      list="product-list"
                      className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
                      placeholder="Search or type new item..."
                    />
                    {/* Product match indicator */}
                    {r.item_name.trim() && matched && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-emerald-400">barang ada (Rp {matched.price.toLocaleString()}, stock: {matched.stock})</span>
                      </div>
                    )}
                    {r.item_name.trim() && !matched && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[11px] text-amber-400">Tambah sebagai produk baru</span>
                      </div>
                    )}
                  </div>

                  <datalist id="product-list">
                    {products.map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>

                  {/* Kategori + Jumlah */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Kategori</label>
                      <select
                        value={r.category}
                        onChange={e => updateRow(r.id, 'category', e.target.value)}
                        className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="product">Product</option>
                        <option value="consumable">Consumable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Jumlah</label>
                      <input
                        type="number"
                        value={r.quantity}
                        onChange={e => updateRow(r.id, 'quantity', e.target.value)}
                        className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
                        placeholder="0"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Harga Satuan + Tempat Beli */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Harga Satuan</label>
                      <input
                        type="number"
                        value={r.unit_price}
                        onChange={e => updateRow(r.id, 'unit_price', e.target.value)}
                        className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tempat Beli</label>
                      <input
                        type="text"
                        value={r.place_of_purchase}
                        onChange={e => updateRow(r.id, 'place_of_purchase', e.target.value)}
                        className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
                        placeholder="Toko..."
                      />
                    </div>
                  </div>

                  {/* Row total */}
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total: </span>
                    <span className="text-sm font-semibold text-amber-400 tabular-nums">{formatRp(total)}</span>
                  </div>
                </div>
              )
            })}

            {/* Add row button */}
            <button
              type="button"
              onClick={addRow}
              className="w-full h-9 rounded-lg border border-dashed border-zinc-600 hover:border-zinc-500 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              + Tambah Barang
            </button>

            {/* Grand total + submit */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div>
                <span className="text-xs text-slate-400">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
                <span className="ml-3 text-sm font-bold text-amber-400 tabular-nums">{formatRp(grandTotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-10 px-6 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 text-sm font-semibold transition-colors"
              >
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Riwayat Pembelian</h2>
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-xs text-slate-400 text-center">No purchase history.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/40">
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Item</th>
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Cat</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Qty</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Price</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Total</th>
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Place</th>
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {history.map(h => (
                      <tr key={h.id} className="hover:bg-slate-100/20 transition-colors">
                        <td className="px-3 py-2 text-xs text-slate-800">
                          {h.is_new_item && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 align-middle" />}
                          {h.item_name}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-400">{h.category}</td>
                        <td className="px-3 py-2 text-xs text-slate-700 text-right tabular-nums">{h.quantity}</td>
                        <td className="px-3 py-2 text-xs text-slate-700 text-right tabular-nums">{formatRp(h.unit_price)}</td>
                        <td className="px-3 py-2 text-xs text-amber-400 text-right tabular-nums font-medium">{formatRp(h.total_price)}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-400">{h.place_of_purchase || '—'}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">{new Date(h.created_at).toLocaleDateString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
