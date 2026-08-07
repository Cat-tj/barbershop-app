'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MemberInfo {
  id: number
  name: string
  phone: string
  tier_id: number
  total_points: number
  total_spent: number
  visit_count: number
  tier_name: string
  discount_pct: number
  point_mult: number
  color: string
}

interface Reward {
  id: number
  name: string
  description: string | null
  points_cost: number
  reward_type: string
  value: number | null
}

export default function MembersPage() {
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [redeemingId, setRedeemingId] = useState<number | null>(null)

  const searchMember = async () => {
    setMessage(null)
    setMember(null)
    setRewards([])

    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Please enter a phone number.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/member?phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json()

      if (!data.found) {
        setMessage({ type: 'error', text: 'Member not found.' })
        return
      }

      setMember(data as MemberInfo)

      // fetch rewards
      const { data: rewardData } = await supabase
        .from('rewards')
        .select('*')
        .order('points_cost')
      if (rewardData) setRewards(rewardData)
    } catch {
      setMessage({ type: 'error', text: 'Failed to search member.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (rewardId: number) => {
    if (!member) return
    setRedeemingId(rewardId)
    setMessage(null)

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id, reward_id: rewardId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Redemption failed')

      setMessage({ type: 'success', text: `Reward redeemed! ${data.message || ''}` })
      // refresh member info
      searchMember()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Redemption failed'
      setMessage({ type: 'error', text: msg })
    } finally {
      setRedeemingId(null)
    }
  }

  const getTierBadge = (tier: MemberInfo['color'], name: string) => {
    const colorMap: Record<string, string> = {
      bronze: 'bg-amber-700/30 text-amber-400 border-amber-700',
      silver: 'bg-zinc-400/20 text-slate-700 border-zinc-500',
      gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-600',
      platinum: 'bg-cyan-600/20 text-cyan-400 border-cyan-600',
      diamond: 'bg-blue-500/20 text-blue-400 border-blue-600',
    }

    const classes = colorMap[tier.toLowerCase()] || 'bg-slate-200 text-slate-700 border-zinc-600'

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}
      >
        {name}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-slate-500 text-sm mt-1">Look up member info and redeem rewards</p>
        </div>

        {/* SEARCH */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Search by Phone</label>
          <div className="flex gap-3">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMember()}
              placeholder="08xxxxxxxxxx"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              type="button"
              onClick={searchMember}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200
                         text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                : 'bg-red-900/50 text-red-300 border border-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* MEMBER INFO */}
        {member && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{member.name}</h2>
                  <p className="text-sm text-slate-400">{member.phone}</p>
                </div>
                {getTierBadge(member.color, member.tier_name)}
              </div>

              {/* STATS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Points</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {member.total_points.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Spent</div>
                  <div className="text-lg font-bold text-slate-800">
                    Rp {member.total_spent.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Visits</div>
                  <div className="text-lg font-bold text-slate-800">{member.visit_count}</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Discount</div>
                  <div className="text-lg font-bold text-amber-400">{member.discount_pct}%</div>
                </div>
              </div>

              {/* TIER DETAILS */}
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Point multiplier: {member.point_mult}x</span>
              </div>
            </div>

            {/* REWARDS */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-base font-semibold text-slate-800">Available Rewards</h3>
              {rewards.length === 0 ? (
                <p className="text-slate-400 text-sm py-2">No rewards available</p>
              ) : (
                <div className="space-y-2">
                  {rewards.map(r => {
                    const canAfford = member.total_points >= r.points_cost
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-100 border border-slate-200"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-800">{r.name}</div>
                          {r.description && (
                            <div className="text-xs text-slate-400 mt-0.5">{r.description}</div>
                          )}
                          <div className="text-xs text-slate-400 mt-0.5">
                            {r.points_cost.toLocaleString()} pts
                            {r.value ? ` · Rp ${r.value.toLocaleString()} value` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRedeem(r.id)}
                          disabled={!canAfford || redeemingId === r.id}
                          className={`ml-3 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            canAfford
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {redeemingId === r.id ? '...' : 'Redeem'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* RECENT ACTIVITY (placeholder — stats are shown above) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-base font-semibold text-slate-800">Activity Summary</h3>
              <div className="text-sm text-slate-400">
                <p>Total spent: <span className="text-slate-700 font-medium">Rp {member.total_spent.toLocaleString()}</span></p>
                <p>Total visits: <span className="text-slate-700 font-medium">{member.visit_count}</span></p>
                <p>Points earned: <span className="text-emerald-400 font-medium">{member.total_points.toLocaleString()}</span></p>
                <p>Tier discount: <span className="text-amber-400 font-medium">{member.discount_pct}%</span></p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
