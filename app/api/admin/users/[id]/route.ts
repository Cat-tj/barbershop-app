import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import db from '@/lib/sqlite'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookie = request.cookies.get('session')?.value
  if (!cookie) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const session = await verifyToken(cookie)
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id, 10)
  if (isNaN(userId)) {
    return Response.json({ error: 'Invalid user ID.' }, { status: 400 })
  }

  if (userId === session.id) {
    return Response.json({ error: 'Cannot delete your own account.' }, { status: 400 })
  }

  try {
    db.prepare('DELETE FROM user_accounts WHERE id = ?').run(userId)
    return Response.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    return Response.json({ error: 'Failed to delete user.' }, { status: 500 })
  }
}
