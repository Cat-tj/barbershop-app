'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Phone, Calendar, ShoppingBag, Star, Clock, TrendingUp } from 'lucide-react'
import { formatRupiah } from '@/lib/currency'

interface MemberDetail {
  id: number; name: string; phone: string; tier_name?: string
  total_points: number; total_spent: number; visit_count: number
  notes: string | null; created_at: string
  orders: Array<{
    id: number; total: number; payment_method: string; created_at: string; items: string
  }>
  last_haircut: string | null
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/member?id=${params.id}`)
      .then(r => r.json())
      .then(data => setMember(data))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#f8f7fc' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#7c5ce8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: '#f8f7fc' }}>
        <p className="text-sm" style={{ color: '#6b7590' }}>Member tidak ditemukan</p>
        <button onClick={() => router.back()} className="mt-4 text-xs font-bold" style={{ color: '#7c5ce8' }}>Kembali</button>
      </div>
    )
  }

  const tier = member.total_spent >= 1000000 ? 'Platinum' : member.total_spent >= 500000 ? 'Gold' : member.total_spent >= 200000 ? 'Silver' : 'Bronze'
  const daysSinceJoin = Math.floor((Date.now() - new Date(member.created_at).getTime()) / 86400000)
  const lastH = member.last_haircut ? new Date(member.last_haircut) : null
  const daysSinceHaircut = lastH ? Math.floor((Date.now() - lastH.getTime()) / 86400000) : null

  return (
    <div className="flex-1 flex flex-col min-h-full p-4 sm:p-6 space-y-6" style={{ background: '#f8f7fc' }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-white border" style={{ borderColor: '#e9e6f2' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#10224f' }} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg" style={{ background: 'linear-gradient(135deg, #6344c0, #7c5ce8)' }}>
            {member.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#10224f' }}>{member.name}</h1>
            <p className="text-xs flex items-center gap-1" style={{ color: '#6b7590' }}>
              <Phone className="w-3 h-3" /> {member.phone} · {tier} Member
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e9e6f2' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#7c5ce8' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Total Belanja</span>
          </div>
          <p className="text-lg font-bold font-mono" style={{ color: '#10224f' }}>{formatRupiah(member.total_spent)}</p>
        </div>
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e9e6f2' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4" style={{ color: '#0e7a57' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Kunjungan</span>
          </div>
          <p className="text-lg font-bold" style={{ color: '#10224f' }}>{member.visit_count}x</p>
        </div>
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e9e6f2' }}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4" style={{ color: '#d97706' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Poin</span>
          </div>
          <p className="text-lg font-bold" style={{ color: '#10224f' }}>{member.total_points}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: daysSinceHaircut !== null && daysSinceHaircut > 30 ? '#ef4444' : '#e9e6f2', background: daysSinceHaircut !== null && daysSinceHaircut > 30 ? '#fdeaec' : 'white' }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: daysSinceHaircut !== null && daysSinceHaircut > 30 ? '#ef4444' : '#0e7a57' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6b7590' }}>Terakhir Cukur</span>
          </div>
          <p className="text-lg font-bold" style={{ color: daysSinceHaircut !== null && daysSinceHaircut > 30 ? '#ef4444' : '#10224f' }}>
            {daysSinceHaircut !== null ? `${daysSinceHaircut} hari lalu` : 'Belum pernah'}
          </p>
          {daysSinceHaircut !== null && daysSinceHaircut > 30 && (
            <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>⚠ Sudah lama tidak potong</p>
          )}
        </div>
      </div>

      {/* Info & Notes */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e9e6f2' }}>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4" style={{ color: '#7c5ce8' }} />
          <h3 className="text-xs font-bold" style={{ color: '#10224f' }}>Informasi Member</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span style={{ color: '#6b7590' }}>Tanggal Bergabung</span>
            <p className="font-semibold" style={{ color: '#10224f' }}>{new Date(member.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <span style={{ color: '#6b7590' }}>Tier Saat Ini</span>
            <p className="font-semibold" style={{ color: '#7c5ce8' }}>{tier}</p>
          </div>
          <div className="col-span-2">
            <span style={{ color: '#6b7590' }}>Catatan</span>
            <p className="font-semibold" style={{ color: '#10224f' }}>{member.notes || 'Tidak ada catatan'}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e9e6f2' }}>
        <div className="p-5 border-b" style={{ borderColor: '#e9e6f2' }}>
          <h3 className="text-xs font-bold" style={{ color: '#10224f' }}>Riwayat Transaksi ({member.orders.length})</h3>
        </div>
        {member.orders.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2" style={{ color: '#e9e6f2' }} />
            <p className="text-xs" style={{ color: '#6b7590' }}>Belum ada transaksi</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
            {member.orders.map(o => (
              <div key={o.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#10224f' }}>Order #{o.id}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8792a8' }}>
                    {new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6b7590' }}>{o.items?.replace(/:/g, ' · ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono" style={{ color: '#10224f' }}>{formatRupiah(o.total)}</p>
                  <p className="text-[10px] uppercase font-semibold" style={{ color: '#8792a8' }}>{o.payment_method}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
