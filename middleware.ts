import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Validates JWT and refreshes the session token if needed.
  // Must be called before any other logic.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const PUBLIC_PATHS = ['/login', '/auth/callback']
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  // Cron is protected by CRON_SECRET header, not user session
  const isCron = pathname === '/api/cron'
  // Internal endpoints are protected by INTERNAL_API_SECRET header, not user session
  const isInternal = pathname.startsWith('/api/internal/')

  if (!user && !isPublic && !isCron && !isInternal) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
