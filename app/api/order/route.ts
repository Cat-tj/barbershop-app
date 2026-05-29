import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0)
    const total = Math.max(0, subtotal - discount)

    // Step 1: Insert order as pending (triggers won't fire yet — no items to process)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.trim() || null,
        status: 'pending',
        subtotal,
        discount,
        total,
        payment_method: payment_method?.trim() || null,
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('Order insert error:', orderError)
      return Response.json({ error: 'Failed to create order.' }, { status: 500 })
    }

    // Step 2: Insert order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      item_type: item.item_type,
      product_id: item.product_id || null,
      service_id: item.service_id || null,
      capster_id: item.capster_id || null,
      qty: item.qty,
      price: item.price,
      subtotal: item.qty * item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items insert error:', itemsError)
      return Response.json({ error: 'Failed to create order items.' }, { status: 500 })
    }

    // Step 3: Update order to completed — triggers now have items to process
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', order.id)

    if (updateError) {
      console.error('Order status update error:', updateError)
      return Response.json({ error: 'Failed to finalize order.' }, { status: 500 })
    }

    return Response.json({
      success: true,
      order_id: order.id,
      subtotal,
      discount,
      total,
    })
  } catch (err) {
    console.error('Order API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
