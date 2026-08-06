import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7) // YYYY-MM
    const capsterId = searchParams.get('capster_id')

    // Fetch capsters config
    const capsters = db.prepare('SELECT * FROM capsters ORDER BY name ASC').all() as Array<{
      id: number
      name: string
      base_salary: number
      service_commission_type: string
      service_commission_val: number
      product_commission_type: string
      product_commission_val: number
    }>

    // Fetch shift attendance for the month
    const shifts = db.prepare(`
      SELECT * FROM shifts WHERE shift_date LIKE ?
    `).all(`${month}%`) as Array<{
      shift_date: string
      capster_ids: string
      cashier_username: string
    }>

    // Build attendance map per capster per date
    const attendanceMap: Record<string, string[]> = {} // date -> array of capster_ids
    for (const s of shifts) {
      let ids: number[] = []
      try {
        ids = JSON.parse(s.capster_ids || '[]')
      } catch {}
      if (!attendanceMap[s.shift_date]) {
        attendanceMap[s.shift_date] = []
      }
      ids.forEach((id) => {
        if (!attendanceMap[s.shift_date].includes(String(id))) {
          attendanceMap[s.shift_date].push(String(id))
        }
      })
    }

    // Fetch completed order items with capster attribution for the month
    const orderItems = db.prepare(`
      SELECT oi.*, o.created_at as order_date, o.status, p.price as item_product_price, s.price as item_service_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN services s ON oi.service_id = s.id
      WHERE o.created_at LIKE ? AND oi.capster_id IS NOT NULL
    `).all(`${month}%`) as Array<{
      id: number
      order_id: number
      item_type: 'service' | 'product'
      capster_id: number
      qty: number
      price: number
      subtotal: number
      order_date: string
    }>

    // Also fetch completed bookings directly assigned to capsters for the month
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE booking_date LIKE ? AND status = 'completed' AND capster_id IS NOT NULL
    `).all(`${month}%`) as Array<{
      id: number
      capster_id: number
      booking_date: string
      customer_name: string
    }>

    // Process daily stats per capster
    const capsterStats: Record<number, {
      id: number
      name: string
      base_salary: number
      total_haircuts: number
      total_shift_days: number
      total_revenue: number
      estimated_commission: number
      daily: Record<string, { haircuts: number; revenue: number; commission: number; attended: boolean }>
    }> = {}

    for (const c of capsters) {
      capsterStats[c.id] = {
        id: c.id,
        name: c.name,
        base_salary: c.base_salary || 0,
        total_haircuts: 0,
        total_shift_days: 0,
        total_revenue: 0,
        estimated_commission: 0,
        daily: {}
      }
    }

    // Populate shift attendance days
    for (const [date, capIdStrs] of Object.entries(attendanceMap)) {
      capIdStrs.forEach((cIdStr) => {
        const cId = Number(cIdStr)
        if (capsterStats[cId]) {
          if (!capsterStats[cId].daily[date]) {
            capsterStats[cId].daily[date] = { haircuts: 0, revenue: 0, commission: 0, attended: true }
          } else {
            capsterStats[cId].daily[date].attended = true
          }
          capsterStats[cId].total_shift_days += 1
        }
      })
    }

    // Populate completed order items (sales & haircuts)
    for (const item of orderItems) {
      const cId = item.capster_id
      const date = item.order_date.split(' ')[0]
      if (capsterStats[cId]) {
        if (!capsterStats[cId].daily[date]) {
          capsterStats[cId].daily[date] = { haircuts: 0, revenue: 0, commission: 0, attended: false }
        }

        const isService = item.item_type === 'service'
        const qty = item.qty || 1
        const subtotal = item.subtotal || (item.price * qty)

        if (isService) {
          capsterStats[cId].total_haircuts += qty
          capsterStats[cId].daily[date].haircuts += qty
        }

        capsterStats[cId].total_revenue += subtotal
        capsterStats[cId].daily[date].revenue += subtotal

        // Commission calculation
        const capConfig = capsters.find((c) => c.id === cId)
        let comm = 0
        if (capConfig) {
          if (isService) {
            comm = capConfig.service_commission_type === 'percent'
              ? (subtotal * (capConfig.service_commission_val || 0)) / 100
              : (capConfig.service_commission_val || 0) * qty
          } else {
            comm = capConfig.product_commission_type === 'percent'
              ? (subtotal * (capConfig.product_commission_val || 0)) / 100
              : (capConfig.product_commission_val || 0) * qty
          }
        }

        capsterStats[cId].estimated_commission += comm
        capsterStats[cId].daily[date].commission += comm
      }
    }

    // Include completed bookings haircut count if not already logged via POS
    for (const b of bookings) {
      const cId = b.capster_id
      const date = b.booking_date
      if (capsterStats[cId]) {
        if (!capsterStats[cId].daily[date]) {
          capsterStats[cId].daily[date] = { haircuts: 0, revenue: 0, commission: 0, attended: false }
        }
        if (capsterStats[cId].daily[date].haircuts === 0) {
          capsterStats[cId].total_haircuts += 1
          capsterStats[cId].daily[date].haircuts += 1
          const capConfig = capsters.find((c) => c.id === cId)
          const defaultPrice = 50000
          const comm = capConfig
            ? (capConfig.service_commission_type === 'percent'
                ? (defaultPrice * (capConfig.service_commission_val || 0)) / 100
                : (capConfig.service_commission_val || 0))
            : 0
          capsterStats[cId].total_revenue += defaultPrice
          capsterStats[cId].daily[date].revenue += defaultPrice
          capsterStats[cId].estimated_commission += comm
          capsterStats[cId].daily[date].commission += comm
        }
      }
    }

    let result = Object.values(capsterStats)
    if (capsterId) {
      result = result.filter((c) => c.id === Number(capsterId))
    }

    return Response.json({ month, capsters: result })
  } catch (err) {
    console.error('KPI GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
