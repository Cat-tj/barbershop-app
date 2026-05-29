import { supabase } from '@/lib/supabase'
import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00Z`
    const todayEnd = `${today}T23:59:59Z`

    // --- Today: revenue, orders, bookings ---
    const { data: completedOrders, error: orderErr } = await supabase
      .from('orders')
      .select('id, total, created_at, customer_name')
      .eq('status', 'completed')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    if (orderErr) {
      console.error('Dashboard orders error:', orderErr)
      return Response.json({ error: 'Failed to fetch orders.' }, { status: 500 })
    }

    const orders = completedOrders || []

    const { count: bookingsCount, error: bookingErr } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_date', today)

    if (bookingErr) {
      console.error('Dashboard bookings error:', bookingErr)
    }

    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const ordersCount = orders.length
    const orderIds = orders.map(o => o.id)

    // --- Top services ---
    let top_services: { name: string; count: number; revenue: number }[] = []

    if (orderIds.length > 0) {
      const { data: serviceItems } = await supabase
        .from('order_items')
        .select(`
          service_id,
          price,
          qty,
          services!inner(name)
        `)
        .eq('item_type', 'service')
        .in('order_id', orderIds)

      if (serviceItems) {
        const svcAgg = new Map<string, { name: string; count: number; revenue: number }>()
        for (const item of serviceItems) {
          const svcData = item.services as unknown as { name: string } | null
          const svcName = svcData?.name || 'Unknown'
          const existing = svcAgg.get(svcName)
          if (existing) {
            existing.count += item.qty || 1
            existing.revenue += (item.price || 0) * (item.qty || 1)
          } else {
            svcAgg.set(svcName, {
              name: svcName,
              count: item.qty || 1,
              revenue: (item.price || 0) * (item.qty || 1),
            })
          }
        }
        top_services = Array.from(svcAgg.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      }
    }

    // --- Top capsters ---
    let top_capsters: { name: string; orders: number; commission: number }[] = []

    if (orderIds.length > 0) {
      const { data: capsterItems } = await supabase
        .from('order_items')
        .select('capster_id, price, qty, order_id')
        .in('order_id', orderIds)
        .not('capster_id', 'is', null)

      if (capsterItems && capsterItems.length > 0) {
        const capAgg = new Map<number, { orderSet: Set<number>; revenue: number }>()
        for (const item of capsterItems) {
          const capId = item.capster_id!
          const existing = capAgg.get(capId)
          if (existing) {
            existing.orderSet.add(item.order_id)
            existing.revenue += (item.price || 0) * (item.qty || 1)
          } else {
            const s = new Set<number>()
            s.add(item.order_id)
            capAgg.set(capId, { orderSet: s, revenue: (item.price || 0) * (item.qty || 1) })
          }
        }

        const capIds = Array.from(capAgg.keys())
        const { data: capstersData } = await supabase
          .from('capsters')
          .select('id, name')
          .in('id', capIds)

        const capNameMap = new Map<number, string>()
        if (capstersData) {
          for (const c of capstersData) capNameMap.set(c.id, c.name)
        }

        top_capsters = Array.from(capAgg.entries())
          .map(([capId, data]) => ({
            name: capNameMap.get(capId) || 'Unknown',
            orders: data.orderSet.size,
            commission: Math.round(data.revenue * 0.7),
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5)
      }
    }

    // --- Low stock ---
    const { data: products, error: stockErr } = await supabase
      .from('products')
      .select('name, stock, stock_threshold')

    let low_stock: { name: string; stock: number; threshold: number }[] = []
    if (products && !stockErr) {
      low_stock = products
        .filter(p => p.stock <= (p.stock_threshold ?? 5))
        .map(p => ({
          name: p.name,
          stock: p.stock,
          threshold: p.stock_threshold ?? 5,
        }))
    }

    // --- Recent orders ---
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const recent10 = sortedOrders.slice(0, 10)

    const recent_orders: { customer_name: string; total: number; time: string; capster_name: string }[] = []

    if (recent10.length > 0) {
      const recentIds = recent10.map(o => o.id)
      const { data: recentItems } = await supabase
        .from('order_items')
        .select('order_id, capster_id')
        .in('order_id', recentIds)
        .not('capster_id', 'is', null)

      const orderCapMap = new Map<number, string>()

      if (recentItems && recentItems.length > 0) {
        const allCapIds = Array.from(new Set(recentItems.map(i => i.capster_id!)))
        const { data: capData } = await supabase
          .from('capsters')
          .select('id, name')
          .in('id', allCapIds)

        const capMap = new Map<number, string>()
        if (capData) {
          for (const c of capData) capMap.set(c.id, c.name)
        }

        for (const item of recentItems) {
          if (item.capster_id && !orderCapMap.has(item.order_id)) {
            orderCapMap.set(item.order_id, capMap.get(item.capster_id) || '')
          }
        }
      }

      for (const o of recent10) {
        recent_orders.push({
          customer_name: o.customer_name,
          total: o.total,
          time: o.created_at
            ? new Date(o.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '--:--',
          capster_name: orderCapMap.get(o.id) || '',
        })
      }
    }

    return Response.json({
      today: {
        revenue,
        orders: ordersCount,
        bookings: bookingsCount ?? 0,
      },
      top_services,
      top_capsters,
      low_stock,
      recent_orders,
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
