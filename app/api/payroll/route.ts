import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7) // YYYY-MM
    const capsterId = searchParams.get('capster_id')

    // Fetch capsters config
    const capsters = db.prepare('SELECT * FROM capsters WHERE active = 1 ORDER BY name ASC').all() as Array<{
      id: number; name: string; phone: string; base_salary: number
      service_commission_type: string; service_commission_val: number
      product_commission_type: string; product_commission_val: number
      attendance_bonus: number
    }>

    // Fetch shift attendance for the month
    const shifts = db.prepare('SELECT * FROM shifts WHERE shift_date LIKE ?').all(`${month}%`) as Array<{
      shift_date: string; capster_ids: string; status: string
    }>

    // Build attendance map per capster
    const attendanceMap: Record<number, string[]> = {} // capster_id -> [dates]
    for (const s of shifts) {
      let ids: number[] = []
      try { ids = JSON.parse(s.capster_ids || '[]') } catch {}
      ids.forEach(id => {
        if (!attendanceMap[id]) attendanceMap[id] = []
        if (!attendanceMap[id].includes(s.shift_date)) attendanceMap[id].push(s.shift_date)
      })
    }

    // Fetch completed order items with capster attribution
    const orderItems = db.prepare(`
      SELECT oi.*, o.created_at as order_date, o.status
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at LIKE ? AND oi.capster_id IS NOT NULL
    `).all(`${month}%`) as Array<{
      id: number; order_id: number; item_type: string; capster_id: number
      qty: number; price: number; subtotal: number; order_date: string
    }>

    // Process per capster
    const payroll: Record<number, {
      capster_id: number; capster_name: string; base_salary: number
      service_revenue: number; service_commission: number
      product_revenue: number; product_commission: number
      total_haircuts: number; total_products: number
      shift_days: number; attendance_bonus: number
      total_gaji: number
      daily_breakdown: Record<string, {
        date: string; haircuts: number; products: number
        service_rev: number; product_rev: number; service_comm: number; product_comm: number
      }>
    }> = {}

    for (const c of capsters) {
      payroll[c.id] = {
        capster_id: c.id,
        capster_name: c.name,
        base_salary: c.base_salary || 0,
        service_revenue: 0,
        service_commission: 0,
        product_revenue: 0,
        product_commission: 0,
        total_haircuts: 0,
        total_products: 0,
        shift_days: (attendanceMap[c.id] || []).length,
        attendance_bonus: 0,
        total_gaji: 0,
        daily_breakdown: {}
      }
    }

    // Process order items
    for (const item of orderItems) {
      const p = payroll[item.capster_id]
      if (!p) continue

      const date = item.order_date.split(' ')[0]
      const qty = item.qty || 1
      const subtotal = item.subtotal || (item.price * qty)
      const capConfig = capsters.find(c => c.id === item.capster_id)
      if (!capConfig) continue

      if (!p.daily_breakdown[date]) {
        p.daily_breakdown[date] = { date, haircuts: 0, products: 0, service_rev: 0, product_rev: 0, service_comm: 0, product_comm: 0 }
      }

      const isService = item.item_type === 'service'
      let comm = 0

      if (isService) {
        comm = capConfig.service_commission_type === 'percent'
          ? (subtotal * (capConfig.service_commission_val || 0)) / 100
          : (capConfig.service_commission_val || 0) * qty
        p.service_revenue += subtotal
        p.service_commission += comm
        p.total_haircuts += qty
        p.daily_breakdown[date].haircuts += qty
        p.daily_breakdown[date].service_rev += subtotal
        p.daily_breakdown[date].service_comm += comm
      } else {
        comm = capConfig.product_commission_type === 'percent'
          ? (subtotal * (capConfig.product_commission_val || 0)) / 100
          : (capConfig.product_commission_val || 0) * qty
        p.product_revenue += subtotal
        p.product_commission += comm
        p.total_products += qty
        p.daily_breakdown[date].products += qty
        p.daily_breakdown[date].product_rev += subtotal
        p.daily_breakdown[date].product_comm += comm
      }
    }

    // Calculate attendance bonus & total gaji
    for (const c of capsters) {
      const p = payroll[c.id]
      if (!p) continue

      // Attendance bonus: bonus per day attended
      p.attendance_bonus = p.shift_days * (c.attendance_bonus || 0)

      // Total gaji = gaji pokok + komisi jasa + komisi produk + bonus hadir
      p.total_gaji = p.base_salary + p.service_commission + p.product_commission + p.attendance_bonus
    }

    let result = Object.values(payroll)
    if (capsterId) {
      result = result.filter(p => p.capster_id === Number(capsterId))
    }

    // Calculate totals for admin summary
    const totals = {
      total_base_salary: result.reduce((s, p) => s + p.base_salary, 0),
      total_service_commission: result.reduce((s, p) => s + p.service_commission, 0),
      total_product_commission: result.reduce((s, p) => s + p.product_commission, 0),
      total_attendance_bonus: result.reduce((s, p) => s + p.attendance_bonus, 0),
      total_gaji: result.reduce((s, p) => s + p.total_gaji, 0),
      total_capsters: result.length,
    }

    return Response.json({ month, capsters: result, totals })
  } catch (err) {
    console.error('Payroll GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
