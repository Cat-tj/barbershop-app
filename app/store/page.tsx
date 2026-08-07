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

type Service = {
  id: number
  name: string
  price: number
  duration: number | null
}

type Capster = {
  id: number
  name: string
  phone: string | null
  active: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

import { formatRupiah as formatRp } from '@/lib/currency'

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function StorePage() {
  /* ---- data ------------------------------------------------------ */
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- UI state -------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'capsters'>('products')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /* ---- form fields ----------------------------------------------- */
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formCategory, setFormCategory] = useState<'product' | 'consumable'>('product')
  const [formDuration, setFormDuration] = useState('')
  const [formCapsterName, setFormCapsterName] = useState('')
  const [formCapsterPhone, setFormCapsterPhone] = useState('')

  /* ---- delete confirmation --------------------------------------- */
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null)

  /* ---- fetch on mount -------------------------------------------- */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, cRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
        supabase.from('capsters').select('*').order('name'),
      ])
      if (pRes.data) setProducts(pRes.data)
      if (sRes.data) setServices(sRes.data)
      if (cRes.data) setCapsters(cRes.data)
    } catch (err) {
      console.error('Failed to load store data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ---- reset form ------------------------------------------------ */
  const resetForm = () => {
    setFormName('')
    setFormPrice('')
    setFormStock('')
    setFormCategory('product')
    setFormDuration('')
    setFormCapsterName('')
    setFormCapsterPhone('')
    setEditingId(null)
    setShowForm(false)
  }

  /* ---- open edit ------------------------------------------------- */
  const openEditProduct = (p: Product) => {
    setEditingId(p.id)
    setFormName(p.name)
    setFormPrice(String(p.price))
    setFormStock(String(p.stock))
    setFormCategory(p.category)
    setShowForm(true)
  }

  const openEditService = (s: Service) => {
    setEditingId(s.id)
    setFormName(s.name)
    setFormPrice(String(s.price))
    setFormDuration(s.duration ? String(s.duration) : '')
    setShowForm(true)
  }

  /* ---- save ------------------------------------------------------ */
  const saveProduct = async () => {
    const name = formName.trim()
    const price = Number(formPrice)
    const stock = Number(formStock)
    if (!name || isNaN(price) || isNaN(stock)) {
      setAlert({ type: 'error', message: 'Please fill all required fields.' })
      return
    }
    setAlert(null)
    try {
      if (editingId) {
        await supabase.from('products').update({ name, price, stock, category: formCategory }).eq('id', editingId)
      } else {
        await supabase.from('products').insert({ name, price, stock, category: formCategory })
      }
      resetForm()
      fetchAll()
      setAlert({ type: 'success', message: editingId ? 'Product updated.' : 'Product added.' })
    } catch {
      setAlert({ type: 'error', message: 'Failed to save product.' })
    }
  }

  const saveService = async () => {
    const name = formName.trim()
    const price = Number(formPrice)
    const duration = formDuration ? Number(formDuration) : null
    if (!name || isNaN(price)) {
      setAlert({ type: 'error', message: 'Please fill all required fields.' })
      return
    }
    setAlert(null)
    try {
      if (editingId) {
        await supabase.from('services').update({ name, price, duration }).eq('id', editingId)
      } else {
        await supabase.from('services').insert({ name, price, duration })
      }
      resetForm()
      fetchAll()
      setAlert({ type: 'success', message: editingId ? 'Service updated.' : 'Service added.' })
    } catch {
      setAlert({ type: 'error', message: 'Failed to save service.' })
    }
  }

  const saveCapster = async () => {
    const name = formCapsterName.trim()
    if (!name) {
      setAlert({ type: 'error', message: 'Name is required.' })
      return
    }
    setAlert(null)
    try {
      if (editingId) {
        await supabase.from('capsters').update({ name, phone: formCapsterPhone.trim() || null }).eq('id', editingId)
      } else {
        await supabase.from('capsters').insert({ name, phone: formCapsterPhone.trim() || null, active: true })
      }
      setFormCapsterName('')
      setFormCapsterPhone('')
      setEditingId(null)
      fetchAll()
      setAlert({ type: 'success', message: editingId ? 'Capster updated.' : 'Capster added.' })
    } catch {
      setAlert({ type: 'error', message: 'Failed to save capster.' })
    }
  }

  /* ---- toggle capster active ------------------------------------- */
  const toggleCapsterActive = async (c: Capster) => {
    try {
      await supabase.from('capsters').update({ active: !c.active }).eq('id', c.id)
      fetchAll()
    } catch {
      setAlert({ type: 'error', message: 'Failed to update capster.' })
    }
  }

  /* ---- delete ---------------------------------------------------- */
  const confirmDelete = (type: string, id: number, name: string) => {
    setDeleteTarget({ type, id, name })
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    try {
      const table = deleteTarget.type === 'product' ? 'products' : deleteTarget.type === 'service' ? 'services' : 'capsters'
      await supabase.from(table).delete().eq('id', deleteTarget.id)
      setDeleteTarget(null)
      fetchAll()
      setAlert({ type: 'success', message: `${deleteTarget.type} deleted.` })
    } catch {
      setAlert({ type: 'error', message: 'Failed to delete.' })
    }
  }

  /* ---- open add -------------------------------------------------- */
  const openAdd = () => {
    resetForm()
  }

  /* ---- loading --------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading store…</span>
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white border border-slate-200 rounded-xl p-5 w-80 space-y-4">
            <p className="text-sm text-slate-800">
              Delete <span className="font-semibold text-purple-500">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-9 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-700 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h1 className="text-base font-bold tracking-tight text-slate-900">Store</h1>
        <button
          onClick={openAdd}
          className="h-9 px-4 rounded-lg bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-semibold transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['products', 'services', 'capsters'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); resetForm() }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'text-purple-500 border-b-2 border-purple-500 bg-slate-100/40'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ---- Products Tab ---- */}
        {activeTab === 'products' && (
          <>
            {/* Inline form */}
            {showForm && (
              <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Name *</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="Product name" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as 'product' | 'consumable')} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-purple-500/50">
                      <option value="product">Product</option>
                      <option value="consumable">Consumable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price *</label>
                    <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stock *</label>
                    <input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="0" min="0" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProduct} className="flex-1 h-9 rounded-lg bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-semibold transition-colors">{editingId ? 'Update' : 'Save'}</button>
                  <button onClick={resetForm} className="h-9 px-4 rounded-lg bg-slate-200 hover:bg-zinc-600 text-slate-700 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {/* Products table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Stock</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {products.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-slate-400">No products yet.</td></tr>
                  )}
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <button onClick={() => openEditProduct(p)} className="text-xs font-medium text-slate-800 hover:text-purple-500 text-left transition-colors">{p.name}</button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 text-right tabular-nums">{formatRp(p.price)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 text-right tabular-nums">{p.stock}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${p.category === 'product' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>{p.category}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => confirmDelete('product', p.id, p.name)} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors text-sm">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---- Services Tab ---- */}
        {activeTab === 'services' && (
          <>
            {showForm && (
              <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Name *</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="Service name" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Duration (min)</label>
                    <input type="number" value={formDuration} onChange={e => setFormDuration(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="30" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price *</label>
                    <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="0" min="0" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveService} className="flex-1 h-9 rounded-lg bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-semibold transition-colors">{editingId ? 'Update' : 'Save'}</button>
                  <button onClick={resetForm} className="h-9 px-4 rounded-lg bg-slate-200 hover:bg-zinc-600 text-slate-700 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Duration</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {services.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">No services yet.</td></tr>
                  )}
                  {services.map(s => (
                    <tr key={s.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <button onClick={() => openEditService(s)} className="text-xs font-medium text-slate-800 hover:text-purple-500 text-left transition-colors">{s.name}</button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 text-right tabular-nums">{formatRp(s.price)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 text-right tabular-nums">{s.duration ? `${s.duration} min` : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => confirmDelete('service', s.id, s.name)} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors text-sm">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---- Capsters Tab ---- */}
        {activeTab === 'capsters' && (
          <>
            {/* Add capster form */}
            <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name *</label>
                  <input value={formCapsterName} onChange={e => setFormCapsterName(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="Capster name" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                  <input value={formCapsterPhone} onChange={e => setFormCapsterPhone(e.target.value)} className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50" placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <button onClick={saveCapster} className="w-full h-9 rounded-lg bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-semibold transition-colors">Add Capster</button>
            </div>

            {/* Capsters list */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-400 uppercase">Phone</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-slate-400 uppercase">Active</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {capsters.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">No capsters yet.</td></tr>
                  )}
                  {capsters.map(c => (
                    <tr key={c.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-medium text-slate-800">{c.name}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{c.phone || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggleCapsterActive(c)}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${
                            c.active ? 'bg-emerald-600' : 'bg-zinc-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            c.active ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => confirmDelete('capster', c.id, c.name)} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors text-sm">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
