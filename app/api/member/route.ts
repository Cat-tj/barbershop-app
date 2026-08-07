import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const phone = searchParams.get('phone')

    if (phone?.trim()) {
      const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone.trim()) as {
        id: number; name: string; phone: string; tier_id: number
        total_points: number; total_spent: number; visit_count: number
      } | undefined

      if (!member) {
        return Response.json({ found: false })
      }

      return Response.json({
        found: true, id: member.id, name: member.name, phone: member.phone,
        tier_id: member.tier_id, total_points: member.total_points,
        total_spent: member.total_spent, visit_count: member.visit_count,
        tier_name: 'Silver', discount_pct: 5, point_mult: 1, color: '#7c5ce8',
      })
    }

    const members = db.prepare(`
      SELECT m.*, 'Silver' as tier_name, '#7c5ce8' as color 
      FROM members m ORDER BY m.id DESC
    `).all()

    return Response.json({ members })
  } catch (err) {
    console.error('Member API error:', err)
    return Response.json({ found: false, members: [], error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone } = body

    if (!name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'Nama dan nomor HP wajib diisi' }, { status: 400 })
    }

    // Check if member already exists
    const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone.trim()) as { id: number } | undefined
    if (existing) {
      return Response.json({ error: 'Nomor HP sudah terdaftar sebagai member', member_id: existing.id }, { status: 409 })
    }

    const result = db.prepare(`
      INSERT INTO members (name, phone, tier_id, total_points, total_spent, visit_count, created_at)
      VALUES (?, ?, 1, 0, 0, 0, datetime('now'))
    `).run(name.trim(), phone.trim())

    return Response.json({ success: true, member_id: result.lastInsertRowid })
  } catch (err) {
    console.error('Member POST error:', err)
    return Response.json({ error: 'Gagal mendaftarkan member' }, { status: 500 })
  }
}
