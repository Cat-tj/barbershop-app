import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

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

    // Use dateParam if provided, otherwise default to today
    const targetDate = dateParam || new Date().toISOString().split('T')[0]

    const bookings = db.prepare(`
      SELECT b.*, c.name as capster_name 
      FROM bookings b
      LEFT JOIN capsters c ON b.capster_id = c.id
      WHERE (b.booking_date = ? OR b.booking_date IS NULL OR b.booking_date = '')
        AND (b.status = 'confirmed' OR b.status = 'in_progress')
      ORDER BY b.id DESC
    `).all(targetDate)

    return Response.json({ bookings })
  } catch (err) {
    console.error('Failed to fetch queue bookings:', err)
    return Response.json({ bookings: [] })
  }
}
