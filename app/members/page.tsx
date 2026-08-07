'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, Plus, Crown, Award, Star, Phone, Edit2, X, CheckCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

interface Member {
  id: number; name: string; phone: string; tier_name: string
  total_points: number; total_spent: number; visit_count: number
  rank: number; created_at: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function loadMembers(q?: string) {
    setLoading(true)
    const url = q ? `/api/member?ranking=1&search=${encodeURIComponent(q)}` : '/api/member?ranking=1'
    fetch(url)
      .then(r => r.json())
      .then(data => setMembers(data.members || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMembers() }, [])

  useEffect(() => {
    const t = setTimeout(() => loadMembers(search || undefined), 300)
    return () => clearTimeout(t)
  }, [search])

  function tierColor(tier: string) {
    switch (tier) {
      case 'Platinum': return { bg: '#ede9fd', color: '#7c5ce8', border: 'rgba(124,92,232,.3)' }
      case 'Gold': return { bg: '#fef2dc', color: '#d97706', border: 'rgba(217,119,6,.3)' }
      case 'Silver': return { bg: '#f1f5f9', color: '#64748b', border: 'rgba(100,116,139,.3)' }
      default: return { bg: '#f1f5f9', color: '#94a3b8', border: 'rgba(148,163,184,.3)' }
    }
  }

  function rankIcon(rank: number) {
    if (rank === 1) return <Crown className="w-4 h-4" style={{ color: '#d97706' }} />
    if (rank === 2) return <Award className="w-4 h-4" style={{ color: '#94a3b8' }} />
    if (rank === 3) return <Star className="w-4 h-4" style={{ color: '#cd7f32' }} />
    return <span className="text-xs font-mono w-4 text-center" style={{ color: '#8792a8' }}>{rank}</span>
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const method = editMember ? 'PUT' : 'POST'
      const body = editMember
        ? { id: editMember.id, name: formName, phone: formPhone, notes: formNotes }
        : { name: formName, phone: formPhone, notes: formNotes }

      const res = await fetch('/api/member', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan' })
        return
      }

      setMessage({ type: 'success', text: editMember ? 'Member berhasil diupdate!' : 'Member berhasil ditambahkan!' })
      setShowAdd(false); setEditMember(null)
      setFormName(''); setFormPhone(''); setFormNotes('')
      loadMembers()
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan' })
    } finally { setSaving(false) }
  }

  function openEdit(m: Member) {
    setEditMember(m); setFormName(m.name); setFormPhone(m.phone); setFormNotes(''); setShowAdd(true)
  }

  return (
    <div className="flex-1 flex flex-col min-h-full p-4 sm:p-6 space-y-6" style={{ background: '#f8f7fc' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#10224f' }}>
            <Users className="w-6 h-6" style={{ color: '#7c5ce8' }} />
            Pelanggan & Member
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7590' }}>
            {members.length} member terdaftar · Ranking berdasarkan total belanja
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-3" style={{ color: '#8792a8' }} />
            <input
              type="text"
              placeholder="Cari nama / no HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 h-10 pl-9 pr-3 bg-white border rounded-xl text-xs outline-none transition-colors focus:ring-2"
              style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'rgba(124,92,232,.2)' } as React.CSSProperties}
            />
          </div>
          <button
            onClick={() => { setEditMember(null); setFormName(''); setFormPhone(''); setFormNotes(''); setShowAdd(true) }}
            className="h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-2 shrink-0"
            style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2"
          style={message.type === 'success' ? { background: '#e4f5ee', color: '#0e7a57' } : { background: '#fdeaec', color: '#ef4444' }}>
          <CheckCircle className="w-4 h-4" /> {message.text}
        </div>
      )}

      {/* Member Table */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e9e6f2' }}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#7c5ce8', borderTopColor: 'transparent' }} />
            <p className="text-xs" style={{ color: '#6b7590' }}>Memuat data member...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#e9e6f2' }} />
            <p className="text-sm font-semibold" style={{ color: '#6b7590' }}>Belum ada member</p>
            <p className="text-xs mt-1" style={{ color: '#8792a8' }}>Member akan otomatis terdaftar saat input nomor HP di POS</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f8f7fc' }}>
                  <th className="text-left p-3 font-semibold" style={{ color: '#6b7590' }}>Rank</th>
                  <th className="text-left p-3 font-semibold" style={{ color: '#6b7590' }}>Nama</th>
                  <th className="text-left p-3 font-semibold" style={{ color: '#6b7590' }}>Telepon</th>
                  <th className="text-left p-3 font-semibold" style={{ color: '#6b7590' }}>Tier</th>
                  <th className="text-right p-3 font-semibold" style={{ color: '#6b7590' }}>Total Belanja</th>
                  <th className="text-right p-3 font-semibold" style={{ color: '#6b7590' }}>Kunjungan</th>
                  <th className="text-center p-3 font-semibold" style={{ color: '#6b7590' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const tc = tierColor(m.tier_name)
                  return (
                    <tr key={m.id} className="border-t hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                      <td className="p-3">{rankIcon(m.rank)}</td>
                      <td className="p-3">
                        <Link href={`/members/${m.id}`} className="font-bold hover:underline" style={{ color: '#10224f' }}>{m.name}</Link>
                      </td>
                      <td className="p-3 font-mono" style={{ color: '#6b7590' }}>{m.phone || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                          {m.tier_name}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold" style={{ color: '#10224f' }}>{formatRupiah(m.total_spent)}</td>
                      <td className="p-3 text-right font-mono" style={{ color: '#6b7590' }}>{m.visit_count}x</td>
                      <td className="p-3 text-center">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: '#7c5ce8' }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#10224f' }}>{editMember ? 'Edit Member' : 'Tambah Member Baru'}</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" style={{ color: '#6b7590' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Nama</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nama member"
                  className="w-full h-10 px-3 bg-white border rounded-lg text-xs outline-none focus:ring-2 mt-1"
                  style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'rgba(124,92,232,.2)' } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>No HP</label>
                <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="08xxxxxxxxxx"
                  className="w-full h-10 px-3 bg-white border rounded-lg text-xs outline-none focus:ring-2 mt-1"
                  style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'rgba(124,92,232,.2)' } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Catatan (Opsional)</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Preferensi, alergi, dll."
                  className="w-full h-16 px-3 py-2 bg-white border rounded-lg text-xs outline-none focus:ring-2 mt-1 resize-none"
                  style={{ borderColor: '#e9e6f2', color: '#10224f', '--tw-ring-color': 'rgba(124,92,232,.2)' } as React.CSSProperties} />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || !formPhone.trim()}
              className="w-full h-10 mt-4 rounded-lg text-white text-xs font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}>
              {saving ? 'Menyimpan...' : editMember ? 'Update Member' : 'Tambah Member'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
