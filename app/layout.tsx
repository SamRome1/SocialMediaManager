import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SocialAI',
  description: 'AI-powered social media management powered by Claude',
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/settings', label: 'Settings' },
  { href: '/ask-ai', label: 'Ask AI' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#0a0b14', color: '#f1f1f3' }}>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b14]/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 text-xs">
                  S
                </span>
                SocialAI
              </Link>
              <nav className="flex items-center gap-0.5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>

          <footer className="border-t border-white/5 py-4 text-center text-xs text-gray-600">
            Powered by Claude claude-sonnet-4-6 · Apify · Supabase
          </footer>
        </div>
      </body>
    </html>
  )
}
