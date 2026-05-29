import { SignJWT, jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'romebois-secret-key-change-in-production'
)

export interface UserSession {
  id: number
  username: string
  role: 'admin' | 'user'
}

export async function login(username: string, password: string): Promise<{ token: string; user: UserSession } | null> {
  const { data: account } = await supabase
    .from('user_accounts')
    .select('id, username, password_hash, role, active')
    .eq('username', username)
    .single()

  if (!account || !account.active) return null

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) return null

  const user: UserSession = { id: account.id, username: account.username, role: account.role as 'admin' | 'user' }

  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(JWT_SECRET)

  return { token, user }
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}
