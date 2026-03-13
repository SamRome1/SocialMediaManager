'use client'

import { useState, useEffect } from 'react'
import { SimulationCard } from '@/components/SimulationCard'
import type { Simulation } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

const FORMAT_OPTIONS: Record<Platform, string[]> = {
  instagram: ['Reel', 'Carousel', 'Static Post', 'Story'],
  tiktok: ['Short Video', 'Duet', 'Stitch', 'Live'],
  twitter: ['Tweet', 'Thread', 'Poll', 'Space'],
  linkedin: ['Post', 'Article', 'Newsletter', 'Video'],
  youtube: ['Long-form', 'Short', 'Podcast', 'Live Stream'],
}

export default function SimulatorPage() {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [format, setFormat] = useState(FORMAT_OPTIONS.instagram[0])
  const [topic, setTopic] = useState('')
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [history, setHistory] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setFormat(FORMAT_OPTIONS[platform][0]) }, [platform])
  useEffect(() => { void loadHistory() }, [])

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/simulations')
      if (res.ok) setHistory(await res.json() as Simulation[])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setSimulations([])
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, format, topic }),
      })
      const data = await res.json() as { error?: string; simulations?: Simulation[] }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setSimulations(data.simulations ?? [])
      setHistory((prev) => [...(data.simulations ?? []), ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePublishedToggle(id: string, published: boolean) {
    try {
      await fetch(`/api/simulations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      })
      setSimulations((prev) => prev.map((s) => (s.id === id ? { ...s, published } : s)))
      setHistory((prev) => prev.map((s) => (s.id === id ? { ...s, published } : s)))
    } catch { /* non-critical */ }
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-bold text-white">Content Simulator</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Generate and score content ideas powered by Claude AI.
        </p>
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Generate Ideas</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p} className="bg-[#111218]">{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            >
              {FORMAT_OPTIONS[platform].map((f) => (
                <option key={f} value={f} className="bg-[#111218]">{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. morning routine, productivity"
              onKeyDown={(e) => e.key === 'Enter' && void handleGenerate()}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
        </div>

        <button
          onClick={() => void handleGenerate()}
          disabled={loading || !topic.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Generating ideas…' : 'Generate 5 Ideas'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* New results */}
      {simulations.length > 0 && (
        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
            Generated Ideas
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulations.map((sim) => (
              <SimulationCard key={sim.id} simulation={sim} onPublishedToggle={handlePublishedToggle} />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">History</p>
        {loadingHistory ? (
          <div className="py-8 text-center text-sm text-gray-600">Loading…</div>
        ) : history.filter((s) => !simulations.find((n) => n.id === s.id)).length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/5 py-12 text-center">
            <p className="text-sm text-gray-500">No simulations yet. Generate some ideas above.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history
              .filter((s) => !simulations.find((n) => n.id === s.id))
              .map((sim) => (
                <SimulationCard key={sim.id} simulation={sim} onPublishedToggle={handlePublishedToggle} />
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
