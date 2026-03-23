'use client'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowser()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#0a0b14' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 text-xl font-bold text-white">
            S
          </div>
          <h1 className="text-xl font-bold text-white">SocialAI</h1>
        </div>

        {sent ? (
          <div className="rounded-xl border border-white/5 bg-[#111218] p-7 text-center">
            <div className="mb-3 text-3xl">✉️</div>
            <p className="text-sm font-semibold text-white">Check your email</p>
            <p className="mt-2 text-xs text-gray-500">
              We sent a magic link to <span className="text-gray-300">{email}</span>.
              Click it to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-5 text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#111218] p-7">
            <h2 className="mb-1 text-sm font-semibold text-white">Sign in</h2>
            <p className="mb-5 text-xs text-gray-500">
              Enter your email and we&apos;ll send you a magic link.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
