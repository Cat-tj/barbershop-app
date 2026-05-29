import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, username, role, active, created_at')
      .order('username')

    if (error) {
      console.error('Failed to fetch users:', error)
      return Response.json({ error: 'Failed to fetch users.' }, { status: 500 })
    }

    return Response.json({ users: data })
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

    // Check for existing username
    const { data: existing } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Username already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('user_accounts')
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        role: role || 'user',
        active: true,
      })
      .select('id, username, role, active, created_at')
      .single()

    if (error) {
      console.error('Failed to create user:', error)
      return Response.json({ error: 'Failed to create user.' }, { status: 500 })
    }

    return Response.json({ user: data }, { status: 201 })
  } catch (err) {
    console.error('Admin users POST error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// Also handle PATCH for role/active toggles (from the same route)
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

    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (active !== undefined) updates.active = active
    if (username?.trim()) updates.username = username.trim()
    if (password?.trim()) {
      updates.password_hash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_accounts')
      .update(updates)
      .eq('id', id)
      .select('id, username, role, active, created_at')
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return Response.json({ error: 'Failed to update user.' }, { status: 500 })
    }

    return Response.json({ user: data })
  } catch (err) {
    console.error('Admin users PATCH error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
