import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

interface OrderItemPayload {
  item_type: 'product' | 'service'
  product_id?: number | null
  service_id?: number | null
  capster_id?: number | null
  qty: number
  price: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customer_name,
      customer_phone,
      items,
      payment_method,
      discount = 0,
    } = body as {
      customer_name: string
      customer_phone?: string | null
      items: OrderItemPayload[]
      payment_method?: string | null
      discount?: number
    }

    if (!customer_name?.trim()) {
      return Response.json({ error: 'Customer name is required.' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'At least one item is required.' }, { status: 400 })
    }

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0)
    const total = Math.max(0, subtotal - discount)

    const insertOrder = db.prepare(`
      INSERT INTO orders (customer_name, customer_phone, status, subtotal, discount, total, payment_method)
      VALUES (?, ?, 'completed', ?, ?, ?, ?)
    `)

    const result = insertOrder.run(
      customer_name.trim(),
      customer_phone?.trim() || null,
      subtotal,
      discount,
      total,
      payment_method?.trim() || null
    )

    const orderId = result.lastInsertRowid

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, item_type, product_id, service_id, capster_id, qty, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const item of items) {
      insertItem.run(
        orderId,
        item.item_type,
        item.product_id || null,
        item.service_id || null,
        item.capster_id || null,
        item.qty,
        item.price,
        item.qty * item.price
      )

      // Deduct stock for products
      if (item.item_type === 'product' && item.product_id) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.qty, item.product_id)
      }
    }

    // AUTOMATIC REWARD POINTS CALCULATION (Per 10.000 IDR = 1 Point)
    let earnedPoints = 0
    if (customer_phone?.trim()) {
      const phone = customer_phone.trim()
      // Formula: 1 Point for every Rp 10.000 spent in this completed transaction
      earnedPoints = Math.floor(total / 10000)

      const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone)
      if (existing) {
        db.prepare(`
          UPDATE members 
          SET total_points = total_points + ?, 
              total_spent = total_spent + ?,
              visit_count = visit_count + 1,
              last_visit_date = datetime('now')
          WHERE phone = ?
        `).run(earnedPoints, total, phone)
      } else {
        db.prepare(`
          INSERT INTO members (name, phone, tier_id, total_points, total_spent, visit_count, last_visit_date)
          VALUES (?, ?, 1, ?, ?, 1, datetime('now'))
        `).run(customer_name.trim(), phone, earnedPoints, total)
      }
    }

    return Response.json({
      success: true,
      order_id: orderId,
      subtotal,
      discount,
      total,
      earned_points: earnedPoints,
    })
  } catch (err) {
    console.error('Order API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
