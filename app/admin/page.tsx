'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, Check, Pencil, Trash2, Key, Shield, UserCheck, ShieldAlert } from 'lucide-react'
import QrisScannerModal from '../components/QrisScannerModal'

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
  base_salary?: number
  service_commission_type?: 'percent' | 'fixed'
  service_commission_val?: number
  product_commission_type?: 'percent' | 'fixed'
  product_commission_val?: number
}

type Tab = 'users' | 'services' | 'qris' | 'members' | 'products' | 'capsters'

import { formatRupiah as formatRp } from '@/lib/currency'

export default function AdminPage() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [capsters, setCapsters] = useState<Capster[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [memberSearch, setMemberSearch] = useState('')

  // Capster Salary & Commission Modal State
  const [showCapsterForm, setShowCapsterForm] = useState(false)
  const [editingCapster, setEditingCapster] = useState<Capster | null>(null)
  const [capsterName, setCapsterName] = useState('')
  const [capsterPhone, setCapsterPhone] = useState('')
  const [capsterBaseSalary, setCapsterBaseSalary] = useState('0')
  const [capsterServiceCommType, setCapsterServiceCommType] = useState<'percent' | 'fixed'>('percent')
  const [capsterServiceCommVal, setCapsterServiceCommVal] = useState('0')
  const [capsterProductCommType, setCapsterProductCommType] = useState<'percent' | 'fixed'>('percent')
  const [capsterProductCommVal, setCapsterProductCommVal] = useState('0')

  // QRIS Setting State & Scanner Modal
  const [qrisStaticPayload, setQrisStaticPayload] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Service Add & Edit State
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDuration, setServiceDuration] = useState('30')

  // User Add & Edit Modal State
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')
  const [formActive, setFormActive] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, sRes, qRes, mRes, cRes] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()).catch(() => ({ users: [] })),
        fetch('/api/services').then(r => r.json()).catch(() => ({ services: [] })),
        fetch('/api/admin/qris').then(r => r.json()).catch(() => ({ qris_static_payload: '' })),
        fetch('/api/member').then(r => r.json()).catch(() => ({ members: [] })),
        fetch('/api/admin/capsters').then(r => r.json()).catch(() => ({ capsters: [] }))
      ])
      
      if (uRes.users) setUsers(uRes.users)
      if (sRes.services) setServices(sRes.services)
      if (qRes.qris_static_payload) setQrisStaticPayload(qRes.qris_static_payload)
      if (mRes.members) setMembers(mRes.members)
      if (cRes.capsters) setCapsters(cRes.capsters)
      setProducts([
        { id: 1, name: 'Pomade Waterbased Altora', price: 85000, stock: 15, stock_threshold: 5, category: 'product' },
        { id: 2, name: 'Hair Tonic Gingseng', price: 65000, stock: 8, stock_threshold: 3, category: 'product' },
        { id: 3, name: 'Shampoo Barbershop 1L', price: 110000, stock: 4, stock_threshold: 2, category: 'consumable' }
      ])
    } catch (err) {
      console.error('Failed to load admin data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveQrisSetting = async (payloadToSave?: string) => {
    const val = payloadToSave || qrisStaticPayload
    setAlert(null)
    try {
      const res = await fetch('/api/admin/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qris_static_payload: val }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan QRIS setting')
      setAlert({ type: 'success', message: 'Pengaturan QRIS Merchant Statis berhasil disimpan!' })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menyimpan konfigurasi QRIS.' })
    }
  }

  const openAddService = () => {
    setEditingServiceId(null)
    setServiceName('')
    setServicePrice('')
    setServiceDuration('30')
    setShowServiceForm(true)
  }

  const openEditService = (s: Service) => {
    setEditingServiceId(s.id)
    setServiceName(s.name)
    setServicePrice(String(s.price))
    setServiceDuration(s.duration ? String(s.duration) : '30')
    setShowServiceForm(true)
  }

  const saveService = async () => {
    if (!serviceName.trim() || !servicePrice) {
      setAlert({ type: 'error', message: 'Nama layanan dan harga wajib diisi!' })
      return
    }
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingServiceId,
          name: serviceName.trim(),
          price: Number(servicePrice),
          duration: Number(serviceDuration) || 30
        })
      })
      if (!res.ok) throw new Error('Gagal menyimpan layanan')
      setShowServiceForm(false)
      fetchData()
      setAlert({ type: 'success', message: editingServiceId ? 'Layanan berhasil diperbarui!' : 'Layanan baru berhasil ditambahkan!' })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menyimpan data layanan.' })
    }
  }

  const openAddUser = () => {
    setEditingUser(null)
    setFormUsername('')
    setFormPassword('')
    setFormRole('user')
    setFormActive(true)
    setShowUserForm(true)
  }

  const openEditUser = (u: UserAccount) => {
    setEditingUser(u)
    setFormUsername(u.username)
    setFormPassword('')
    setFormRole(u.role)
    setFormActive(u.active)
    setShowUserForm(true)
  }

  const saveUser = async () => {
    const username = formUsername.trim()
    if (!username) {
      setAlert({ type: 'error', message: 'Username wajib diisi!' })
      return
    }
    if (!editingUser && !formPassword) {
      setAlert({ type: 'error', message: 'Password wajib diisi untuk user baru!' })
      return
    }
    setAlert(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser
          ? { id: editingUser.id, username, role: formRole, active: formActive, password: formPassword || undefined }
          : { username, password: formPassword, role: formRole }
        ),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan user')
      }
      setShowUserForm(false)
      fetchData()
      setAlert({ type: 'success', message: editingUser ? `User ${username} berhasil diperbarui!` : `User ${username} berhasil dibuat!` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan user.'
      setAlert({ type: 'error', message })
    }
  }

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user account "${username}"?`)) return
    setAlert(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menghapus user')
      }
      fetchData()
      setAlert({ type: 'success', message: `User "${username}" berhasil dihapus.` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus user.'
      setAlert({ type: 'error', message })
    }
  }
  const openAddCapster = () => {
    setEditingCapster(null)
    setCapsterName('')
    setCapsterPhone('')
    setCapsterBaseSalary('2500000')
    setCapsterServiceCommType('percent')
    setCapsterServiceCommVal('40')
    setCapsterProductCommType('percent')
    setCapsterProductCommVal('10')
    setShowCapsterForm(true)
  }

  const openEditCapster = (c: Capster) => {
    setEditingCapster(c)
    setCapsterName(c.name)
    setCapsterPhone(c.phone || '')
    setCapsterBaseSalary(String(c.base_salary || 0))
    setCapsterServiceCommType(c.service_commission_type || 'percent')
    setCapsterServiceCommVal(String(c.service_commission_val || 0))
    setCapsterProductCommType(c.product_commission_type || 'percent')
    setCapsterProductCommVal(String(c.product_commission_val || 0))
    setShowCapsterForm(true)
  }

  const saveCapster = async () => {
    if (!capsterName.trim()) {
      setAlert({ type: 'error', message: 'Nama Capster wajib diisi!' })
      return
    }
    setAlert(null)
    try {
      const res = await fetch('/api/admin/capsters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCapster?.id,
          name: capsterName.trim(),
          phone: capsterPhone.trim() || null,
          active: 1,
          base_salary: Number(capsterBaseSalary) || 0,
          service_commission_type: capsterServiceCommType,
          service_commission_val: Number(capsterServiceCommVal) || 0,
          product_commission_type: capsterProductCommType,
          product_commission_val: Number(capsterProductCommVal) || 0,
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan capster')
      setShowCapsterForm(false)
      fetchData()
      setAlert({ type: 'success', message: editingCapster ? `Pengaturan gaji Capster ${capsterName} berhasil diperbarui!` : `Capster ${capsterName} berhasil ditambahkan!` })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menyimpan data capster.' })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f7fc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">Memuat Admin Panel Altora ERP...</span>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Kelola User & Hak Akses' },
    { key: 'services', label: 'Layanan / Services' },
    { key: 'qris', label: 'Pengaturan QRIS' },
    { key: 'members', label: 'Members' },
    { key: 'products', label: 'Products' },
    { key: 'capsters', label: 'Capsters' },
  ]

  const filteredMembers = members.filter(m => 
    !memberSearch.trim() || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch)
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-x-hidden bg-[#f8f7fc] max-w-full">
      {/* QRIS Camera Scanner Modal */}
      <QrisScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(scannedPayload) => {
          setQrisStaticPayload(scannedPayload)
          saveQrisSetting(scannedPayload)
        }}
      />

      {/* Alert */}
      {alert && (
        <div className={`mx-4 sm:mx-6 mt-4 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg ${
          alert.type === 'success'
            ? 'bg-emerald-950/90 border border-emerald-800 text-emerald-300'
            : 'bg-red-950/90 border border-red-800 text-red-300'
        }`}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-3 text-slate-500 hover:text-slate-800 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-wider text-[#10224f] flex items-center gap-2">
            ADMIN PANEL ROME BOIS
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#7c5ce8]/15 text-[#7c5ce8] border border-[#7c5ce8]/30">
              ROME BOIS SYSTEM
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-[#6b7590]">Kelola Pengguna, Hak Akses Role, QRIS, HRIS Staff & Database</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={openAddUser} className="h-9 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-purple-500/10 self-start sm:self-auto flex items-center gap-1.5">
            <span>+ Tambah User Baru</span>
          </button>
        )}
        {activeTab === 'services' && (
          <button onClick={openAddService} className="h-9 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-purple-500/10 self-start sm:self-auto">
            + Tambah Service Baru
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 bg-white/30 px-4 sm:px-6 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3.5 py-3 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'text-purple-500 border-b-2 border-purple-500 bg-purple-500/5'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* USERS TAB WITH FULL EDIT & HAK AKSES */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Modal Form Edit/Add User */}
            {showUserForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span>{editingUser ? `Edit User: ${editingUser.username}` : 'Tambah User Account Baru'}</span>
                    </h3>
                    <button onClick={() => setShowUserForm(false)} className="text-slate-500 hover:text-slate-900">&times;</button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Username / Email Login</label>
                      <input
                        value={formUsername}
                        onChange={e => setFormUsername(e.target.value)}
                        className="w-full h-11 px-3.5 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/60 font-mono"
                        placeholder="contoh: kasir1 / kasir@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Password {editingUser && <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin ubah password)</span>}
                      </label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        className="w-full h-11 px-3.5 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/60 font-mono"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Role / Peran Akses</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
                        className="w-full h-11 px-3.5 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500/60"
                      >
                        <option value="user">User / Operator Kasir (POS Kasir & Transaksi)</option>
                        <option value="capster">Capster / Barber (Akses Portal Capster & Absensi)</option>
                        <option value="admin">Admin System (Akses Penuh Rome Bois System)</option>
                      </select>
                    </div>

                    {editingUser && (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Status Akun</label>
                        <select
                          value={formActive ? 'active' : 'inactive'}
                          onChange={e => setFormActive(e.target.value === 'active')}
                          className="w-full h-11 px-3.5 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500/60"
                        >
                          <option value="active">● Aktif (Bisa Login)</option>
                          <option value="inactive">○ Non-Aktif (Di-Blokir)</option>
                        </select>
                      </div>
                    )}

                    {/* Informasi Hak Akses Role */}
                    <div className="p-3.5 rounded-2xl bg-[#f8f7fc] border border-slate-200 space-y-1 text-[11px] text-slate-500">
                      <div className="font-bold text-purple-500 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Penjelasan Hak Akses Role:</span>
                      </div>
                      {formRole === 'admin' ? (
                        <p className="text-slate-700">
                          👑 <strong>Admin</strong>: Memiliki akses 100% penuh ke POS Kasir, Laporan Omset, Pengaturan QRIS, Manajemen User, Edit Layanan, dan Stok Produk.
                        </p>
                      ) : (
                        <p className="text-slate-700">
                          💈 <strong>User / Kasir</strong>: Memiliki akses ke POS Kasir (`/store`), Reservasi Antrian Cukur (`/queue`), dan Riwayat Belanja. *Tidak bisa mengakses Admin Panel.*
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowUserForm(false)} className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Batal</button>
                    <button onClick={saveUser} className="flex-1 h-11 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-bold shadow-lg shadow-purple-500/20">Simpan User</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Pengguna */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-white/80 text-slate-500 text-xs font-semibold">
                    <th className="p-3.5">Username / Login</th>
                    <th className="p-3.5">Role / Peran</th>
                    <th className="p-3.5">Hak Akses Menu</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-900">{u.username}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                          u.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-500">
                        {u.role === 'admin' ? 'Akses Full ERP + Admin Settings' : 'POS Kasir + Queue Antrian'}
                      </td>
                      <td className="p-3.5 text-center">
                        {u.active ? (
                          <span className="text-emerald-400 font-bold text-[11px]">● Aktif</span>
                        ) : (
                          <span className="text-slate-400 font-bold text-[11px]">○ Non-Aktif</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-purple-500 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.username)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-950 text-slate-500 hover:text-red-400 text-xs transition-colors"
                            title="Hapus Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QRIS SETTING TAB WITH CAMERA SCANNER */}
        {activeTab === 'qris' && (
          <div className="max-w-2xl bg-white/80 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Pengaturan QRIS Merchant Dinamis</h3>
              <p className="text-xs text-slate-500">
                Masukkan Kode QRIS Statis Merchant (NMID payload dari verssache/qris-dinamis) atau **Scan QRIS melalui kamera**.
              </p>
            </div>

            {/* Scan via Camera Button */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-500 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Scan QRIS dari Kamera</h4>
                  <p className="text-[11px] text-slate-500">Buka kamera untuk scan QRIS merchant secara langsung</p>
                </div>
              </div>
              <button
                onClick={() => setScannerOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">QRIS Static Payload String</label>
              <textarea
                value={qrisStaticPayload}
                onChange={(e) => setQrisStaticPayload(e.target.value)}
                rows={4}
                className="w-full p-3.5 bg-[#f8f7fc]/80 border border-slate-200 rounded-xl text-xs font-mono text-purple-500 placeholder-slate-400 focus:outline-none focus:border-purple-500/60 resize-none"
                placeholder="00020101021126670016ID.CO.QRIS.WWW..."
              />
            </div>

            <button
              onClick={() => saveQrisSetting()}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-purple-500/10"
            >
              Simpan Configuration QRIS
            </button>
          </div>
        )}

        {/* SERVICES TAB WITH ADD AND EDIT */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {showServiceForm && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-bold text-purple-500">
                  {editingServiceId ? 'Edit Layanan Cukur' : 'Tambah Service / Layanan Cukur Baru'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Layanan</label>
                    <input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. Smoothing Hair Treatment"
                      className="w-full h-10 px-3 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="60000"
                      className="w-full h-10 px-3 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Estimasi Durasi (Menit)</label>
                    <input
                      type="number"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(e.target.value)}
                      placeholder="30"
                      className="w-full h-10 px-3 bg-[#f8f7fc] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowServiceForm(false)} className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Batal</button>
                  <button onClick={saveService} className="h-9 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-zinc-950 text-xs font-bold">Simpan Layanan</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-white/80 text-slate-500 text-xs font-semibold">
                    <th className="p-3.5">Nama Layanan</th>
                    <th className="p-3.5 text-right">Harga</th>
                    <th className="p-3.5 text-right">Durasi</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-slate-800">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{s.name}</td>
                      <td className="p-3.5 text-right font-mono text-purple-500 font-bold">{formatRp(s.price)}</td>
                      <td className="p-3.5 text-right font-mono text-slate-500">{s.duration || 30} Menit</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => openEditService(s)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-purple-500 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEMBERS TAB DATA */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Cari Member berdasarkan nama atau HP..."
              className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500/50"
            />
            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-white/80 text-slate-500 text-xs font-semibold">
                    <th className="p-3.5">Nama Pelanggan</th>
                    <th className="p-3.5">Nomor HP</th>
                    <th className="p-3.5">Tier Member</th>
                    <th className="p-3.5 text-right">Poin</th>
                    <th className="p-3.5 text-right">Total Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs text-slate-800">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-100/40">
                      <td className="p-3.5 font-bold">{m.name}</td>
                      <td className="p-3.5 font-mono text-slate-500">{m.phone}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/20 text-purple-500 border border-purple-500/30">
                          {m.tier_name || 'Silver'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-400 font-bold">{m.total_points} Pts</td>
                      <td className="p-3.5 text-right font-mono">{formatRp(m.total_spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB DATA */}
        {activeTab === 'products' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 bg-white/80 text-slate-500 text-xs font-semibold">
                  <th className="p-3.5">Nama Produk</th>
                  <th className="p-3.5 text-right">Harga</th>
                  <th className="p-3.5 text-right">Stok</th>
                  <th className="p-3.5">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs text-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-100/40">
                    <td className="p-3.5 font-bold">{p.name}</td>
                    <td className="p-3.5 text-right font-mono text-purple-500 font-bold">{formatRp(p.price)}</td>
                    <td className="p-3.5 text-right font-mono">{p.stock} Pcs</td>
                    <td className="p-3.5 uppercase text-[10px] font-bold text-slate-500">{p.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CAPSTERS TAB DATA */}
        {activeTab === 'capsters' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="border-b border-slate-200 bg-white/80 text-slate-500 text-xs font-semibold">
                  <th className="p-3.5">Nama Capster</th>
                  <th className="p-3.5">Nomor HP</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs text-slate-800">
                {capsters.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-100/40">
                    <td className="p-3.5 font-bold">{c.name}</td>
                    <td className="p-3.5 font-mono text-slate-500">{c.phone || '—'}</td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">● Active</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
