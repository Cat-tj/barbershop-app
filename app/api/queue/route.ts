import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET() {
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

    const today = new Date().toISOString().split('T')[0]
    const bookings = db.prepare(`
      SELECT b.*, c.name as capster_name 
      FROM bookings b
      LEFT JOIN capsters c ON b.capster_id = c.id
      WHERE b.booking_date = ? AND (b.status = 'confirmed' OR b.status = 'in_progress')
      ORDER BY b.start_time ASC
    `).all(today)

    return Response.json({ bookings })
  } catch (err) {
    console.error('Failed to fetch queue bookings:', err)
    return Response.json({ bookings: [] })
  }
}
