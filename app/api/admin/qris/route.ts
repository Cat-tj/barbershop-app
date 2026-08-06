import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import db from '@/lib/sqlite'

export async function GET() {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('qris_static_payload') as { value: string } | undefined
    return Response.json({
      qris_static_payload: row?.value || '00020101021226670016ID.CO.QRIS.WWW01189360091430000000000215ID10200000000000303039365204581253033605802ID5914ROMEBOIS POS6007JAKARTA610512110622207QRIS1234566304ABCD'
    })
  } catch (err) {
    console.error('QRIS settings GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get('session')?.value
  if (!cookie) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const session = await verifyToken(cookie)
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Admin access required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { qris_static_payload } = body as { qris_static_payload: string }

    if (!qris_static_payload?.trim()) {
      return Response.json({ error: 'QRIS static payload is required.' }, { status: 400 })
    }

    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('qris_static_payload', ?)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `).run(qris_static_payload.trim())

    return Response.json({ success: true, qris_static_payload: qris_static_payload.trim() })
  } catch (err) {
    console.error('QRIS settings POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
