'use client'

import { useState, useEffect } from 'react'
import { SimulationCard } from '@/components/SimulationCard'
import type {
  Simulation,
  ModelConfidence,
  PatternEvidence,
  PatternRow,
  Playbook,
  OptimalSpecs,
} from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

const FORMAT_OPTIONS: Record<Platform, string[]> = {
  instagram: ['Reel', 'Carousel', 'Static Post', 'Story'],
  tiktok: ['Short Video', 'Duet', 'Stitch', 'Live'],
  twitter: ['Tweet', 'Thread', 'Poll', 'Space'],
  linkedin: ['Post', 'Article', 'Newsletter', 'Video'],
  youtube: ['Long-form', 'Short', 'Podcast', 'Live Stream'],
  facebook: ['Post', 'Reel', 'Story', 'Live'],
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function fmtViews(low: number, high: number): string {
  if (!low && !high) return '—'
  if (low >= 1_000 && high >= 1_000) {
    const lo = Math.round(low / 1_000)
    const hi = Math.round(high / 1_000)
    return `${lo}-${hi}K`
  }
  return `${fmt(low)}-${fmt(high)}`
}

function fmtFollowers(low: number, high: number): string {
  if (!low && !high) return '—'
  return `+${fmt(low)}-${fmt(high)}`
}

function fmtEng(low: number, high: number): string {
  if (!low && !high) return '—'
  return `${low.toFixed(1)}-${high.toFixed(1)}%`
}

const SIGNAL_STYLES: Record<string, string> = {
  POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  TEST: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SKIP: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const CONTENT_TYPE_STYLES: Record<string, string> = {
  '3-list':   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Story':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Hot Take': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Tutorial': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Compare':  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'News':     'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Lifestyle':'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Review':   'bg-green-500/10 text-green-400 border-green-500/20',
}

function Badge({ text, extraCls }: { text: string; extraCls?: string }) {
  const base = 'rounded border px-1.5 py-0.5 text-xs font-medium'
  const style = CONTENT_TYPE_STYLES[text] ?? 'bg-white/5 text-gray-400 border-white/10'
  return <span className={`${base} ${style} ${extraCls ?? ''}`}>{text}</span>
}

function PatternBars({ rows, title }: { rows: PatternRow[]; title: string }) {
  const max = Math.max(...rows.map((r) => r.avg_views), 1)
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => {
          const pct = (row.avg_views / max) * 100
          const barColor =
            pct >= 60 ? 'bg-emerald-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500'
          const textColor =
            pct >= 60 ? 'text-emerald-400' : pct >= 25 ? 'text-yellow-400' : 'text-red-400'
          return (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-gray-400 truncate">{row.label}</span>
              <div className="relative flex-1 h-4 rounded bg-white/5 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
                <span className={`absolute inset-y-0 right-1 flex items-center text-xs font-bold ${textColor}`}>
                  {fmt(row.avg_views)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [modelConfidence, setModelConfidence] = useState<ModelConfidence | null>(null)
  const [patternEvidence, setPatternEvidence] = useState<PatternEvidence | null>(null)
  const [playbook, setPlaybook] = useState<Playbook | null>(null)
  const [optimalSpecs, setOptimalSpecs] = useState<OptimalSpecs | null>(null)
  const [totalViews, setTotalViews] = useState(0)
  const [postsAnalyzed, setPostsAnalyzed] = useState(0)
  const [platformLabels, setPlatformLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadStats()
    void loadSavedData()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/posts?limit=200')
      if (!res.ok) return
      const posts = await res.json() as Array<{ reach: number; platform: string }>
      setPostsAnalyzed(posts.length)
      setTotalViews(posts.reduce((s, p) => s + (p.reach ?? 0), 0))
      const seen = new Set(posts.map((p) => p.platform))
      setPlatformLabels([...seen].map((p) => p.charAt(0).toUpperCase() + p.slice(0, 2)))
    } catch { /* non-critical */ }
  }

  async function loadSavedData() {
    setLoading(true)
    try {
      const [simsRes, runRes] = await Promise.all([
        fetch('/api/simulations?limit=7'),
        fetch('/api/simulation-runs'),
      ])
      if (simsRes.ok) setSimulations(await simsRes.json() as Simulation[])
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

  async function generateIdeas() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true }),
      })
      const data = await res.json() as {
        error?: string
        simulations?: Simulation[]
        model_confidence?: ModelConfidence
        pattern_evidence?: PatternEvidence
        playbook?: Playbook
        optimal_specs?: OptimalSpecs
      }
      if (!res.ok) {
        console.error('API error:', data.error)
        throw new Error(data.error ?? 'Generation failed')
      }
      if (data.simulations) setSimulations(data.simulations)
      if (data.model_confidence) setModelConfidence(data.model_confidence)
      if (data.pattern_evidence) setPatternEvidence(data.pattern_evidence)
      if (data.playbook) setPlaybook(data.playbook)
      if (data.optimal_specs) setOptimalSpecs(data.optimal_specs)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed'
      console.error('Generation error:', errorMsg, err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
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

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-cyan-500" />
            <h1 className="text-lg font-bold text-white">Content Simulator</h1>
          </div>
          <p className="mt-0.5 pl-3 text-xs text-gray-500">
            {postsAnalyzed > 0
              ? `${fmt(totalViews)} views analyzed across ${postsAnalyzed} posts${platformLabels.length > 0 ? ` · ${platformLabels.join(' · ')}` : ''}`
              : 'No post data yet — run a scrape first'}
          </p>
        </div>
        <button
          onClick={() => void generateIdeas()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating…' : '↻ Rerun Simulation'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Model Confidence (Top) ────────────────────────────── */}
      {!loading && modelConfidence && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <div className="grid grid-cols-3 divide-x divide-white/5">
            {([
              { key: 'viral_formula_match', label: 'Viral Formula Match', color: 'text-emerald-400' },
              { key: 'prediction_accuracy',  label: 'Prediction Accuracy', color: 'text-yellow-400' },
              { key: 'flop_risk',            label: 'Flop Risk on Generic AI', color: 'text-red-400' },
            ] as const).map(({ key, label, color }) => {
              const metric = modelConfidence[key]
              return (
                <div key={key} className="px-5 first:pl-0 last:pr-0 space-y-1 text-center">
                  <p className={`text-4xl font-black ${color}`}>{metric.value}%</p>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{metric.sublabel}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Loading State ──────────────────────────────────────── */}
      {loading && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-8 text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border 2 border-cyan-500 border-t-transparent" />
          </div>
          <p className="mt-3 text-sm text-gray-400">Generating ideas based on your content…</p>
        </div>
      )}

      {/* ── Simulated Ideas — Ranked ──────────────────────────── */}
      {!loading && simulations.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#111218] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
              Simulated Ideas — Ranked
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">Content Idea</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Views</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Eng</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-600">Followers</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-600">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {simulations.map((sim, idx) => (
                  <tr key={sim.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-xs font-bold text-gray-600">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white leading-snug">{sim.hook}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {sim.content_type && <Badge text={sim.content_type} />}
                        {sim.estimated_time && (
                          <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-gray-400">
                            {sim.estimated_time}
                          </span>
                        )}
                        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
                          sim.is_proven
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/10 bg-white/5 text-gray-500'
                        }`}>
                          {sim.is_proven ? 'Proven' : 'No CC'}
                        </span>
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
                    <td className="px-4 py-3 text-center">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pattern Evidence ──────────────────────────────────── */}
      {!loading && patternEvidence && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-600">
            Pattern Evidence
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            <PatternBars rows={patternEvidence.format}   title="Format → Avg Views" />
            <PatternBars rows={patternEvidence.duration} title="Duration → Avg Views" />
            <PatternBars rows={patternEvidence.topic}    title="Topic → Avg Views" />
          </div>
        </div>
      )}

      {/* ── The Playbook ──────────────────────────────────────── */}
      {!loading && playbook && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-600">
            The Playbook
          </p>
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

      {/* ── Optimal Specs ─────────────────────────────────────── */}
      {!loading && optimalSpecs && (
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
            Optimal Specs
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
              <p className="text-2xl font-black text-cyan-400">{optimalSpecs.duration}</p>
              <p className="mt-0.5 text-xs text-gray-500 uppercase tracking-widest">Duration</p>
            </div>
            {optimalSpecs.items != null && (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
                <p className="text-2xl font-black text-cyan-400">{optimalSpecs.items}</p>
                <p className="mt-0.5 text-xs text-gray-500 uppercase tracking-widest">Items</p>
              </div>
            )}
            {optimalSpecs.extras?.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-5 py-3 text-center">
                <p className="text-lg font-bold text-white">{spec.value}</p>
                <p className="mt-0.5 text-xs text-gray-500 uppercase tracking-widest">{spec.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────── */}
      {!loading && simulations.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-white/5 py-12 text-center">
          <p className="text-sm text-gray-500">No simulations generated yet. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
