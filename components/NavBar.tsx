'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/settings', label: 'Settings' },
  { href: '/ask-ai', label: 'Ask AI' },
]

const HIDDEN_PATHS = ['/login', '/auth/']

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null

  async function handleSignOut() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b14]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 text-xs">
            S
          </span>
          SocialAI
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-white/5 hover:text-white ${
                  pathname.startsWith(link.href) ? 'text-white' : 'text-gray-400'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => void handleSignOut()}
            className="ml-3 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white/5 hover:text-gray-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
