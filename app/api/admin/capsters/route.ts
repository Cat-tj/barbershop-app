import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET() {
  try {
    const capsters = db.prepare('SELECT * FROM capsters ORDER BY name ASC').all()
    return Response.json({ capsters })
  } catch (err) {
    console.error('Capsters GET error:', err)
    return Response.json({ capsters: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      name,
      phone,
      active = 1,
      base_salary = 0,
      service_commission_type = 'percent',
      service_commission_val = 0,
      product_commission_type = 'percent',
      product_commission_val = 0
    } = body

    if (!name?.trim()) {
      return Response.json({ error: 'Capster name is required' }, { status: 400 })
    }

    if (id) {
      db.prepare(`
        UPDATE capsters 
        SET name = ?, phone = ?, active = ?, base_salary = ?, 
            service_commission_type = ?, service_commission_val = ?, 
            product_commission_type = ?, product_commission_val = ?
        WHERE id = ?
      `).run(
        name.trim(),
        phone?.trim() || null,
        active ? 1 : 0,
        Number(base_salary) || 0,
        service_commission_type,
        Number(service_commission_val) || 0,
        product_commission_type,
        Number(product_commission_val) || 0,
        id
      )
    } else {
      db.prepare(`
        INSERT INTO capsters (name, phone, active, base_salary, service_commission_type, service_commission_val, product_commission_type, product_commission_val)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name.trim(),
        phone?.trim() || null,
        active ? 1 : 0,
        Number(base_salary) || 0,
        service_commission_type,
        Number(service_commission_val) || 0,
        product_commission_type,
        Number(product_commission_val) || 0
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Capsters POST error:', err)
    return Response.json({ error: 'Failed to save capster' }, { status: 500 })
  }
}
