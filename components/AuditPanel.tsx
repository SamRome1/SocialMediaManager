'use client'

import { useState } from 'react'
import { PlatformBadge } from './PlatformBadge'
import { AuditResult } from './AuditResult'
import type { Audit } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

export function AuditPanel() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [handle, setHandle] = useState('')
  const [loadingScrape, setLoadingScrape] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [latestAudit, setLatestAudit] = useState<Audit | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleScrape() {
    if (!handle.trim()) return
    setLoadingScrape(true)
    setMsg(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, handle }),
      })
      const data = await res.json() as { error?: string; inserted?: number }
      if (!res.ok) throw new Error(data.error ?? 'Scrape failed')
      setMsg({ type: 'success', text: `Imported ${data.inserted} posts from ${handle}` })
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
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-xs font-bold text-white">
            ✦
          </span>
          <span className="text-sm font-semibold text-white">Scrape & Audit</span>
          <span className="text-xs text-gray-600">Import posts + run AI analysis</span>
        </div>
        <span className="text-gray-600 transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          ▾
        </span>
      </button>

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

          {/* Latest audit result */}
          {latestAudit && <AuditResult audit={latestAudit} />}
        </div>
      )}
    </div>
  )
}
