import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        capster_id INTEGER,
        booking_date TEXT,
        start_time TEXT,
        end_time TEXT,
        status TEXT DEFAULT 'confirmed',
        booking_type TEXT DEFAULT 'potong_di_tempat',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const bookings = db.prepare(`
      SELECT b.*, c.name as capster_name 
      FROM bookings b
      LEFT JOIN capsters c ON b.capster_id = c.id
      WHERE b.status = 'confirmed' OR b.status = 'in_progress'
      ORDER BY 
        CASE WHEN b.status = 'in_progress' THEN 1 ELSE 2 END ASC,
        b.id ASC
    `).all()

    return Response.json({ bookings })
  } catch (err) {
    console.error('Failed to fetch queue bookings:', err)
    return Response.json({ bookings: [] })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body as { id: number; status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' }

    if (!id || !status) {
      return Response.json({ error: 'ID and status are required' }, { status: 400 })
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id)

    return Response.json({ success: true, id, status })
  } catch (err) {
    console.error('Failed to update booking status:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
