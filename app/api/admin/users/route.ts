import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import db from '@/lib/sqlite'

async function checkAuth(request: NextRequest): Promise<{ authorized: boolean; status: number; body?: Record<string, unknown> }> {
  const cookie = request.cookies.get('session')?.value
  if (!cookie) {
    return { authorized: false, status: 401, body: { error: 'Authentication required.' } }
  }

  const session = await verifyToken(cookie)
  if (!session) {
    return { authorized: false, status: 401, body: { error: 'Invalid or expired session.' } }
  }

  if (session.role !== 'admin') {
    return { authorized: false, status: 403, body: { error: 'Admin access required.' } }
  }

  return { authorized: true, status: 200 }
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.authorized) {
    return Response.json(auth.body, { status: auth.status })
  }

  try {
    const users = db
      .prepare('SELECT id, username, role, active, created_at FROM user_accounts ORDER BY username')
      .all()

    return Response.json({ users })
  } catch (err) {
    console.error('Admin users GET error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.authorized) {
    return Response.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { username, password, role } = body as {
      username: string
      password: string
      role?: 'admin' | 'user'
    }

    if (!username?.trim() || !password?.trim()) {
      return Response.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const existing = db
      .prepare('SELECT id FROM user_accounts WHERE username = ?')
      .get(username.trim())

    if (existing) {
      return Response.json({ error: 'Username already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = db.prepare(`
      INSERT INTO user_accounts (username, password_hash, role, active)
      VALUES (?, ?, ?, 1)
    `).run(username.trim(), passwordHash, role || 'user')

    const newUser = db
      .prepare('SELECT id, username, role, active, created_at FROM user_accounts WHERE id = ?')
      .get(result.lastInsertRowid)

    return Response.json({ user: newUser }, { status: 201 })
  } catch (err) {
    console.error('Admin users POST error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.authorized) {
    return Response.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { id, username, role, active, password } = body as {
      id: number
      username?: string
      role?: 'admin' | 'user'
      active?: boolean
      password?: string
    }

    if (!id) {
      return Response.json({ error: 'User ID is required.' }, { status: 400 })
    }

    if (role !== undefined) {
      db.prepare('UPDATE user_accounts SET role = ? WHERE id = ?').run(role, id)
    }
    if (active !== undefined) {
      db.prepare('UPDATE user_accounts SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
    }
    if (username?.trim()) {
      db.prepare('UPDATE user_accounts SET username = ? WHERE id = ?').run(username.trim(), id)
    }
    if (password?.trim()) {
      const hash = await bcrypt.hash(password, 10)
      db.prepare('UPDATE user_accounts SET password_hash = ? WHERE id = ?').run(hash, id)
    }

    const updatedUser = db
      .prepare('SELECT id, username, role, active, created_at FROM user_accounts WHERE id = ?')
      .get(id)

    return Response.json({ user: updatedUser })
  } catch (err) {
    console.error('Admin users PATCH error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
