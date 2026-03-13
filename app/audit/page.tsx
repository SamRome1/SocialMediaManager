'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostCard } from '@/components/PostCard'
import { AuditResult } from '@/components/AuditResult'
import { PlatformBadge } from '@/components/PlatformBadge'
import type { Post, Audit } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

export default function AuditPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram')
  const [scrapeHandle, setScrapeHandle] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [loadingScrape, setLoadingScrape] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoadingPosts(true)
    setError(null)
    try {
      const [postsRes, auditsRes] = await Promise.all([
        fetch(`/api/posts?platform=${selectedPlatform}`),
        fetch(`/api/audits?platform=${selectedPlatform}`),
      ])
      if (postsRes.ok) setPosts(await postsRes.json() as Post[])
      if (auditsRes.ok) setAudits(await auditsRes.json() as Audit[])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoadingPosts(false)
    }
  }, [selectedPlatform])

  useEffect(() => { void fetchData() }, [fetchData])

  async function handleScrape() {
    if (!scrapeHandle.trim()) return
    setLoadingScrape(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, handle: scrapeHandle }),
      })
      const data = await res.json() as { error?: string; inserted?: number }
      if (!res.ok) throw new Error(data.error ?? 'Scrape failed')
      setSuccessMsg(`Scrape complete — ${data.inserted} posts imported`)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed')
    } finally {
      setLoadingScrape(false)
    }
  }

  async function handleAudit() {
    setLoadingAudit(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform }),
      })
      const data = await res.json() as { error?: string; audit?: Audit }
      if (!res.ok) throw new Error(data.error ?? 'Audit failed')
      setSuccessMsg('Audit complete!')
      if (data.audit) setAudits((prev) => [data.audit!, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setLoadingAudit(false)
    }
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit</h1>
          <p className="mt-0.5 text-sm text-gray-500">Scrape posts and get AI-powered performance analysis.</p>
        </div>
        <button
          onClick={handleAudit}
          disabled={loadingAudit || posts.length === 0}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loadingAudit ? 'Auditing…' : 'Run AI Audit'}
        </button>
      </div>

      {/* Platform selector */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              selectedPlatform === p
                ? 'bg-white text-gray-900'
                : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Scrape panel */}
      <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Import from <PlatformBadge platform={selectedPlatform} size="sm" />
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={scrapeHandle}
            onChange={(e) => setScrapeHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleScrape()}
            placeholder="@handle or profile URL"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
          <button
            onClick={handleScrape}
            disabled={loadingScrape || !scrapeHandle.trim()}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            {loadingScrape ? 'Scraping…' : 'Scrape'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Audit results */}
      {audits.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Audit History</p>
          {audits.map((audit) => (
            <AuditResult key={audit.id} audit={audit} />
          ))}
        </section>
      )}

      {/* Posts */}
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
          Posts ({posts.length})
        </p>

        {loadingPosts ? (
          <div className="py-14 text-center text-sm text-gray-600">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/5 py-14 text-center">
            <p className="text-sm text-gray-500">No posts for this platform.</p>
            <p className="mt-1 text-xs text-gray-600">Enter a handle above and click Scrape.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
