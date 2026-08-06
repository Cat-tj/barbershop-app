import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET() {
  try {
    const services = db.prepare('SELECT id, name, price, duration FROM services ORDER BY name ASC').all()
    return Response.json({ services })
  } catch (err) {
    console.error('Services GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, price, duration = 30 } = body as { name: string; price: number; duration?: number }

    if (!name?.trim() || !price) {
      return Response.json({ error: 'Nama layanan dan harga wajib diisi.' }, { status: 400 })
    }

    const result = db.prepare(`
      INSERT INTO services (name, price, duration) VALUES (?, ?, ?)
    `).run(name.trim(), Number(price), Number(duration) || 30)

    const newService = db.prepare('SELECT id, name, price, duration FROM services WHERE id = ?').get(result.lastInsertRowid)

    return Response.json({ success: true, service: newService }, { status: 201 })
  } catch (err) {
    console.error('Services POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
