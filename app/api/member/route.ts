import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const phone = searchParams.get('phone')
    const id = searchParams.get('id')
    const search = searchParams.get('search')
    const ranking = searchParams.get('ranking')

    // Get single member by phone
    if (phone?.trim()) {
      const member = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone.trim()) as any
      if (!member) return Response.json({ found: false })
      return Response.json({ found: true, ...member })
    }

    // Get single member by ID with history
    if (id) {
      const member = db.prepare('SELECT * FROM members WHERE id = ?').get(Number(id)) as any
      if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

      // Get transaction history
      const orders = db.prepare(`
        SELECT o.id, o.customer_name, o.total, o.payment_method, o.created_at,
          GROUP_CONCAT(oi.item_type || ':' || COALESCE(s.name, p.name, 'Item')) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN services s ON oi.service_id = s.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.customer_phone = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 50
      `).all(member.phone) as any[]

      // Last haircut
      const lastHaircut = db.prepare(`
        SELECT o.created_at as last_haircut_date
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_phone = ? AND oi.item_type = 'service'
        ORDER BY o.created_at DESC LIMIT 1
      `).get(member.phone) as any

      return Response.json({
        ...member,
        orders,
        last_haircut: lastHaircut?.last_haircut_date || null,
      })
    }

    // Ranking mode — return all members sorted
    const members = db.prepare(`
      SELECT m.*,
        CASE
          WHEN m.total_spent >= 1000000 THEN 'Platinum'
          WHEN m.total_spent >= 500000 THEN 'Gold'
          WHEN m.total_spent >= 200000 THEN 'Silver'
          ELSE 'Bronze'
        END as tier_name
      FROM members m
      ORDER BY m.total_spent DESC
    `).all() as any[]

    // Add rank
    const ranked = members.map((m: any, i: number) => ({ ...m, rank: i + 1 }))

    // Search filter
    if (search?.trim()) {
      const q = search.toLowerCase()
      const filtered = ranked.filter((m: any) =>
        m.name.toLowerCase().includes(q) || m.phone?.includes(q)
      )
      return Response.json({ members: filtered })
    }

    return Response.json({ members: ranked })
  } catch (err) {
    console.error('Member GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, notes } = body

    if (!phone?.trim()) {
      return Response.json({ error: 'Nomor HP wajib diisi' }, { status: 400 })
    }

    // Check if member already exists
    const existing = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone.trim()) as any
    if (existing) {
      return Response.json({ error: 'Nomor HP sudah terdaftar', member: existing }, { status: 409 })
    }

    const result = db.prepare(`
      INSERT INTO members (name, phone, tier_id, total_points, total_spent, visit_count, notes, created_at)
      VALUES (?, ?, 1, 0, 0, 0, ?, datetime('now'))
    `).run(name?.trim() || 'Member Baru', phone.trim(), notes || null)

    return Response.json({ success: true, member_id: result.lastInsertRowid })
  } catch (err) {
    console.error('Member POST error:', err)
    return Response.json({ error: 'Gagal mendaftarkan member' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, notes } = body

    if (!id) {
      return Response.json({ error: 'ID member wajib diisi' }, { status: 400 })
    }

    db.prepare(`
      UPDATE members SET name = COALESCE(?, name), phone = COALESCE(?, phone), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(name?.trim(), phone?.trim(), notes, Number(id))

    return Response.json({ success: true })
  } catch (err) {
    console.error('Member PUT error:', err)
    return Response.json({ error: 'Gagal update member' }, { status: 500 })
  }
}
