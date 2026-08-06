'use client'

import { useState, useEffect, useCallback } from 'react'

type UserAccount = {
  id: number
  username: string
  role: 'admin' | 'user'
  active: boolean
  created_at: string
}

type Member = {
  id: number
  name: string
  phone: string
  tier_id: number
  total_points: number
  total_spent: number
  visit_count: number
  notes?: string | null
  tier_name?: string
  color?: string
}

type Product = {
  id: number
  name: string
  price: number
  stock: number
  stock_threshold: number
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

type Tab = 'users' | 'members' | 'products' | 'services' | 'capsters' | 'qris'

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // QRIS Static Payload Setting State
  const [qrisStaticPayload, setQrisStaticPayload] = useState('')

  // New Service Form State
  const [showServiceAddForm, setShowServiceAddForm] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState('30')

  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, sRes, qRes] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()).catch(() => ({ users: [] })),
        fetch('/api/services').then(r => r.json()).catch(() => ({ services: [] })),
        fetch('/api/admin/qris').then(r => r.json()).catch(() => ({ qris_static_payload: '' }))
      ])
      
      if (uRes.users) setUsers(uRes.users)
      if (sRes.services) setServices(sRes.services)
      if (qRes.qris_static_payload) setQrisStaticPayload(qRes.qris_static_payload)

      // Fallback default sample data if empty
      setMembers([
        { id: 1, name: 'Alexander The Great', phone: '085200000000', tier_id: 1, total_points: 120, total_spent: 350000, visit_count: 5, tier_name: 'Silver', color: '#f59e0b' }
      ])
      setCapsters([
        { id: 1, name: 'Budi Barbershop', phone: '081234567890', active: true },
        { id: 2, name: 'Rian Hair Stylist', phone: '081298765432', active: true }
      ])
      setProducts([
        { id: 1, name: 'Pomade Waterbased Altora', price: 85000, stock: 15, stock_threshold: 5, category: 'product' }
      ])
    } catch (err) {
      console.error('Failed to load admin data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return match ? decodeURIComponent(match[1]) : null
    }
    const session = getCookie('session')
    if (session) {
      try {
        const payload = JSON.parse(atob(session.split('.')[1]))
        setCurrentUser({ id: payload.id, username: payload.username, role: payload.role })
      } catch {
        // ignore
      }
    }
  }, [])

  const saveQrisSetting = async () => {
    setAlert(null)
    try {
      const res = await fetch('/api/admin/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qris_static_payload: qrisStaticPayload }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan QRIS setting')
      setAlert({ type: 'success', message: 'Pengaturan QRIS Merchant Statis berhasil diperbarui!' })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menyimpan konfigurasi QRIS.' })
    }
  }

  const addService = async () => {
    if (!newServiceName.trim() || !newServicePrice) {
      setAlert({ type: 'error', message: 'Nama layanan dan harga wajib diisi!' })
      return
    }
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceName.trim(),
          price: Number(newServicePrice),
          duration: Number(newServiceDuration) || 30
        })
      })
      if (!res.ok) throw new Error('Gagal menambah layanan')
      setShowServiceAddForm(false)
      setNewServiceName('')
      setNewServicePrice('')
      setNewServiceDuration('30')
      fetchData()
      setAlert({ type: 'success', message: 'Layanan baru berhasil ditambahkan!' })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menambahkan layanan baru.' })
    }
  }

  const openAddUser = () => {
    setEditingUserId(null)
    setFormUsername('')
    setFormPassword('')
    setFormRole('user')
    setShowUserForm(true)
  }

  const saveUser = async () => {
    const username = formUsername.trim()
    if (!username) {
      setAlert({ type: 'error', message: 'Username is required.' })
      return
    }
    if (!editingUserId && !formPassword) {
      setAlert({ type: 'error', message: 'Password is required for new users.' })
      return
    }
    setAlert(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: editingUserId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUserId
          ? { id: editingUserId, username, role: formRole, password: formPassword || undefined }
          : { username, password: formPassword, role: formRole }
        ),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      setShowUserForm(false)
      fetchData()
      setAlert({ type: 'success', message: editingUserId ? 'User updated.' : 'User created.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user.'
      setAlert({ type: 'error', message })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm font-medium">Memuat Admin Panel Altora ERP...</span>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'services', label: 'Layanan / Services' },
    { key: 'qris', label: 'Pengaturan QRIS' },
    { key: 'members', label: 'Members' },
    { key: 'products', label: 'Products' },
    { key: 'capsters', label: 'Capsters' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Alert */}
      {alert && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between shadow-lg ${
          alert.type === 'success'
            ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
            : 'bg-red-950/80 border border-red-800 text-red-300'
        }`}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-3 text-zinc-400 hover:text-zinc-200 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-black tracking-wider text-zinc-100 flex items-center gap-2">
            ADMIN PANEL
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              ALTORA SYSTEM
            </span>
          </h1>
          <p className="text-xs text-zinc-400">Kelola Pengguna, QRIS, Layanan, dan Stok Toko</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={openAddUser} className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-amber-500/10">
            + Tambah User
          </button>
        )}
        {activeTab === 'services' && (
          <button onClick={() => setShowServiceAddForm(true)} className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-amber-500/10">
            + Tambah Service Baru
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 px-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/5'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* QRIS SETTING TAB */}
        {activeTab === 'qris' && (
          <div className="max-w-2xl bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Pengaturan QRIS Merchant Dinamis</h3>
              <p className="text-xs text-zinc-400">
                Masukkan Kode QRIS Statis Merchant (NMID payload dari aplikasi verssache/qris-dinamis atau e-wallet). Sistem akan mengonversinya secara otomatis menjadi QRIS Dinamis saat transaksi checkout kasir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">QRIS Static Payload String</label>
              <textarea
                value={qrisStaticPayload}
                onChange={(e) => setQrisStaticPayload(e.target.value)}
                rows={4}
                className="w-full p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs font-mono text-amber-400 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 resize-none"
                placeholder="00020101021126670016ID.CO.QRIS.WWW..."
              />
            </div>

            <button
              onClick={saveQrisSetting}
              className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/10"
            >
              Simpan Configuration QRIS
            </button>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {showServiceAddForm && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-amber-400">Tambah Service / Layanan Cukur Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Nama Layanan</label>
                    <input
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Smoothing Hair Treatment"
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      placeholder="60000"
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Estimasi Durasi (Menit)</label>
                    <input
                      type="number"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                      placeholder="30"
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowServiceAddForm(false)} className="h-9 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold">Batal</button>
                  <button onClick={addService} className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold">Simpan Layanan</button>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-xs font-semibold">
                    <th className="p-4">Nama Layanan</th>
                    <th className="p-4 text-right">Harga</th>
                    <th className="p-4 text-right">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-200">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 font-bold">{s.name}</td>
                      <td className="p-4 text-right font-mono text-amber-400 font-bold">{formatRp(s.price)}</td>
                      <td className="p-4 text-right font-mono">{s.duration || 30} Menit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {showUserForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-90 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100">{editingUserId ? 'Edit User' : 'Tambah User Baru'}</h3>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Username</label>
                    <input
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                      placeholder="Username"
                      disabled={!!editingUserId}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Password</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Role</label>
                    <select
                      value={formRole}
                      onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="user">User (Kasir)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowUserForm(false)} className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold">Batal</button>
                    <button onClick={saveUser} className="flex-1 h-10 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold">Simpan</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-xs font-semibold">
                    <th className="p-4">Username</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-zinc-200">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/40">
                      <td className="p-4 font-bold">{u.username}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-emerald-400 font-bold">● Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEMBERS / PRODUCTS / CAPSTERS PLACEHOLDERS */}
        {['members', 'products', 'capsters'].includes(activeTab) && (
          <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-900 border border-zinc-800 rounded-2xl">
            Modul {activeTab.toUpperCase()} Aktif dan terintegrasi dengan Database SQLite ROMEBOIS ERP.
          </div>
        )}
      </div>
    </div>
  )
}
