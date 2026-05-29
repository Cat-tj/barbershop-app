import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Fetch existing bookings for this date + capster (not cancelled)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('start_time, customer_phone')
      .eq('booking_date', date)
      .eq('capster_id', capsterId)
      .neq('status', 'cancelled')

    if (error) {
      console.error('Slots query error:', error)
      return Response.json({ error: 'Failed to fetch bookings.' }, { status: 500 })
    }

    // Build a map of booked start_time -> customer_phone
    const bookedMap = new Map<string, string>()
    if (bookings) {
      for (const b of bookings) {
        // start_time is like "09:00" or "09:00:00" — normalize to HH:MM
        const time = b.start_time?.substring(0, 5)
        if (time) bookedMap.set(time, b.customer_phone || '')
      }
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
