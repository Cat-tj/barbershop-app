import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const today = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const activeShift = db.prepare(`
      SELECT * FROM shifts WHERE shift_date = ? AND status = 'open' ORDER BY id DESC LIMIT 1
    `).get(today)

    return Response.json({
      hasActiveShift: !!activeShift,
      shift: activeShift || null
    })
  } catch (err) {
    console.error('Shift GET error:', err)
    return Response.json({ hasActiveShift: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cashier_username, opening_cash, capster_ids } = body as {
      cashier_username: string
      opening_cash: number
      capster_ids: number[]
    }

    if (!cashier_username) {
      return Response.json({ error: 'Cashier username is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const capstersJson = JSON.stringify(capster_ids || [])

    const result = db.prepare(`
      INSERT INTO shifts (cashier_username, opening_cash, shift_date, status, capster_ids)
      VALUES (?, ?, ?, 'open', ?)
    `).run(cashier_username, opening_cash || 0, today, capstersJson)

    const newShift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid)

    return Response.json({ success: true, shift: newShift })
  } catch (err) {
    console.error('Shift POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
