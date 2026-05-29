import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { member_id, reward_id } = body as {
      member_id: number
      reward_id: number
    }

    if (!member_id || !reward_id) {
      return Response.json({ error: 'member_id and reward_id are required.' }, { status: 400 })
    }

    // Try calling the RPC function first
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('redeem_reward', {
        p_member_id: member_id,
        p_reward_id: reward_id,
      })

    if (rpcError) {
      console.error('RPC error:', rpcError)

      // Fallback: manual redemption logic
      // 1. Check member exists and has enough points
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, total_points')
        .eq('id', member_id)
        .single()

      if (memberError || !member) {
        return Response.json({ error: 'Member not found.' }, { status: 404 })
      }

      // 2. Get reward
      const { data: reward, error: rewardError } = await supabase
        .from('rewards')
        .select('id, name, points_cost')
        .eq('id', reward_id)
        .single()

      if (rewardError || !reward) {
        return Response.json({ error: 'Reward not found.' }, { status: 404 })
      }

      if (member.total_points < reward.points_cost) {
        return Response.json({ error: 'Insufficient points.' }, { status: 400 })
      }

      // 3. Deduct points & insert redemption
      const newPoints = member.total_points - reward.points_cost
      const { error: updateError } = await supabase
        .from('members')
        .update({ total_points: newPoints })
        .eq('id', member_id)

      if (updateError) {
        console.error('Points update error:', updateError)
        return Response.json({ error: 'Failed to update points.' }, { status: 500 })
      }

      const { error: insertError } = await supabase
        .from('reward_redemptions')
        .insert({
          member_id,
          reward_id,
          points_used: reward.points_cost,
          status: 'completed',
        })

      if (insertError) {
        console.error('Redemption insert error:', insertError)
        return Response.json({ error: 'Failed to record redemption.' }, { status: 500 })
      }

      return Response.json({
        success: true,
        message: `Redeemed "${reward.name}" for ${reward.points_cost} pts. Remaining: ${newPoints} pts.`,
      })
    }

    return Response.json(rpcResult || { success: true })
  } catch (err) {
    console.error('Redeem API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
