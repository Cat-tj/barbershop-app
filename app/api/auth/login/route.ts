import { type NextRequest } from 'next/server'
import { login } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body as { username: string; password: string }

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const result = await login(username, password)

    if (!result) {
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const isProd = process.env.NODE_ENV === 'production'

    const response = Response.json({
      user: { id: result.user.id, username: result.user.username, role: result.user.role },
      token: result.token,
    })

    response.headers.set(
      'Set-Cookie',
      `session=${result.token}; HttpOnly; Path=/; Max-Age=${12 * 60 * 60}; SameSite=Lax${isProd ? '; Secure' : ''}`
    )

    return response
  } catch (err) {
    console.error('Login API error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
