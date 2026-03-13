'use client'

import { useState, useEffect } from 'react'
import type { Settings } from '@/types'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/types'

type SettingsForm = Omit<Settings, 'id' | 'updated_at'>

const DEFAULT_FORM: SettingsForm = {
  brand_name: '',
  niche: '',
  tone: 'Professional',
  platforms: [],
  apify_token: '',
  scrape_schedule: '{}',
}

const TONE_OPTIONS = ['Professional', 'Casual', 'Inspirational', 'Humorous', 'Educational', 'Conversational']

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30'

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM)
  const [handles, setHandles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => { void loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json() as Partial<Settings>
        const { id: _id, updated_at: _updated, ...rest } = data
        setForm({ ...DEFAULT_FORM, ...rest, platforms: rest.platforms ?? [] })
        try {
          setHandles(JSON.parse(rest.scrape_schedule ?? '{}') as Record<string, string>)
        } catch {
          setHandles({})
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function togglePlatform(platform: Platform) {
    setForm((prev) => {
      const platforms = prev.platforms ?? []
      return {
        ...prev,
        platforms: platforms.includes(platform)
          ? platforms.filter((p) => p !== platform)
          : [...platforms, platform],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const payload: SettingsForm = { ...form, scrape_schedule: JSON.stringify(handles) }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSuccessMsg('Settings saved!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-600">Loading settings…</div>
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Configure your brand, platforms, and credentials.</p>
      </div>

      <div className="max-w-2xl space-y-1">
        {/* Brand section */}
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Brand</p>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Brand Name</label>
            <input
              type="text"
              value={form.brand_name}
              onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
              placeholder="Acme Corp"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Niche</label>
            <input
              type="text"
              value={form.niche}
              onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              placeholder="e.g. Fitness, SaaS, Food & Beverage"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Tone</label>
            <select
              value={form.tone}
              onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
              className={inputClass}
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t} value={t} className="bg-[#111218]">{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Platforms section */}
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Active Platforms</p>

          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                  (form.platforms ?? []).includes(p)
                    ? 'bg-white text-gray-900 border-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          {(form.platforms ?? []).length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-600">
                Handle or profile URL for each platform (used by the daily cron job):
              </p>
              {(form.platforms ?? []).map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-gray-500">
                    {PLATFORM_LABELS[p as Platform]}
                  </span>
                  <input
                    type="text"
                    value={handles[p] ?? ''}
                    onChange={(e) => setHandles((prev) => ({ ...prev, [p]: e.target.value }))}
                    placeholder="@handle or URL"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API credentials section */}
        <div className="rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">API Credentials</p>
          <p className="text-xs text-gray-600">
            Set <code className="font-mono text-gray-400">APIFY_API_TOKEN</code> in{' '}
            <code className="font-mono text-gray-400">.env.local</code> or Vercel env vars.
            Optionally override it here without redeploying.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Apify API Token{' '}
              <span className="text-gray-600 font-normal">(optional override)</span>
            </label>
            <input
              type="password"
              value={form.apify_token}
              onChange={(e) => setForm((f) => ({ ...f, apify_token: e.target.value }))}
              placeholder="Leave blank to use env var"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

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

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
