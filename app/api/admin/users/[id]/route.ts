import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkAuth(request: NextRequest) {
  const cookie = request.cookies.get('session')?.value
  if (!cookie) {
    return { authorized: false, status: 401, body: { error: 'Authentication required.' }, session: null }
  }

  const session = await verifyToken(cookie)
  if (!session) {
    return { authorized: false, status: 401, body: { error: 'Invalid or expired session.' }, session: null }
  }

  if (session.role !== 'admin') {
    return { authorized: false, status: 403, body: { error: 'Admin access required.' }, session: null }
  }

  return { authorized: true, status: 200, body: null, session }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth(request)
  if (!auth.authorized) {
    return Response.json(auth.body, { status: auth.status })
  }

  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    if (isNaN(userId)) {
      return Response.json({ error: 'Invalid user ID.' }, { status: 400 })
    }

    const body = await request.json()
    const { role, active } = body as { role?: 'admin' | 'user'; active?: boolean }

    if (role === undefined && active === undefined) {
      return Response.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (active !== undefined) updates.active = active

    const { data, error } = await supabase
      .from('user_accounts')
      .update(updates)
      .eq('id', userId)
      .select('id, username, role, active, created_at')
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return Response.json({ error: 'Failed to update user.' }, { status: 500 })
    }

    return Response.json({ user: data })
  } catch (err) {
    console.error('Admin user PATCH error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth(request)
  if (!auth.authorized) {
    return Response.json(auth.body, { status: auth.status })
  }

  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    if (isNaN(userId)) {
      return Response.json({ error: 'Invalid user ID.' }, { status: 400 })
    }

    // Prevent self-deletion
    if (auth.session && auth.session.id === userId) {
      return Response.json({ error: 'Cannot delete your own account.' }, { status: 403 })
    }

    const { error } = await supabase
      .from('user_accounts')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Failed to delete user:', error)
      return Response.json({ error: 'Failed to delete user.' }, { status: 500 })
    }

    return Response.json({ success: true, message: 'User deleted.' })
  } catch (err) {
    console.error('Admin user DELETE error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
