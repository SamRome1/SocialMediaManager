'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlatformBadge } from '@/components/PlatformBadge'
import { PostsTable } from '@/components/PostsTable'
import { AuditPanel } from '@/components/AuditPanel'
import type { Post, Profile, PlatformStat } from '@/types'
import { PLATFORM_LABELS, type Platform } from '@/types'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function growthPct(current: number, previous: number): number | null {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function buildPlatformStats(
  posts: Array<{ platform: string; likes: number; comments: number; shares: number; reach: number }>,
): PlatformStat[] {
  const map: Record<string, PlatformStat> = {}

  for (const p of posts) {
    if (!map[p.platform]) {
      map[p.platform] = {
        platform: p.platform,
        posts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        avgEngRate: 0,
      }
    }
    const s = map[p.platform]
    s.posts++
    s.totalViews += p.reach
    s.totalLikes += p.likes
    s.totalComments += p.comments
    s.totalShares += p.shares
  }

  return Object.values(map).map((s) => ({
    ...s,
    avgEngRate:
      s.totalViews > 0
        ? ((s.totalLikes + s.totalComments + s.totalShares) / s.totalViews) * 100
        : 0,
  }))
}

export default function DashboardPage() {
  const [timePeriod, setTimePeriod] = useState<'1w' | '1m' | '3m' | '6m'>('1m')
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState<{
    postStats: Array<{ platform: string; likes: number; comments: number; shares: number; reach: number }>
    topPosts: Post[]
    profiles: Profile[]
    settings: any
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await fetch('/api/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timePeriod }),
        })
        if (res.ok) {
          const dashData = await res.json()
          setData(dashData)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [timePeriod, refreshKey])

  if (loading || !data) {
    return (
      <div className="space-y-10">
        <div className="animate-pulse">
          <div className="h-8 w-32 rounded bg-white/10" />
          <div className="mt-2 h-4 w-48 rounded bg-white/5" />
        </div>
      </div>
    )
  }

  const { postStats, topPosts, profiles, settings } = data
  const platformStats = buildPlatformStats(postStats)
  const activePlatforms = (settings?.platforms as string[] | null) ?? []

  const totalViews = postStats.reduce((s, p) => s + p.reach, 0)
  const totalLikes = postStats.reduce((s, p) => s + p.likes, 0)
  const totalComments = postStats.reduce((s, p) => s + p.comments, 0)
  const totalFollowers = profiles.reduce((s, p) => s + p.followers, 0)

  // Deduplicate profiles: latest per platform
  const profileByPlatform = profiles.reduce<Record<string, Profile>>((acc, p) => {
    if (!acc[p.platform]) acc[p.platform] = p
    return acc
  }, {})

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            {settings?.brand_name ?? 'Dashboard'}
          </h1>
          {settings?.niche && (
            <p className="mt-0.5 text-sm text-gray-500">{settings.niche}</p>
          )}
        </div>
        {!settings && (
          <Link href="/settings" className="text-xs text-amber-400 hover:underline">
            ⚠ Configure settings →
          </Link>
        )}
      </div>

      {/* ── Time Period Selector ────────────────────────────────── */}
      <div className="flex gap-2">
        {(['1w', '1m', '3m', '6m'] as const).map((period) => {
          const labels = { '1w': '1 Week', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' }
          const isActive = timePeriod === period
          return (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {labels[period]}
            </button>
          )
        })}
      </div>

      {/* Scrape & Audit panel */}
      <AuditPanel timePeriod={timePeriod} onScrapeComplete={() => setRefreshKey((k) => k + 1)} />

      {/* ── CHANNELS ─────────────────────────────────────────────────────────── */}
      {activePlatforms.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Channels
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activePlatforms.map((platform) => {
              const profile = profileByPlatform[platform]
              const stat = platformStats.find((s) => s.platform === platform)
              const growth = profile
                ? growthPct(profile.followers, profile.previous_followers)
                : null

              return (
                <div
                  key={platform}
                  className="rounded-xl border border-white/5 bg-[#111218] p-5"
                >
                  <div className="flex items-center justify-between">
                    <PlatformBadge platform={platform} />
                    {profile?.handle && (
                      <span className="text-xs text-gray-600">@{profile.handle}</span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xl font-bold text-white">
                        {profile ? fmt(profile.followers) : '—'}
                      </p>
                      <p className="text-xs text-gray-600">Followers</p>
                      {growth !== null && (
                        <p className={`mt-0.5 text-xs font-semibold ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">
                        {stat ? fmt(stat.posts) : '—'}
                      </p>
                      <p className="text-xs text-gray-600">Posts</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">
                        {stat ? fmt(stat.totalViews) : '—'}
                      </p>
                      <p className="text-xs text-gray-600">Total Views</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── ALL-TIME COMBINED ────────────────────────────────────────────────── */}
      <section>
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
          All-Time Combined
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Views', value: fmt(totalViews), color: 'text-cyan-400' },
            { label: 'Total Likes', value: fmt(totalLikes), color: 'text-pink-400' },
            { label: 'Total Comments', value: fmt(totalComments), color: 'text-purple-400' },
            { label: 'Total Followers', value: fmt(totalFollowers), color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-[#111218] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">{label}</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOP PERFORMERS ───────────────────────────────────────────────────── */}
      {topPosts.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Top Performers (Combined Platforms)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {topPosts.map((post, i) => {
              const date = new Date(post.posted_at)
              const dateStr = isNaN(date.getTime())
                ? ''
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const engRate =
                post.reach > 0
                  ? (((post.likes + post.comments + post.shares) / post.reach) * 100).toFixed(2)
                  : null

              return (
                <div
                  key={post.id}
                  className="relative rounded-xl border border-white/5 bg-[#111218] p-5 overflow-hidden"
                >
                  {/* Rank number watermark */}
                  <span className="absolute right-4 top-2 text-6xl font-black text-white/[0.04] select-none">
                    {i + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={post.platform} size="sm" />
                    <span className="text-xs text-gray-600">{dateStr}</span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-200 leading-snug">
                    {post.content.slice(0, 100) || '(no caption)'}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-lg font-bold text-cyan-400">{fmt(post.reach)}</p>
                      <p className="text-xs text-gray-600">Combined Views</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-pink-400">{fmt(post.likes)}</p>
                      <p className="text-xs text-gray-600">Likes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{fmt(post.comments)}</p>
                      <p className="text-xs text-gray-600">Comments</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${engRate ? 'text-emerald-400' : 'text-gray-600'}`}>
                        {engRate ? `${engRate}%` : '—'}
                      </p>
                      <p className="text-xs text-gray-600">Eng. Rate</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── ALL POSTS TABLE ──────────────────────────────────────────────────── */}
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
          All Posts
        </p>
        <PostsTable />
      </section>

      {/* ── CROSS-PLATFORM COMPARISON ────────────────────────────────────────── */}
      {platformStats.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Cross-Platform Comparison
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {['Platform', 'Posts', 'Total Views', 'Total Likes', 'Comments', 'Avg Eng. Rate'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-600 ${h === 'Platform' ? 'text-left' : 'text-right'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platformStats
                  .sort((a, b) => b.totalViews - a.totalViews)
                  .map((stat, i) => (
                    <tr
                      key={stat.platform}
                      className={`border-b border-white/[0.03] transition hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    >
                      <td className="px-4 py-3">
                        <PlatformBadge platform={stat.platform} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{stat.posts}</td>
                      <td className="px-4 py-3 text-right font-semibold text-cyan-400">
                        {fmt(stat.totalViews)}
                      </td>
                      <td className="px-4 py-3 text-right text-pink-400">
                        {fmt(stat.totalLikes)}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-400">
                        {fmt(stat.totalComments)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        stat.avgEngRate >= 6
                          ? 'text-emerald-400'
                          : stat.avgEngRate >= 3
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                      }`}>
                        {stat.avgEngRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}
