import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PurchaseItem {
  item_name: string
  category: 'product' | 'consumable'
  quantity: number
  unit_price: number
  place_of_purchase: string | null
  is_new_item: boolean
  create_product: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items: PurchaseItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'At least one item is required.' }, { status: 400 })
    }

    let newProductsCount = 0
    const purchaseRecords: Record<string, unknown>[] = []

    for (const item of items) {
      let createdProductId: number | null = null

      // If flagged to create a new product, insert it first
      if (item.create_product && item.is_new_item) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: item.item_name,
            price: item.unit_price,
            stock: item.quantity,
            category: item.category,
          })
          .select('id')
          .single()

        if (productError) {
          console.error('Failed to create product:', productError)
          return Response.json({ error: `Failed to create product: ${item.item_name}` }, { status: 500 })
        }

        createdProductId = product.id
        newProductsCount++
      }

      // Insert purchase record
      purchaseRecords.push({
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        place_of_purchase: item.place_of_purchase || null,
        is_new_item: item.is_new_item,
        created_product_id: createdProductId,
        created_at: new Date().toISOString(),
      })
    }

    const { error: insertError } = await supabase
      .from('purchases')
      .insert(purchaseRecords)

    if (insertError) {
      console.error('Failed to insert purchases:', insertError)
      return Response.json({ error: 'Failed to record purchases.' }, { status: 500 })
    }

    return Response.json({
      success: true,
      count: items.length,
      new_products: newProductsCount,
    })
  } catch (err) {
    console.error('Purchases API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
