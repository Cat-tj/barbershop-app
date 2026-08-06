import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

interface BookingService {
  service_id: number
  price: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customer_name,
      customer_phone,
      capster_id,
      booking_date,
      start_time,
      services,
      booking_type,
      notes,
      is_new_member,
    } = body as {
      customer_name: string
      customer_phone?: string | null
      capster_id: number
      booking_date: string
      start_time: string
      services: BookingService[]
      booking_type?: string
      notes?: string | null
      is_new_member?: boolean
    }

    if (!customer_name?.trim()) {
      return Response.json({ error: 'Customer name is required.' }, { status: 400 })
    }

    if (!capster_id) {
      return Response.json({ error: 'Capster is required.' }, { status: 400 })
    }

    if (!booking_date || !start_time) {
      return Response.json({ error: 'Date and time are required.' }, { status: 400 })
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return Response.json({ error: 'At least one service is required.' }, { status: 400 })
    }

    if (is_new_member && customer_phone?.trim()) {
      const phone = customer_phone.trim()
      const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone)
      if (!existing) {
        db.prepare(`
          INSERT INTO members (name, phone, tier_id, total_points, total_spent, visit_count)
          VALUES (?, ?, 1, 0, 0, 0)
        `).run(customer_name.trim(), phone)
      }
    }

    const totalDuration = services.length * 30
    const [startHour, startMin] = start_time.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = startMinutes + totalDuration
    const endHour = Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const end_time = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

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

    const insertBooking = db.prepare(`
      INSERT INTO bookings (customer_name, customer_phone, capster_id, booking_date, start_time, end_time, status, booking_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `)

    const result = insertBooking.run(
      customer_name.trim(),
      customer_phone?.trim() || null,
      capster_id,
      booking_date,
      start_time,
      end_time,
      booking_type || 'potong_di_tempat',
      notes?.trim() || null
    )

    return Response.json({
      success: true,
      booking_id: result.lastInsertRowid,
      start_time,
      end_time,
      total_duration: totalDuration,
    })
  } catch (err) {
    console.error('Booking API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
