import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

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

    const insertPurchase = db.prepare(`
      INSERT INTO purchases (item_name, category, quantity, unit_price, total_price, place_of_purchase, is_new_item, created_product_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertProduct = db.prepare(`
      INSERT INTO products (name, price, stock, category)
      VALUES (?, ?, ?, ?)
    `)

    for (const item of items) {
      let createdProductId: number | null = null

      if (item.create_product && item.is_new_item) {
        const prodResult = insertProduct.run(
          item.item_name,
          item.unit_price,
          item.quantity,
          item.category
        )
        createdProductId = Number(prodResult.lastInsertRowid)
        newProductsCount++
      }

      insertPurchase.run(
        item.item_name,
        item.category,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price,
        item.place_of_purchase || null,
        item.is_new_item ? 1 : 0,
        createdProductId
      )
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
