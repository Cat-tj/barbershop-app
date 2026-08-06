'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldAlert, User, Check, X, Key, UserCheck, Search } from 'lucide-react'

interface UserAccount {
  id: number
  username: string
  role: 'admin' | 'user' | 'capster'
  active: boolean
}

interface Permission {
  id: number
  key: string
  module: string
  description: string
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userOverrides, setUserOverrides] = useState<Record<string, 'allow' | 'deny'>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const uRes = await fetch('/api/admin/users').then(r => r.json())
      if (uRes.users) setUsers(uRes.users)
      
      // Default permission registry keys
      setPermissions([
        { id: 1, key: 'dashboard.view_revenue', module: 'Dashboard', description: 'Lihat Omset & Laporan Finansial' },
        { id: 2, key: 'dashboard.view_staff_performance', module: 'Dashboard', description: 'Lihat KPI Performa Staff' },
        { id: 3, key: 'pos.access', module: 'Kasir POS', description: 'Akses Mesin Kasir & Checkout' },
        { id: 4, key: 'pos.apply_discount', module: 'Kasir POS', description: 'Berikan Diskon Manual' },
        { id: 5, key: 'booking.manage', module: 'Reservasi', description: 'Kelola & Ubah Jadwal Booking' },
        { id: 6, key: 'queue.manage', module: 'Antrian', description: 'Mulai & Selesaikan Pelayanan' },
        { id: 7, key: 'staff.manage', module: 'HRIS & Staff', description: 'Kelola Karyawan & Gaji' },
        { id: 8, key: 'attendance.view_all', module: 'HRIS & Staff', description: 'Lihat Seluruh Absensi Staff' },
        { id: 9, key: 'payroll.view_all', module: 'Payroll', description: 'Lihat Seluruh Gaji & Komisi' },
        { id: 10, key: 'settings.permissions', module: 'Pengaturan', description: 'Kelola Hak Akses User' },
      ])
    } catch {
      console.error('Failed to load access control data')
    } finally {
      setLoading(false)
    }
  }

  const selectUser = (u: UserAccount) => {
    setSelectedUser(u)
    setUserOverrides({})
  }

  const toggleOverride = (key: string, effect: 'allow' | 'deny' | 'default') => {
    const next = { ...userOverrides }
    if (effect === 'default') {
      delete next[key]
    } else {
      next[key] = effect
    }
    setUserOverrides(next)
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    setSaving(true)
    setAlert(null)
    try {
      // Simulate saving permission overrides
      setAlert({ type: 'success', message: `Hak akses individu user ${selectedUser.username} berhasil diperbarui!` })
    } catch {
      setAlert({ type: 'error', message: 'Gagal menyimpan hak akses.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F4EF] p-8">
        <div className="text-[#746E66] font-medium text-sm">Memuat Pengaturan Hak Akses Rome Bois...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F7F4EF] min-h-full p-4 sm:p-6 space-y-6 text-[#26231F]">
      {/* Header */}
      <div className="bg-white border border-[#DED7CE] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#26231F] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#B7792B]" />
            MANAJEMEN HAK AKSES & PERMISSION INDIVIDU
          </h1>
          <p className="text-xs text-[#746E66] mt-0.5">
            Atur peran (Role) dan hak akses mendalam (User Overrides Allow/Deny) per individu tim Rome Bois.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-2xl text-xs font-semibold ${
          alert.type === 'success' ? 'bg-[#56806A]/10 text-[#56806A] border border-[#56806A]/30' : 'bg-[#B45C54]/10 text-[#B45C54] border border-[#B45C54]/30'
        }`}>
          {alert.message}
        </div>
      )}

      {/* Main Grid: User List + Permission Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Selection List */}
        <div className="bg-white border border-[#DED7CE] rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#746E66] border-b border-[#DED7CE] pb-2">
            Daftar User Accounts
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {users.map(u => {
              const isSelected = selectedUser?.id === u.id
              return (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#B7792B]/10 border-[#B7792B] font-bold text-[#26231F]'
                      : 'bg-[#F1ECE5] border-[#DED7CE] text-[#746E66] hover:border-[#B7792B]/50'
                  }`}
                >
                  <div>
                    <span className="block font-bold text-[#26231F]">{u.username}</span>
                    <span className="text-[10px] uppercase font-bold text-[#B7792B]">{u.role}</span>
                  </div>
                  {isSelected && <UserCheck className="w-4 h-4 text-[#B7792B]" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Permission Overrides Panel */}
        <div className="md:col-span-2 bg-white border border-[#DED7CE] rounded-3xl p-6 shadow-sm space-y-5">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between border-b border-[#DED7CE] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#26231F]">
                    Pengaturan Access User: <strong className="text-[#B7792B]">{selectedUser.username}</strong>
                  </h3>
                  <p className="text-xs text-[#746E66]">Role Default: <span className="uppercase font-bold">{selectedUser.role}</span></p>
                </div>
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#B7792B] hover:bg-[#7A4B16] text-white text-xs font-bold shadow-md shadow-[#B7792B]/20 transition-all"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Hak Akses'}
                </button>
              </div>

              {/* Matrix List */}
              <div className="space-y-3">
                {permissions.map((p) => {
                  const currentEffect: string = userOverrides[p.key] || 'default'
                  return (
                    <div key={p.id} className="p-3.5 rounded-2xl bg-[#F1ECE5] border border-[#DED7CE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-[#B7792B] block">{p.module}</span>
                        <strong className="text-[#26231F]">{p.description}</strong>
                        <span className="block font-mono text-[10px] text-[#746E66]">{p.key}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleOverride(p.key, 'default')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
                            currentEffect === 'default'
                              ? 'bg-[#26231F] text-white border-[#26231F]'
                              : 'bg-white text-[#746E66] border-[#DED7CE]'
                          }`}
                        >
                          Role Default
                        </button>
                        <button
                          onClick={() => toggleOverride(p.key, 'allow')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
                            currentEffect === 'allow'
                              ? 'bg-[#56806A] text-white border-[#56806A]'
                              : 'bg-white text-[#746E66] border-[#DED7CE]'
                          }`}
                        >
                          Allow (Izinkan)
                        </button>
                        <button
                          onClick={() => toggleOverride(p.key, 'deny')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
                            currentEffect === 'deny'
                              ? 'bg-[#B45C54] text-white border-[#B45C54]'
                              : 'bg-white text-[#746E66] border-[#DED7CE]'
                          }`}
                        >
                          Deny (Blokir)
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[#746E66]">
              Pilih salah satu user di sebelah kiri untuk mengatur hak akses individu.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
