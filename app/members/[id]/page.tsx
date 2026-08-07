'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface MemberDetail {
  id: number
  name: string
  phone: string
  tier_id: number
  total_points: number
  total_spent: number
  visit_count: number
  notes: string | null
  tier_name: string
  tier_color: string
  tier_min_spending: number
  discount_pct: number
  point_mult: number
}

interface BookingHistory {
  id: number
  booking_date: string
  start_time: string
  capster_name: string
  services: string
  status: string
}

interface OrderHistory {
  id: number
  created_at: string
  capster_name: string
  items: string
  total: number
}

interface NextTier {
  name: string
  min_spending: number
  color: string
}

import { formatRupiah as formatRp } from '@/lib/currency'

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700/30 text-amber-400 border-amber-700',
  silver: 'bg-zinc-400/20 text-slate-700 border-zinc-500',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-600',
  platinum: 'bg-cyan-600/20 text-cyan-400 border-cyan-600',
  diamond: 'bg-blue-500/20 text-blue-400 border-blue-600',
}

export default function MemberDetailPage() {
  const params = useParams()
  const memberId = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [nextTier, setNextTier] = useState<NextTier | null>(null)
  const [bookings, setBookings] = useState<BookingHistory[]>([])
  const [orders, setOrders] = useState<OrderHistory[]>([])
  const [favoriteCapster, setFavoriteCapster] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch member + tier
      const { data: memberData, error: memberErr } = await supabase
        .from('members')
        .select(`
          id, name, phone, tier_id, total_points, total_spent, visit_count, notes,
          member_tiers!inner(name, min_spending, discount_pct, point_mult, color)
        `)
        .eq('id', memberId)
        .single()

      if (memberErr || !memberData) {
        setError('Member not found')
        setLoading(false)
        return
      }

      const tier = memberData.member_tiers as unknown as {
        name: string
        min_spending: number
        discount_pct: number
        point_mult: number
        color: string
      }

      const m: MemberDetail = {
        id: memberData.id,
        name: memberData.name,
        phone: memberData.phone,
        tier_id: memberData.tier_id,
        total_points: memberData.total_points,
        total_spent: memberData.total_spent,
        visit_count: memberData.visit_count,
        notes: memberData.notes,
        tier_name: tier.name,
        tier_color: tier.color,
        tier_min_spending: tier.min_spending,
        discount_pct: tier.discount_pct,
        point_mult: tier.point_mult,
      }
      setMember(m)
      setNotes(memberData.notes || '')

      // 2. Next tier
      const { data: tiers } = await supabase
        .from('member_tiers')
        .select('name, min_spending, color')
        .gt('min_spending', tier.min_spending)
        .order('min_spending')
        .limit(1)

      if (tiers && tiers.length > 0) {
        setNextTier(tiers[0])
      } else {
        setNextTier(null)
      }

      // 3. Booking history (last 10)
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, status,
          capsters!inner(name),
          booking_items(services!inner(name))
        `)
        .eq('customer_phone', m.phone)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(10)

      if (bookingData) {
        const bHistory: BookingHistory[] = bookingData.map((b: Record<string, unknown>) => {
          const capster = b.capsters as { name: string } | null
          const items = b.booking_items as { services: { name: string } }[] | undefined
          const svcNames = items?.map(i => i.services?.name).filter(Boolean).join(', ') || ''
          return {
            id: b.id as number,
            booking_date: b.booking_date as string,
            start_time: (b.start_time as string)?.substring(0, 5) || '',
            capster_name: capster?.name || '',
            services: svcNames,
            status: b.status as string,
          }
        })
        setBookings(bHistory)
      }

      // 4. Order history (last 10)
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id, created_at, total,
          order_items(capster_id, item_type, qty, services(name), products(name))
        `)
        .eq('customer_phone', m.phone)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      if (orderData) {
        // Collect capster IDs
        const capCounts = new Map<number, number>()
        const oHistory: OrderHistory[] = []

        for (const o of orderData as Record<string, unknown>[]) {
          const items = o.order_items as Record<string, unknown>[] | undefined
          const itemNames: string[] = []

          if (items) {
            for (const item of items) {
              const svc = item.services as { name: string } | null
              const prod = item.products as { name: string } | null
              const name = svc?.name || prod?.name || 'Item'
              itemNames.push(name)

              const capId = item.capster_id as number | null
              if (capId) {
                capCounts.set(capId, (capCounts.get(capId) || 0) + 1)
              }
            }
          }

          // Get first capster from items
          let capName = ''
          if (items && items.length > 0) {
            const firstCapId = items[0].capster_id as number | null
            if (firstCapId) {
              capName = '' // Will be resolved below
            }
          }

          oHistory.push({
            id: o.id as number,
            created_at: o.created_at as string,
            capster_name: '',
            items: itemNames.join(', '),
            total: o.total as number,
          })
        }

        // Resolve capster names
        if (capCounts.size > 0) {
          const capIds = Array.from(capCounts.keys())
          const { data: capData } = await supabase
            .from('capsters')
            .select('id, name')
            .in('id', capIds)

          const capNameMap = new Map<number, string>()
          if (capData) {
            for (const c of capData) capNameMap.set(c.id, c.name)
          }

          // Set favorite capster (most frequent)
          let maxCount = 0
          let favId = 0
          for (const [id, count] of capCounts) {
            if (count > maxCount) {
              maxCount = count
              favId = id
            }
          }
          setFavoriteCapster(capNameMap.get(favId) || '')

          // Enrich orders with capster name
          // Re-query with specific capster info
          const capIdsFromOrderItems = new Map<number, number>() // order_id -> capster_id
          const { data: allItems } = await supabase
            .from('order_items')
            .select('order_id, capster_id')
            .in('order_id', oHistory.map(o => o.id))
            .not('capster_id', 'is', null)

          if (allItems) {
            for (const item of allItems) {
              if (!capIdsFromOrderItems.has(item.order_id)) {
                capIdsFromOrderItems.set(item.order_id, item.capster_id!)
              }
            }
          }

          for (const o of oHistory) {
            const cId = capIdsFromOrderItems.get(o.id)
            if (cId) o.capster_name = capNameMap.get(cId) || ''
          }
        }

        setOrders(oHistory)
      }
    } catch (err) {
      console.error('Member detail error:', err)
      setError('Failed to load member data')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const saveNotes = async () => {
    if (!member) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('members')
        .update({ notes: notes.trim() || null })
        .eq('id', member.id)

      if (error) throw error
      setMember({ ...member, notes: notes.trim() || null })
    } catch (err) {
      console.error('Save notes error:', err)
    } finally {
      setSavingNotes(false)
    }
  }

  // Tier progress
  const tierProgress = nextTier
    ? Math.min(100, Math.round((member?.total_spent || 0) / nextTier.min_spending * 100))
    : 100

  const tierClass = TIER_COLORS[member?.tier_color?.toLowerCase() || ''] || 'bg-slate-200 text-slate-700 border-zinc-600'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f8fc]">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f8fc] p-4">
        <p className="text-slate-400 text-sm">{error || 'Member not found'}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f8fc] p-3 sm:p-4 space-y-3">
      {/* Header: Name + Tier */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">{member.name}</h1>
          <p className="text-xs text-slate-400">{member.phone}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierClass}`}>
          {member.tier_name}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase">Points</p>
          <p className="text-sm font-bold text-emerald-400">{member.total_points.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase">Spent</p>
          <p className="text-sm font-bold text-slate-800">{formatRp(member.total_spent)}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase">Visits</p>
          <p className="text-sm font-bold text-slate-800">{member.visit_count}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase">Discount</p>
          <p className="text-sm font-bold text-amber-400">{member.discount_pct}%</p>
        </div>
      </div>

      {/* Tier Progress Bar */}
      {nextTier && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Progress tier</span>
            <span className="text-slate-500">
              {formatRp(member.total_spent)} / {formatRp(nextTier.min_spending)} → {nextTier.name}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Favorites */}
      {favoriteCapster && (
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Capster Favorit</p>
          <p className="text-sm text-slate-800 font-medium mt-0.5">{favoriteCapster}</p>
        </div>
      )}

      {/* Booking History */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Riwayat Booking</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="px-3 py-3 text-xs text-slate-400">Belum ada booking</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {bookings.map(b => (
              <div key={b.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-700 font-medium">{b.services || 'Booking'}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    b.status === 'confirmed' ? 'bg-green-900/40 text-green-400' :
                    b.status === 'completed' ? 'bg-emerald-900/40 text-emerald-400' :
                    'bg-slate-100 text-slate-400'
                  }`}>{b.status}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {b.booking_date} · {b.start_time}{b.capster_name ? ` · ${b.capster_name}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Riwayat Transaksi</h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-3 py-3 text-xs text-slate-400">Belum ada transaksi</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {orders.map(o => (
              <div key={o.id} className="px-3 py-2 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-xs text-slate-700 truncate">{o.items || 'Order'}</p>
                  <p className="text-[10px] text-slate-400">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('id-ID') : ''}
                    {o.capster_name ? ` · ${o.capster_name}` : ''}
                  </p>
                </div>
                <span className="text-xs text-amber-400 font-medium flex-shrink-0">{formatRp(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
        <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Catatan</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Tambahkan catatan..."
          rows={3}
          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900
                     placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50 resize-none"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes}
          className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200
                     disabled:text-slate-400 text-white text-xs font-semibold transition-colors"
        >
          {savingNotes ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
