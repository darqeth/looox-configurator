import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() verifieert de JWT lokaal via de project-JWKS (ES256) — geen
  // netwerkcall naar de Auth-server per request zoals getUser() deed.
  // Vernieuwt net als getUser een verlopen sessie via de refresh token.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/invite/')
  const isPendingPage = pathname === '/pending'

  // Not logged in → stuur naar login
  if (!claims) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Ingelogd op auth pagina → stuur naar dashboard
  if (isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check approval status (niet op pending pagina zelf)
  // approval_status is synced to auth.users.raw_app_meta_data via DB trigger,
  // so it's available directly from getUser() without an extra profiles query.
  // Run `supabase/improvements-migration.sql` to enable this optimisation.
  if (!isPendingPage) {
    const appMetadata = claims.app_metadata as { approval_status?: string } | undefined
    const approvalStatus = appMetadata?.approval_status ?? null

    if (approvalStatus === null) {
      // Fallback: trigger not yet run — query profiles table directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', claims.sub)
        .single()

      const status = profile?.approval_status ?? null
      if (!status || status === 'pending') {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
      if (status === 'rejected') {
        return NextResponse.redirect(new URL('/pending?rejected=true', request.url))
      }
    } else {
      if (approvalStatus === 'pending') {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
      if (approvalStatus === 'rejected') {
        return NextResponse.redirect(new URL('/pending?rejected=true', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
