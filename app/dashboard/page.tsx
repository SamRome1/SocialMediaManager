'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlatformBadge } from '@/components/PlatformBadge'
import { PostsTable } from '@/components/PostsTable'
import { AuditPanel } from '@/components/AuditPanel'
import { ViewsChart } from '@/components/charts/ViewsChart'
import { EngagementChart } from '@/components/charts/EngagementChart'
import { PlatformBarChart } from '@/components/charts/PlatformBarChart'
import { PlatformDonut } from '@/components/charts/PlatformDonut'
import { BestDayChart } from '@/components/charts/BestDayChart'
import type { Post, Profile } from '@/types'
import { PLATFORM_LABELS, type Platform } from '@/types'

// ─── Platform colors ─────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c',
  tiktok: '#69c9d0',
  twitter: '#1d9bf0',
  linkedin: '#0a66c2',
  youtube: '#ff4444',
  facebook: '#1877f2',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type RawPost = {
  platform: string
  posted_at: string
  likes: number
  comments: number
  shares: number
  reach: number
}

type TimePoint = {
  date: string
  label: string
  views: number
  likes: number
  comments: number
  shares: number
  engRate: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function pct(a: number, b: number): string {
  if (!b) return '—'
  return `${((a / b) * 100).toFixed(2)}%`
}

function getMondayKey(d: Date): string {
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return mon.toISOString().slice(0, 10)
}

function buildTimeSeries(rawPosts: RawPost[], timePeriod: '1w' | '1m' | '3m' | '6m'): TimePoint[] {
  const useWeeks = timePeriod === '3m' || timePeriod === '6m'
  const daysBack = { '1w': 7, '1m': 30, '3m': 91, '6m': 182 }[timePeriod]

  const buckets = new Map<string, { views: number; likes: number; comments: number; shares: number }>()
  for (const post of rawPosts) {
    const d = new Date(post.posted_at)
    const key = useWeeks ? getMondayKey(d) : d.toISOString().slice(0, 10)
    if (!buckets.has(key)) buckets.set(key, { views: 0, likes: 0, comments: 0, shares: 0 })
    const b = buckets.get(key)!
    b.views += post.reach
    b.likes += post.likes
    b.comments += post.comments
    b.shares += post.shares
  }

  const points: TimePoint[] = []
  const now = new Date()

  if (useWeeks) {
    const numWeeks = Math.ceil(daysBack / 7)
    for (let i = numWeeks - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = getMondayKey(d)
      const mon = new Date(key)
      const b = buckets.get(key) ?? { views: 0, likes: 0, comments: 0, shares: 0 }
      points.push({
        date: key,
        label: mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...b,
        engRate: b.views > 0 ? +((b.likes + b.comments + b.shares) / b.views * 100).toFixed(2) : 0,
      })
    }
  } else {
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const b = buckets.get(key) ?? { views: 0, likes: 0, comments: 0, shares: 0 }
      points.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...b,
        engRate: b.views > 0 ? +((b.likes + b.comments + b.shares) / b.views * 100).toFixed(2) : 0,
      })
    }
  }

  return points
}

function buildBestDayData(rawPosts: RawPost[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayData = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
  for (const post of rawPosts) {
    const day = new Date(post.posted_at).getDay()
    dayData[day].total += post.reach
    dayData[day].count++
  }
  return days.map((name, i) => ({
    name,
    avgViews: dayData[i].count > 0 ? Math.round(dayData[i].total / dayData[i].count) : 0,
    posts: dayData[i].count,
  }))
}

function buildPlatformData(rawPosts: RawPost[]) {
  const map: Record<string, { views: number; likes: number; comments: number; shares: number }> = {}
  for (const post of rawPosts) {
    if (!map[post.platform]) map[post.platform] = { views: 0, likes: 0, comments: 0, shares: 0 }
    map[post.platform].views += post.reach
    map[post.platform].likes += post.likes
    map[post.platform].comments += post.comments
    map[post.platform].shares += post.shares
  }
  return Object.entries(map).map(([platform, s]) => ({
    platform,
    name: PLATFORM_LABELS[platform as Platform] ?? platform,
    color: PLATFORM_COLORS[platform] ?? '#6b7280',
    views: s.views,
    likes: s.likes,
    comments: s.comments,
    shares: s.shares,
    engRate: s.views > 0 ? +((s.likes + s.comments + s.shares) / s.views * 100).toFixed(2) : 0,
  })).sort((a, b) => b.views - a.views)
}

function growthPct(current: number, previous: number): number | null {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = 'text-white',
}: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</p>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [timePeriod, setTimePeriod] = useState<'1w' | '1m' | '3m' | '6m'>('1m')
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState<{
    rawPosts: RawPost[]
    topPosts: Post[]
    profiles: Profile[]
    settings: { brand_name?: string; niche?: string; platforms?: string[] } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timePeriod }),
        })
        if (res.ok) setData(await res.json())
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [timePeriod, refreshKey])

  // ── Derived data ────────────────────────────────────────────────────────────
  const rawPosts = data?.rawPosts ?? []
  const profiles = data?.profiles ?? []
  const settings = data?.settings ?? null
  const topPosts = data?.topPosts ?? []

  const profileByPlatform = profiles.reduce<Record<string, Profile>>((acc, p) => {
    if (!acc[p.platform]) acc[p.platform] = p
    return acc
  }, {})
  const activePlatforms = (settings?.platforms as string[] | null) ?? []

  const totalViews = rawPosts.reduce((s, p) => s + p.reach, 0)
  const totalLikes = rawPosts.reduce((s, p) => s + p.likes, 0)
  const totalComments = rawPosts.reduce((s, p) => s + p.comments, 0)
  const totalShares = rawPosts.reduce((s, p) => s + p.shares, 0)
  const totalFollowers = Object.values(profileByPlatform).reduce((s, p) => s + p.followers, 0)
  const avgEngRate = totalViews > 0
    ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
    : 0

  const timeSeries = buildTimeSeries(rawPosts, timePeriod)
  const bestDayData = buildBestDayData(rawPosts)
  const platformData = buildPlatformData(rawPosts)
  const donutData = platformData.map((p) => ({ name: p.name, value: p.views, color: p.color }))

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-white/10" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 h-64 rounded-xl bg-white/5" />
          <div className="h-64 rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {settings?.brand_name ?? 'Dashboard'}
          </h1>
          {settings?.niche && (
            <p className="mt-0.5 text-sm text-gray-500">{settings.niche}</p>
          )}
          {!settings && (
            <Link href="/settings" className="mt-1 inline-block text-xs text-amber-400 hover:underline">
              ⚠ Configure settings →
            </Link>
          )}
        </div>

        {/* Time period selector */}
        <div className="flex gap-2">
          {(['1w', '1m', '3m', '6m'] as const).map((period) => {
            const labels = { '1w': '1 Week', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' }
            return (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  timePeriod === period
                    ? 'bg-cyan-500 text-white'
                    : 'border border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {labels[period]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Views" value={fmt(totalViews)} color="text-cyan-400" />
        <KpiCard label="Total Likes" value={fmt(totalLikes)} color="text-pink-400" />
        <KpiCard label="Total Comments" value={fmt(totalComments)} color="text-purple-400" />
        <KpiCard label="Followers" value={fmt(totalFollowers)} color="text-emerald-400" sub={`${Object.keys(profileByPlatform).length} platforms`} />
        <KpiCard label="Avg Eng Rate" value={`${avgEngRate.toFixed(2)}%`} color={avgEngRate >= 6 ? 'text-emerald-400' : avgEngRate >= 3 ? 'text-yellow-400' : 'text-gray-300'} />
        <KpiCard label="Posts" value={fmt(rawPosts.length)} color="text-white" sub={`in period`} />
      </div>

      {/* ── Views over time + Platform distribution ──────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Views Over Time">
            <ViewsChart data={timeSeries} />
          </ChartCard>
        </div>
        <ChartCard title="Platform Distribution">
          {donutData.length > 0 ? (
            <PlatformDonut data={donutData} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-600">
              No data yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Platform performance bar chart ──────────────────────────────────── */}
      {platformData.length > 0 && (
        <ChartCard title="Platform Performance">
          <PlatformBarChart data={platformData} />
        </ChartCard>
      )}

      {/* ── Engagement trend + Best day to post ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Engagement Trend">
          <EngagementChart data={timeSeries} />
        </ChartCard>
        <ChartCard title="Best Day to Post (Avg Views)">
          <BestDayChart data={bestDayData} />
        </ChartCard>
      </div>

      {/* ── Channels ────────────────────────────────────────────────────────── */}
      {activePlatforms.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Channels
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activePlatforms.map((platform) => {
              const profile = profileByPlatform[platform]
              const stat = platformData.find((s) => s.platform === platform)
              const growth = profile ? growthPct(profile.followers, profile.previous_followers) : null

              return (
                <div key={platform} className="rounded-xl border border-white/5 bg-[#111218] p-5">
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
                      <p className="text-xl font-bold text-white">{stat ? fmt(stat.views) : '—'}</p>
                      <p className="text-xs text-gray-600">Views</p>
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${stat && stat.engRate >= 6 ? 'text-emerald-400' : stat && stat.engRate >= 3 ? 'text-yellow-400' : 'text-white'}`}>
                        {stat ? `${stat.engRate.toFixed(1)}%` : '—'}
                      </p>
                      <p className="text-xs text-gray-600">Eng Rate</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Top Performers ──────────────────────────────────────────────────── */}
      {topPosts.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Top Performers
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {topPosts.map((post, i) => {
              const date = new Date(post.posted_at)
              const dateStr = isNaN(date.getTime())
                ? ''
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const engRate = post.reach > 0
                ? (((post.likes + post.comments + post.shares) / post.reach) * 100).toFixed(2)
                : null

              return (
                <div key={post.id} className="relative overflow-hidden rounded-xl border border-white/5 bg-[#111218] p-5">
                  <span className="absolute right-4 top-2 select-none text-6xl font-black text-white/[0.04]">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={post.platform} size="sm" />
                    <span className="text-xs text-gray-600">{dateStr}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-gray-200">
                    {post.content.slice(0, 100) || '(no caption)'}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-lg font-bold text-cyan-400">{fmt(post.reach)}</p>
                      <p className="text-xs text-gray-600">Views</p>
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
                      <p className="text-xs text-gray-600">Eng Rate</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Platform comparison table ────────────────────────────────────────── */}
      {platformData.length > 0 && (
        <section>
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Cross-Platform Breakdown
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {['Platform', 'Views', 'Likes', 'Comments', 'Shares', 'Eng Rate'].map((h) => (
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
                {platformData.map((stat, i) => (
                  <tr
                    key={stat.platform}
                    className={`border-b border-white/[0.03] transition hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="px-4 py-3">
                      <PlatformBadge platform={stat.platform} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-cyan-400">{fmt(stat.views)}</td>
                    <td className="px-4 py-3 text-right text-pink-400">{fmt(stat.likes)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{fmt(stat.comments)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{fmt(stat.shares)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      stat.engRate >= 6 ? 'text-emerald-400' : stat.engRate >= 3 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {stat.engRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Scrape & Audit ───────────────────────────────────────────────────── */}
      <AuditPanel onScrapeComplete={() => setRefreshKey((k) => k + 1)} />

      {/* ── All Posts Table ──────────────────────────────────────────────────── */}
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
          All Posts
        </p>
        <PostsTable />
      </section>

    </div>
  )
}
