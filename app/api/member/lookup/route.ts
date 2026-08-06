import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')?.trim()

    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 })
    }

    // Clean phone number (e.g. 0812... -> 0812...)
    const cleanPhone = phone.replace(/[^0-9]/g, '')

    const member = db.prepare(`
      SELECT id, name, phone, tier_id, total_points, total_spent, visit_count, created_at
      FROM members 
      WHERE phone = ? OR phone = ?
    `).get(phone, cleanPhone) as {
      id: number
      name: string
      phone: string
      tier_id: number
      total_points: number
      total_spent: number
      visit_count: number
      created_at: string
    } | undefined

    if (!member) {
      return NextResponse.json({ found: false, message: 'Nomor belum terdaftar sebagai member Rome Bois.' })
    }

    // Mask name for privacy (e.g., Alexander -> Ale***)
    const nameParts = member.name.split(' ')
    const maskedName = nameParts.map(p => p.length > 2 ? `${p.substring(0, 3)}***` : p).join(' ')

    const tierName = member.total_spent >= 1000000 ? 'Gold Member' : member.total_spent >= 500000 ? 'Silver Member' : 'Bronze Member'

    return NextResponse.json({
      found: true,
      member: {
        id: member.id,
        name_masked: maskedName,
        phone: member.phone,
        tier_name: tierName,
        total_points: member.total_points,
        total_spent: member.total_spent,
        visit_count: member.visit_count,
        rewards_available: Math.floor(member.total_points / 100) * 10000 // e.g. 100 points = Rp 10.000 discount
      }
    })
  } catch (err) {
    console.error('Failed to lookup member:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
