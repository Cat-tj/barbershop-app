import db from '@/lib/sqlite'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'romebois-barbershop-secret-key-2026'

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession
    return decoded
  } catch {
    return null
  }
}

export function signToken(session: UserSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '7d' })
}

export async function login(username: string, password: string): Promise<{ token: string; user: UserSession } | null> {
  const user = db.prepare('SELECT * FROM user_accounts WHERE username = ? AND active = 1').get(username) as {
    id: number
    username: string
    password_hash: string
    role: 'admin' | 'user' | 'capster'
  } | undefined

  if (!user) return null

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return null

  const session: UserSession = { id: user.id, username: user.username, role: user.role }
  const token = signToken(session)
  return { token, user: session }
}

export interface UserSession {
  id: number
  username: string
  role: 'admin' | 'user' | 'capster'
  capster_id?: number
  employee_id?: number
}

/**
 * Registry permission keys
 */
export const PERMISSION_KEYS = {
  // Dashboard
  DASHBOARD_OPERATIONAL: 'dashboard.view_operational',
  DASHBOARD_REVENUE: 'dashboard.view_revenue',
  DASHBOARD_STAFF_PERFORMANCE: 'dashboard.view_staff_performance',

  // POS
  POS_ACCESS: 'pos.access',
  POS_CREATE_SALE: 'pos.create_sale',
  POS_APPLY_DISCOUNT: 'pos.apply_discount',

  // Bookings & Queue
  BOOKING_VIEW: 'booking.view',
  BOOKING_CREATE: 'booking.create',
  BOOKING_MANAGE: 'booking.manage',
  QUEUE_VIEW: 'queue.view',
  QUEUE_MANAGE: 'queue.manage',

  // HRIS & Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  ATTENDANCE_VIEW_ALL: 'attendance.view_all',
  ATTENDANCE_VIEW_SELF: 'attendance.view_self',
  PAYROLL_VIEW_ALL: 'payroll.view_all',
  PAYROLL_VIEW_SELF: 'payroll.view_self',

  // Settings & Permissions
  SETTINGS_ACCESS: 'settings.access',
  SETTINGS_USERS: 'settings.users',
  SETTINGS_PERMISSIONS: 'settings.permissions',
} as const

/**
 * Check whether a user has a specific permission key.
 * Evaluates: User Override Deny > User Override Allow > Role Default
 */
export function hasPermission(userId: number, role: string, permissionKey: string): boolean {
  if (role === 'admin') return true

  // 1. Check user_permissions override
  const override = db.prepare(`
    SELECT up.effect 
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = ? AND p.key = ?
  `).get(userId, permissionKey) as { effect: 'allow' | 'deny' } | undefined

  if (override) {
    return override.effect === 'allow'
  }

  // 2. Check role default permission
  const rolePerm = db.prepare(`
    SELECT rp.allowed
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE r.name = ? AND p.key = ?
  `).get(role, permissionKey) as { allowed: number } | undefined

  return rolePerm ? Boolean(rolePerm.allowed) : false
}

/**
 * Audit Log Helper
 */
export function logAuditEvent(actor: string, action: string, entityType: string, entityId?: string | number, beforeVal?: object, afterVal?: object, reason?: string) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (actor, action, entity_type, entity_id, before_value, after_value, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      actor,
      action,
      entityType,
      entityId ? String(entityId) : null,
      beforeVal ? JSON.stringify(beforeVal) : null,
      afterVal ? JSON.stringify(afterVal) : null,
      reason || null
    )
  } catch (err) {
    console.error('Failed to log audit event:', err)
  }
}
