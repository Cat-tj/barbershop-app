import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const phone = searchParams.get('phone')

    if (!phone?.trim()) {
      return Response.json({ found: false, error: 'Phone parameter is required.' }, { status: 400 })
    }

    const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone.trim()) as {
      id: number
      name: string
      phone: string
      tier_id: number
      total_points: number
      total_spent: number
      visit_count: number
    } | undefined

    if (!member) {
      return Response.json({ found: false })
    }

    return Response.json({
      found: true,
      id: member.id,
      name: member.name,
      phone: member.phone,
      tier_id: member.tier_id,
      total_points: member.total_points,
      total_spent: member.total_spent,
      visit_count: member.visit_count,
      tier_name: 'Silver',
      discount_pct: 5,
      point_mult: 1,
      color: '#f59e0b',
    })
  } catch (err) {
    console.error('Member API error:', err)
    return Response.json({ found: false, error: 'Internal server error.' }, { status: 500 })
  }
}
