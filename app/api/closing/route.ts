import { supabase } from '@/lib/supabase'
import { NextRequest } from 'next/server'

export async function POST(_request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00Z`
    const todayEnd = `${today}T23:59:59Z`

    // Completed orders today
    const { data: completedOrders, error: orderErr } = await supabase
      .from('orders')
      .select('id, total, payment_method')
      .eq('status', 'completed')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    if (orderErr) {
      console.error('Closing orders error:', orderErr)
      return Response.json({ error: 'Failed to fetch orders.' }, { status: 500 })
    }

    const orders = completedOrders || []
    const orderIds = orders.map(o => o.id)

    // Totals
    const total_revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const total_orders = orders.length

    // Group by payment method
    const paymentGroups = new Map<string, number>()
    for (const o of orders) {
      const method = (o.payment_method || 'cash').toLowerCase()
      paymentGroups.set(method, (paymentGroups.get(method) || 0) + (o.total || 0))
    }

    const cash = paymentGroups.get('cash') || 0
    const qris = paymentGroups.get('qris') || 0
    const debit = paymentGroups.get('debit') || 0

    // Order items today
    let total_services = 0
    let total_products_sold = 0

    if (orderIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('item_type, qty')
        .in('order_id', orderIds)

      if (!itemsErr && items) {
        for (const item of items) {
          if (item.item_type === 'service') {
            total_services += item.qty || 0
          } else if (item.item_type === 'product') {
            total_products_sold += item.qty || 0
          }
        }
      }
    }

    // Purchases today (try to query purchases table)
    let purchases_today = 0
    try {
      const { data: purchases, error: purchaseErr } = await supabase
        .from('purchases')
        .select('amount')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      if (!purchaseErr && purchases) {
        purchases_today = purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    } catch {
      // purchases table may not exist — that's OK
      purchases_today = 0
    }

    const net_income = total_revenue - purchases_today

    return Response.json({
      date: today,
      total_revenue,
      cash,
      qris,
      debit,
      total_orders,
      total_services,
      total_products_sold,
      purchases_today,
      net_income,
    })
  } catch (err) {
    console.error('Closing API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
