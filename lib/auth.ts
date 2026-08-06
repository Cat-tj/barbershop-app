import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import db from './sqlite'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'romebois-secret-key-change-in-production'
)

export interface UserSession {
  id: number
  username: string
  role: 'admin' | 'user'
}

export async function login(username: string, password: string): Promise<{ token: string; user: UserSession } | null> {
  const account = db
    .prepare('SELECT id, username, password_hash, role, active FROM user_accounts WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string; role: string; active: number } | undefined

  if (!account || !account.active) {
    console.log('SQLite: Account not found or inactive for:', username)
    return null
  }

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) {
    console.log('SQLite: Invalid password for:', username)
    return null
  }

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
