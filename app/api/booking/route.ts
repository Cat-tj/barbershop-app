import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    } = body as {
      customer_name: string
      customer_phone?: string | null
      capster_id: number
      booking_date: string
      start_time: string
      services: BookingService[]
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

    // Look up actual service durations from the services table
    const serviceIds = services.map(s => s.service_id)
    const { data: serviceData, error: svcError } = await supabase
      .from('services')
      .select('id, duration')
      .in('id', serviceIds)

    if (svcError) {
      console.error('Service fetch error:', svcError)
      return Response.json({ error: 'Failed to fetch service info.' }, { status: 500 })
    }

    const durationMap = new Map<number, number>()
    if (serviceData) {
      for (const s of serviceData) {
        durationMap.set(s.id, s.duration || 30)
      }
    }

    // Calculate total duration and end time
    const totalDuration = services.reduce((sum, s) => sum + (durationMap.get(s.service_id) || 30), 0)

    const [startHour, startMin] = start_time.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = startMinutes + totalDuration
    const endHour = Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const end_time = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

    // Insert booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.trim() || null,
        capster_id,
        booking_date,
        start_time,
        end_time,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (bookingError) {
      console.error('Booking insert error:', bookingError)
      return Response.json({ error: 'Failed to create booking.' }, { status: 500 })
    }

    // Insert booking items
    const bookingItems = services.map(s => ({
      booking_id: booking.id,
      service_id: s.service_id,
      price: s.price,
    }))

    const { error: itemsError } = await supabase
      .from('booking_items')
      .insert(bookingItems)

    if (itemsError) {
      console.error('Booking items insert error:', itemsError)
      return Response.json({ error: 'Failed to create booking items.' }, { status: 500 })
    }

    return Response.json({
      success: true,
      booking_id: booking.id,
      start_time,
      end_time,
      total_duration: totalDuration,
    })
  } catch (err) {
    console.error('Booking API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
