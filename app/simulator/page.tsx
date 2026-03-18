'use client'

import { useState, useEffect } from 'react'
import { PlatformBadge } from '@/components/PlatformBadge'
import { MediaSimulator } from '@/components/MediaSimulator'
import type {
  Simulation,
  ModelConfidence,
  PatternEvidence,
  PatternRow,
  Playbook,
  OptimalSpecs,
} from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: Record<Platform, string[]> = {
  instagram: ['Reel', 'Carousel', 'Static Post', 'Story'],
  tiktok:    ['Short Video', 'Duet', 'Stitch', 'Live'],
  twitter:   ['Tweet', 'Thread', 'Poll', 'Space'],
  linkedin:  ['Post', 'Article', 'Newsletter', 'Video'],
  youtube:   ['Long-form', 'Short', 'Podcast', 'Live Stream'],
  facebook:  ['Post', 'Reel', 'Story', 'Live'],
}

const SIGNAL_STYLES: Record<string, string> = {
  POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  TEST: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SKIP: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const CONTENT_TYPE_STYLES: Record<string, string> = {
  '3-list':    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Story':     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Hot Take':  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Tutorial':  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Compare':   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'News':      'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Lifestyle': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Review':    'bg-green-500/10 text-green-400 border-green-500/20',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function fmtViews(low: number, high: number): string {
  if (!low && !high) return '—'
  if (low >= 1_000 || high >= 1_000) return `${Math.round(low / 1_000)}-${Math.round(high / 1_000)}K`
  return `${fmt(low)}-${fmt(high)}`
}
function fmtFollowers(low: number, high: number): string {
  return (!low && !high) ? '—' : `+${fmt(low)}-${fmt(high)}`
}
function fmtEng(low: number, high: number): string {
  return (!low && !high) ? '—' : `${low.toFixed(1)}-${high.toFixed(1)}%`
}

function Badge({ text }: { text: string }) {
  const base = 'rounded border px-1.5 py-0.5 text-xs font-medium'
  const style = CONTENT_TYPE_STYLES[text] ?? 'bg-white/5 text-gray-400 border-white/10'
  return <span className={`${base} ${style}`}>{text}</span>
}

// ─── Clickable Pattern Bars ───────────────────────────────────────────────────

function PatternBars({ rows, title }: { rows: PatternRow[]; title: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const max = Math.max(...rows.map((r) => r.avg_views), 1)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const pct = (row.avg_views / max) * 100
          const isTop = pct === 100
          const isSelected = selected === row.label
          const barColor = isSelected
            ? 'bg-cyan-500'
            : isTop ? 'bg-emerald-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500/70'
          const textColor = isSelected
            ? 'text-cyan-400'
            : isTop ? 'text-emerald-400' : pct >= 25 ? 'text-yellow-400' : 'text-red-400'

          return (
            <button
              key={row.label}
              onClick={() => setSelected(isSelected ? null : row.label)}
              className={`w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition ${
                isSelected ? 'bg-white/[0.06] ring-1 ring-white/10' : 'hover:bg-white/[0.03]'
              }`}
            >
              <span className="w-20 shrink-0 text-xs text-gray-400 leading-tight">{row.label}</span>
              <div className="relative flex-1 h-4 rounded bg-white/5 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
                <span className={`absolute inset-y-0 right-1.5 flex items-center text-xs font-bold ${textColor}`}>
                  {fmt(row.avg_views)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded detail callout */}
      {selected && (() => {
        const row = rows.find((r) => r.label === selected)
        if (!row) return null
        const pct = (row.avg_views / max) * 100
        return (
          <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{title.replace(' → Avg Views', '')}</p>
            <p className="text-sm font-semibold text-white">{row.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-400">{fmt(row.avg_views)}</span>
              <span className="text-xs text-gray-500">avg views</span>
            </div>
            {pct < 100 && (
              <p className="mt-1 text-xs text-gray-600">
                {pct.toFixed(0)}% of top performer · {fmt(Math.round(max - row.avg_views))} views behind
              </p>
            )}
            {pct === 100 && (
              <p className="mt-1 text-xs text-emerald-500">Top performer in this category</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  // Controls
  const [selPlatform, setSelPlatform] = useState<Platform>('instagram')
  const [selFormat, setSelFormat]     = useState<string>(FORMAT_OPTIONS.instagram[0])
  const [topicInput, setTopicInput]   = useState('')

  // Results
  const [simulations, setSimulations]       = useState<Simulation[]>([])
  const [modelConfidence, setModelConfidence] = useState<ModelConfidence | null>(null)
  const [patternEvidence, setPatternEvidence] = useState<PatternEvidence | null>(null)
  const [playbook, setPlaybook]             = useState<Playbook | null>(null)
  const [optimalSpecs, setOptimalSpecs]     = useState<OptimalSpecs | null>(null)

  // UI
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [totalViews, setTotalViews]     = useState(0)
  const [postsAnalyzed, setPostsAnalyzed] = useState(0)

  // Reset format when platform changes
  useEffect(() => {
    setSelFormat(FORMAT_OPTIONS[selPlatform][0])
  }, [selPlatform])

  useEffect(() => {
    void loadStats()
    void loadSavedData()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/posts?limit=200')
      if (!res.ok) return
      const posts = await res.json() as Array<{ reach: number }>
      setPostsAnalyzed(posts.length)
      setTotalViews(posts.reduce((s, p) => s + (p.reach ?? 0), 0))
    } catch { /* non-critical */ }
  }

  async function loadSavedData() {
    setLoading(true)
    try {
      const [simsRes, runRes] = await Promise.all([
        fetch('/api/simulations?limit=7'),
        fetch('/api/simulation-runs'),
      ])
      if (simsRes.ok) {
        const sims = await simsRes.json() as Simulation[]
        setSimulations(sims)
        // Sync controls to last run's platform
        if (sims.length > 0 && sims[0].platform) {
          const p = sims[0].platform as Platform
          if (PLATFORMS.includes(p)) {
            setSelPlatform(p)
            setSelFormat(sims[0].format ?? FORMAT_OPTIONS[p][0])
          }
        }
      }
      if (runRes.ok) {
        const run = await runRes.json() as {
          model_confidence?: ModelConfidence
          pattern_evidence?: PatternEvidence
          playbook?: Playbook
          optimal_specs?: OptimalSpecs
        } | null
        if (run) {
          if (run.model_confidence) setModelConfidence(run.model_confidence)
          if (run.pattern_evidence) setPatternEvidence(run.pattern_evidence)
          if (run.playbook) setPlaybook(run.playbook)
          if (run.optimal_specs) setOptimalSpecs(run.optimal_specs)
        }
      }
    } catch { /* non-critical */ }
    finally { setLoading(false) }
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSignalChange(id: string, signal: string) {
    try {
      await fetch(`/api/simulations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      })
      setSimulations((prev) => prev.map((s) => (s.id === id ? { ...s, signal } : s)))
    } catch { /* non-critical */ }
  }

  async function generateIdeas() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selPlatform,
          format: selFormat,
          topic: topicInput.trim() || undefined,
        }),
      })
      const data = await res.json() as {
        error?: string
        simulations?: Simulation[]
        model_confidence?: ModelConfidence
        pattern_evidence?: PatternEvidence
        playbook?: Playbook
        optimal_specs?: OptimalSpecs
      }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      if (data.simulations) { setSimulations(data.simulations); setExpandedRows(new Set()) }
      if (data.model_confidence) setModelConfidence(data.model_confidence)
      if (data.pattern_evidence) setPatternEvidence(data.pattern_evidence)
      if (data.playbook) setPlaybook(data.playbook)
      if (data.optimal_specs) setOptimalSpecs(data.optimal_specs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const runContext = simulations.length > 0
    ? { platform: simulations[0].platform, format: simulations[0].format, topic: simulations[0].topic }
    : null

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-cyan-500" />
          <h1 className="text-lg font-bold text-white">Content Simulator</h1>
        </div>
        <p className="mt-0.5 pl-3 text-xs text-gray-500">
          {postsAnalyzed > 0
            ? `${fmt(totalViews)} views analyzed across ${postsAnalyzed} posts`
            : 'No post data yet — run a scrape first'}
        </p>
      </div>

      {/* ── Simulation Controls ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Simulation Settings</p>

        {/* Platform */}
        <div>
          <p className="mb-2 text-xs text-gray-500">Platform</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setSelPlatform(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selPlatform === p
                    ? 'bg-white text-gray-900'
                    : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Format + Topic + Run */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="mb-1.5 text-xs text-gray-500">Format</p>
            <select
              value={selFormat}
              onChange={(e) => setSelFormat(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50"
            >
              {FORMAT_OPTIONS[selPlatform].map((f) => (
                <option key={f} value={f} className="bg-[#111218]">{f}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <p className="mb-1.5 text-xs text-gray-500">Topic <span className="text-gray-600">(optional — auto-detected if blank)</span></p>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void generateIdeas()}
              placeholder="e.g. productivity, AI tools, fitness…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          <button
            onClick={() => void generateIdeas()}
            disabled={loading}
            className="shrink-0 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating…' : '↻ Run Simulation'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-400">Analyzing your content history…</p>
          <p className="mt-1 text-xs text-gray-600">This takes about 10–15 seconds</p>
        </div>
      )}

      {/* ── Model Confidence ────────────────────────────────────────────────── */}
      {!loading && modelConfidence && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          {runContext && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">Last run for</span>
              <PlatformBadge platform={runContext.platform} size="sm" />
              <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400">{runContext.format}</span>
              {runContext.topic && (
                <span className="text-xs text-gray-600">#{runContext.topic}</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 divide-x divide-white/5">
            {([
              { key: 'viral_formula_match', label: 'Viral Formula Match', color: 'text-emerald-400' },
              { key: 'prediction_accuracy',  label: 'Prediction Accuracy',  color: 'text-yellow-400' },
              { key: 'flop_risk',            label: 'Flop Risk on Generic AI', color: 'text-red-400'  },
            ] as const).map(({ key, label, color }) => {
              const metric = modelConfidence[key]
              return (
                <div key={key} className="space-y-1 px-5 text-center first:pl-0 last:pr-0">
                  <p className={`text-4xl font-black ${color}`}>{metric.value}%</p>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs leading-relaxed text-gray-500">{metric.sublabel}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Simulated Ideas ─────────────────────────────────────────────────── */}
      {!loading && simulations.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#111218] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
              Simulated Ideas — Ranked
            </p>
            <p className="text-xs text-gray-600">Click any row to expand script + CTA</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">Content Idea</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Score</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Views</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Eng</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Followers</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-600">Signal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {simulations.map((sim, idx) => {
                  const isExpanded = expandedRows.has(sim.id)
                  const scoreColor = sim.predicted_score >= 70 ? 'text-emerald-400' : sim.predicted_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                  const scoreBg   = sim.predicted_score >= 70 ? 'bg-emerald-500' : sim.predicted_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'

                  return (
                    <>
                      <tr
                        key={sim.id}
                        onClick={() => toggleRow(sim.id)}
                        className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-gray-600">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-white leading-snug">{sim.hook}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {sim.content_type && <Badge text={sim.content_type} />}
                            {sim.estimated_time && (
                              <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-gray-400">
                                {sim.estimated_time}
                              </span>
                            )}
                            {sim.is_proven && (
                              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                                Proven
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-col items-end gap-1">
                            <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
                              {sim.predicted_score}
                            </span>
                            <div className="h-1 w-12 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${scoreBg}`}
                                style={{ width: `${sim.predicted_score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-white tabular-nums">
                          {fmtViews(sim.views_low, sim.views_high)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">
                          {fmtEng(sim.eng_low, sim.eng_high)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">
                          {fmtFollowers(sim.followers_low, sim.followers_high)}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={sim.signal || 'TEST'}
                            onChange={(e) => void handleSignalChange(sim.id, e.target.value)}
                            className={`rounded border px-2.5 py-1 text-xs font-bold outline-none transition cursor-pointer ${SIGNAL_STYLES[sim.signal || 'TEST'] ?? SIGNAL_STYLES.TEST}`}
                          >
                            <option value="POST" className="bg-[#111218]">POST</option>
                            <option value="TEST" className="bg-[#111218]">TEST</option>
                            <option value="SKIP" className="bg-[#111218]">SKIP</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs">
                          {isExpanded ? '▴' : '▾'}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${sim.id}-exp`} className="bg-white/[0.01]">
                          <td colSpan={8} className="px-4 pb-4 pt-2">
                            <div className="rounded-lg border border-white/5 bg-[#0d0e12] p-4 space-y-3">
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Script</p>
                                <p className="text-sm text-gray-300 leading-relaxed">{sim.script}</p>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Call to Action</p>
                                  <p className="text-sm text-gray-300">{sim.cta}</p>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Why it works</p>
                                  <p className="text-xs text-gray-400 leading-relaxed">{sim.why}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pattern Evidence ────────────────────────────────────────────────── */}
      {!loading && patternEvidence && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Pattern Evidence</p>
          <p className="mb-5 text-xs text-gray-600">Click any bar to see detail</p>
          <div className="grid gap-6 sm:grid-cols-3">
            <PatternBars rows={patternEvidence.format}   title="Format → Avg Views" />
            <PatternBars rows={patternEvidence.duration} title="Duration → Avg Views" />
            <PatternBars rows={patternEvidence.topic}    title="Topic → Avg Views" />
          </div>
        </div>
      )}

      {/* ── The Playbook ────────────────────────────────────────────────────── */}
      {!loading && playbook && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-600">The Playbook</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/10 text-xs">+</span>
                Always
              </p>
              <ul className="space-y-2.5">
                {playbook.always.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-emerald-500">•</span>
                    <span>
                      <span className="font-semibold text-white">{item.label}</span>
                      {item.detail ? ` — ${item.detail}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-red-500/10 text-xs">−</span>
                Never
              </p>
              <ul className="space-y-2.5">
                {playbook.never.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-red-500">•</span>
                    <span>
                      <span className="font-semibold text-white">{item.label}</span>
                      {item.detail ? ` — ${item.detail}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Optimal Specs ───────────────────────────────────────────────────── */}
      {!loading && optimalSpecs && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">Optimal Specs</p>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
              <p className="text-2xl font-black text-cyan-400">{optimalSpecs.duration}</p>
              <p className="mt-0.5 text-xs uppercase tracking-widest text-gray-500">Duration</p>
            </div>
            {optimalSpecs.items != null && (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
                <p className="text-2xl font-black text-cyan-400">{optimalSpecs.items}</p>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-gray-500">Items</p>
              </div>
            )}
            {optimalSpecs.extras?.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
                <p className="text-lg font-bold text-white">{spec.value}</p>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-gray-500">{spec.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && simulations.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-white/5 py-12 text-center">
          <p className="text-sm text-gray-500">Select a platform and format above, then run a simulation.</p>
        </div>
      )}

      {/* ── Pre-Post Media Analysis ─────────────────────────────────────────── */}
      <MediaSimulator />

    </div>
  )
}
