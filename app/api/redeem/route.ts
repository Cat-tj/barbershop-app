import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

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

    const member = db.prepare('SELECT id, total_points FROM members WHERE id = ?').get(member_id) as {
      id: number
      total_points: number
    } | undefined

    if (!member) {
      return Response.json({ error: 'Member not found.' }, { status: 404 })
    }

    if (member.total_points < 50) {
      return Response.json({ error: 'Insufficient points.' }, { status: 400 })
    }

    const newPoints = Math.max(0, member.total_points - 50)
    db.prepare('UPDATE members SET total_points = ? WHERE id = ?').run(newPoints, member_id)

    return Response.json({
      success: true,
      message: `Redeemed reward for 50 pts. Remaining: ${newPoints} pts.`,
    })
  } catch (err) {
    console.error('Redeem API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
