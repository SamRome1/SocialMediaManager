'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlatformBadge } from './PlatformBadge'
import type { Post } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function engRate(post: Post): number | null {
  if (!post.reach || post.reach === 0) return null
  return ((post.likes + post.comments + post.shares) / post.reach) * 100
}

function engRateColor(rate: number): string {
  if (rate >= 6) return 'text-emerald-400'
  if (rate >= 3) return 'text-yellow-400'
  return 'text-gray-400'
}

type FilterPlatform = Platform | 'all'

export function PostsTable() {
  const [selected, setSelected] = useState<FilterPlatform>('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const url = selected === 'all'
        ? '/api/posts?limit=100'
        : `/api/posts?platform=${selected}&limit=100`
      const res = await fetch(url)
      if (res.ok) setPosts(await res.json() as Post[])
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { void fetchPosts() }, [fetchPosts])

  const sorted = [...posts].sort((a, b) => b.reach - a.reach)

  return (
    <div>
      {/* Platform toggle */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelected('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            selected === 'all'
              ? 'bg-white text-gray-900'
              : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selected === p
                ? 'bg-white text-gray-900'
                : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-600">
                Post
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gray-600">
                Views
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gray-600">
                Likes
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gray-600">
                Comments
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gray-600">
                Eng. Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-600">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-600">
                  No posts yet. Run a scrape from the Audit page.
                </td>
              </tr>
            ) : (
              sorted.map((post, i) => {
                const rate = engRate(post)
                const date = new Date(post.posted_at)
                const dateStr = isNaN(date.getTime())
                  ? ''
                  : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                return (
                  <tr
                    key={post.id}
                    className={`border-b border-white/[0.03] transition hover:bg-white/[0.02] ${
                      i % 2 === 0 ? '' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="max-w-xs px-4 py-3">
                      <div className="flex items-start gap-2">
                        <PlatformBadge platform={post.platform} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-200">
                            {post.content.slice(0, 80) || '(no caption)'}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-600">{dateStr}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {fmt(post.reach)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {fmt(post.likes)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {fmt(post.comments)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${rate !== null ? engRateColor(rate) : 'text-gray-600'}`}>
                      {rate !== null ? `${rate.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
