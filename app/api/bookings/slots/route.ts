import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

function generateSlots(): string[] {
  const slots: string[] = []
  for (let h = 9; h < 21; h++) {
    const hh = h.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  slots.push('21:00')
  return slots
}

interface SlotStatus {
  time: string
  status: 'available' | 'taken' | 'mine'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date')
    const capsterIdStr = searchParams.get('capster_id')
    const phone = searchParams.get('phone')

    if (!date || !capsterIdStr) {
      return Response.json({ error: 'date and capster_id are required.' }, { status: 400 })
    }

    const capsterId = parseInt(capsterIdStr, 10)
    if (isNaN(capsterId)) {
      return Response.json({ error: 'Invalid capster_id.' }, { status: 400 })
    }

    let bookings: { start_time: string; customer_phone: string }[] = []
    try {
      bookings = db.prepare(`
        SELECT start_time, customer_phone 
        FROM bookings 
        WHERE booking_date = ? AND capster_id = ? AND status != 'cancelled'
      `).all(date, capsterId) as { start_time: string; customer_phone: string }[]
    } catch {
      bookings = []
    }

    const bookedMap = new Map<string, string>()
    for (const b of bookings) {
      const time = b.start_time?.substring(0, 5)
      if (time) bookedMap.set(time, b.customer_phone || '')
    }

    const allSlots = generateSlots()
    const slots: SlotStatus[] = allSlots.map(time => {
      const bookedPhone = bookedMap.get(time)
      if (bookedPhone === undefined) {
        return { time, status: 'available' }
      }
      if (phone && bookedPhone === phone.trim()) {
        return { time, status: 'mine' }
      }
      return { time, status: 'taken' }
    })

    return Response.json({ slots })
  } catch (err) {
    console.error('Slots API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
