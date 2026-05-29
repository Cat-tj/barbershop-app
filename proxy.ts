import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'romebois-secret-key-change-in-production'
)

const PUBLIC_ROUTES = ['/booking', '/login', '/catalog', '/register']
const ADMIN_ROUTES = ['/admin', '/store', '/calendar', '/dashboard']
const USER_ROUTES = ['/purchases']

interface SessionPayload {
  id: number
  username: string
  role: 'admin' | 'user'
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes without auth
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie?.value) {
    return redirectToLogin(request)
  }

  return verifyAndRoute(request, sessionCookie.value, pathname)
}

async function verifyAndRoute(request: NextRequest, token: string, pathname: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const session = payload as unknown as SessionPayload

    // Check admin route access
    if (ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
      if (session.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Check user route access
    if (USER_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
      if (session.role !== 'user' && session.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    return redirectToLogin(request)
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(loginUrl)
  response.cookies.delete('session')
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
