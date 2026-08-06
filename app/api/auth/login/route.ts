import { type NextRequest } from 'next/server'
import { login } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body as { username: string; password: string }

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const cleanUsername = username.trim()
    const result = await login(cleanUsername, password)

    if (!result) {
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    return Response.json({
      user: { id: result.user.id, username: result.user.username, role: result.user.role },
      token: result.token,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Login API error:', message)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
