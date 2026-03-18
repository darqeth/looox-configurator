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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register')
  const isPendingPage = pathname === '/pending'

  // Not logged in → stuur naar login
  if (!user) {
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
  if (!isPendingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.approval_status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    if (profile.approval_status === 'rejected') {
      return NextResponse.redirect(
        new URL('/pending?rejected=true', request.url)
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
