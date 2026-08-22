import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Securely fetch the user - Authentication only
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes: Require authentication only
  // Authorization is handled in the admin layout
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect tickets routes: Require authentication
  if (request.nextUrl.pathname.startsWith('/tickets')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect rooms route: Require authentication (resident-facing catalog
  // + booking flow, same pattern as /profile and /retention).
  if (request.nextUrl.pathname.startsWith('/rooms')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect retention route: Require authentication (resident-facing,
  // same pattern as /profile — not scoped under /admin).
  if (request.nextUrl.pathname.startsWith('/retention')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect profile route: Require authentication.
  // Any signed-in role (resident/staff/admin) can view/edit their own
  // profile, so this isn't scoped under /admin.
  if (request.nextUrl.pathname.startsWith('/profile')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login page.
  // IMPORTANT: only on GET. The login form submits via a Server Action,
  // which is a POST to this same '/login' path — intercepting that with
  // a plain redirect here breaks the Action's expected response format
  // and surfaces as "An unexpected response was received from the server"
  // on the client.
  if (request.nextUrl.pathname === '/login' && request.method === 'GET') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // Fixed: routes to central dashboard to prevent redirect loop
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     * - api/auth (auth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}