import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NavBar } from '@/components/NavBar'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SocialAI',
  description: 'AI-powered social media management powered by Claude',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#0a0b14', color: '#f1f1f3' }}>
        <div className="min-h-screen flex flex-col">
          <NavBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
          <footer className="border-t border-white/5 py-4 text-center text-xs text-gray-600">
            Powered by Claude claude-sonnet-4-6 · Apify · Supabase
          </footer>
        </div>
      </body>
    </html>
  )
}
