'use client'

import { useState } from 'react'
import { PlatformBadge } from './PlatformBadge'
import { AuditResult } from './AuditResult'
import type { Audit } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

type RefreshResult = {
  platform: string
  handle: string
  inserted: number
  skipped: number
  errors: number
  error?: string
}

export function AuditPanel({ onScrapeComplete }: { onScrapeComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [handle, setHandle] = useState('')
  const [scrapePeriod, setScrapePeriod] = useState<'1w' | '1m' | '3m' | '6m'>('1m')
  const [loadingScrape, setLoadingScrape] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [loadingRefreshAll, setLoadingRefreshAll] = useState(false)
  const [refreshResults, setRefreshResults] = useState<RefreshResult[] | null>(null)
  const [latestAudit, setLatestAudit] = useState<Audit | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleRefreshAll() {
    setLoadingRefreshAll(true)
    setMsg(null)
    setRefreshResults(null)
    try {
      const res = await fetch('/api/scrape-all', { method: 'POST' })
      const data = await res.json() as { error?: string; results?: RefreshResult[]; totalInserted?: number }
      if (!res.ok) throw new Error(data.error ?? 'Refresh failed')
      setRefreshResults(data.results ?? [])
      setMsg({ type: 'success', text: `Refresh complete — ${data.totalInserted ?? 0} new posts imported` })
      onScrapeComplete?.()
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Refresh failed' })
    } finally {
      setLoadingRefreshAll(false)
    }
  }

  async function handleScrape() {
    if (!handle.trim()) return
    setLoadingScrape(true)
    setMsg(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, handle, timePeriod: scrapePeriod }),
      })
      const data = await res.json() as { error?: string; inserted?: number; skipped?: number }
      if (!res.ok) throw new Error(data.error ?? 'Scrape failed')
      const skippedNote = data.skipped ? ` (${data.skipped} duplicates skipped)` : ''
      setMsg({ type: 'success', text: `Imported ${data.inserted} posts from ${handle}${skippedNote}` })
      onScrapeComplete?.()
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Scrape failed' })
    } finally {
      setLoadingScrape(false)
    }
  }

  async function handleAudit() {
    setLoadingAudit(true)
    setMsg(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json() as { error?: string; audit?: Audit }
      if (!res.ok) throw new Error(data.error ?? 'Audit failed')
      setLatestAudit(data.audit ?? null)
      setMsg({ type: 'success', text: 'Audit complete!' })
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Audit failed' })
    } finally {
      setLoadingAudit(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218]">
      {/* Toggle header */}
      <div className="flex w-full items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-xs font-bold text-white">
            ✦
          </span>
          <span className="text-sm font-semibold text-white">Scrape & Audit</span>
          <span className="text-xs text-gray-600">Import posts + run AI analysis</span>
          <span className="text-gray-600 transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            ▾
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); void handleRefreshAll() }}
          disabled={loadingRefreshAll || loadingScrape}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          title="Re-scrape all previously imported accounts (last 3 months)"
        >
          {loadingRefreshAll ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Refreshing…
            </>
          ) : (
            <>↻ Refresh All</>
          )}
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-white/5 px-5 pb-5 pt-4">
          {/* Platform selector */}
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  platform === p
                    ? 'bg-white text-gray-900'
                    : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Scrape time range */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Scrape time range</p>
            <div className="flex gap-1.5">
              {(['1w', '1m', '3m', '6m'] as const).map((period) => {
                const labels = { '1w': '1 Week', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' }
                return (
                  <button
                    key={period}
                    onClick={() => setScrapePeriod(period)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      scrapePeriod === period
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

          {/* Scrape row */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
              Import from <PlatformBadge platform={platform} size="sm" />
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleScrape()}
                placeholder="@handle or profile URL"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                onClick={() => void handleScrape()}
                disabled={loadingScrape || !handle.trim()}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {loadingScrape ? 'Scraping…' : 'Scrape'}
              </button>
            </div>
          </div>

          {/* Audit button */}
          <button
            onClick={() => void handleAudit()}
            disabled={loadingAudit}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {loadingAudit ? 'Running AI Audit…' : `Run AI Audit on ${PLATFORM_LABELS[platform]}`}
          </button>

          {/* Feedback */}
          {msg && (
            <div className={`rounded-lg border p-3 text-sm ${
              msg.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}>
              {msg.text}
            </div>
          )}

          {/* Refresh All results */}
          {refreshResults && refreshResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Refresh Results</p>
              {refreshResults.map((r) => (
                <div
                  key={`${r.platform}-${r.handle}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformBadge platform={r.platform as Platform} size="sm" />
                    <span className="truncate text-xs text-gray-400">{r.handle}</span>
                  </div>
                  {r.error ? (
                    <span className="shrink-0 text-xs text-red-400">{r.error}</span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                      <span className="text-emerald-400 font-semibold">+{r.inserted} new</span>
                      <span>{r.skipped} skipped</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Latest audit result */}
          {latestAudit && <AuditResult audit={latestAudit} />}
        </div>
      )}
    </div>
  )
}
