'use client'

import { useState, useRef, useCallback } from 'react'
import type { MediaAnalysis, Platform } from '@/types'
import { PLATFORMS, PLATFORM_LABELS } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: Record<Platform, string[]> = {
  instagram: ['Reel', 'Carousel', 'Static Post', 'Story'],
  tiktok:    ['Short Video', 'Duet', 'Stitch', 'Live'],
  twitter:   ['Tweet Thread', 'Image Post', 'Video'],
  linkedin:  ['Post', 'Article', 'Video'],
  youtube:   ['Long-form', 'Short', 'Thumbnail'],
  facebook:  ['Post', 'Reel', 'Story'],
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/')
}

/** Resize an image file to max width, returns base64 JPEG */
async function resizeImage(file: File, maxWidth = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

/** Extract up to 3 representative frames from a video file, returns base64 JPEGs */
async function extractVideoFrames(file: File, maxWidth = 960): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    const frames: string[] = []
    let step = 0

    video.onloadedmetadata = () => {
      const duration = video.duration
      // 0s, 30%, 70% through the video
      const times = [0.01, duration * 0.3, duration * 0.7].filter((t) => t < duration)
      const canvas = document.createElement('canvas')

      const seekNext = () => {
        if (step >= times.length) {
          URL.revokeObjectURL(url)
          resolve(frames)
          return
        }
        video.currentTime = times[step]
      }

      video.onseeked = () => {
        const ratio = Math.min(1, maxWidth / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * ratio)
        canvas.height = Math.round(video.videoHeight * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
        step++
        seekNext()
      }

      seekNext()
    }

    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load video')) }
    video.src = url
  })
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const scoreColor =
    score >= 70 ? '#34d399' : score >= 45 ? '#facc15' : '#f87171'
  const ringColor = color === 'auto' ? scoreColor : color

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-16 w-16">
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-base font-black"
          style={{ color: ringColor }}
        >
          {score}
        </span>
      </div>
      <p className="text-center text-xs text-gray-500">{label}</p>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 rounded px-2 py-1 text-xs text-gray-600 transition hover:bg-white/5 hover:text-cyan-400"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type State = 'idle' | 'ready' | 'analyzing' | 'done' | 'error'

export function MediaSimulator() {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [format, setFormat]     = useState<string>(FORMAT_OPTIONS.instagram[0])
  const [file, setFile]         = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [state, setState]       = useState<State>('idle')
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p)
    setFormat(FORMAT_OPTIONS[p][0])
  }

  const loadFile = useCallback((f: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setState('ready')
    setAnalysis(null)
    setErrorMsg(null)
  }, [previewUrl])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f)
  }, [loadFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) loadFile(f)
  }

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setState('idle')
    setAnalysis(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const analyze = async () => {
    if (!file) return
    setState('analyzing')
    setErrorMsg(null)

    try {
      let frames: string[]
      const mediaType = isVideoFile(file) ? 'video' : 'image'

      if (mediaType === 'video') {
        frames = await extractVideoFrames(file)
      } else {
        frames = [await resizeImage(file)]
      }

      const res = await fetch('/api/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, mediaType, platform, format }),
      })

      const data = await res.json() as { analysis?: MediaAnalysis; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setAnalysis(data.analysis ?? null)
      setState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Analysis failed')
      setState('error')
    }
  }

  const fileSizeMB = file ? (file.size / 1_048_576).toFixed(1) : null
  const isVideo = file ? isVideoFile(file) : false

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
            ▲
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Pre-Post Performance Simulator</p>
            <p className="text-xs text-gray-600">Upload your video or image to predict performance and get improvement suggestions before you post</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Platform + Format ───────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-gray-500">Platform</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlatformChange(p)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    platform === p
                      ? 'bg-white text-gray-900'
                      : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-gray-500">Format</p>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50"
            >
              {FORMAT_OPTIONS[platform].map((f) => (
                <option key={f} value={f} className="bg-[#111218]">{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Dropzone / Preview ──────────────────────────────────────────────── */}
        {state === 'idle' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 text-center transition ${
              isDragging
                ? 'border-cyan-500/50 bg-cyan-500/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              <span className="text-2xl">↑</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Drop your video or image here</p>
              <p className="mt-0.5 text-xs text-gray-600">or click to browse</p>
            </div>
            <p className="text-xs text-gray-600">MP4 · MOV · WebM · JPG · PNG · WebP</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              onChange={onFileChange}
              className="sr-only"
            />
          </div>
        )}

        {/* ── File preview + Analyze ──────────────────────────────────────────── */}
        {(state === 'ready' || state === 'analyzing' || state === 'done' || state === 'error') && file && previewUrl && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            {/* Media preview */}
            <div className="relative bg-black/30">
              {isVideo ? (
                <video
                  src={previewUrl}
                  className="max-h-64 w-full object-contain"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 w-full object-contain"
                />
              )}

              {/* Remove button */}
              <button
                onClick={clearFile}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white transition hover:bg-black/80"
              >
                ✕
              </button>
            </div>

            {/* File info + action bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-gray-600">
                  {isVideo ? 'Video' : 'Image'} · {fileSizeMB} MB
                </p>
              </div>
              <button
                onClick={() => void analyze()}
                disabled={state === 'analyzing'}
                className="shrink-0 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {state === 'analyzing' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyzing…
                  </span>
                ) : state === 'done' ? (
                  '↻ Re-analyze'
                ) : (
                  '▲ Analyze'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Analyzing loader ────────────────────────────────────────────────── */}
        {state === 'analyzing' && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">
              {isVideo ? 'Extracting frames and analyzing your video…' : 'Analyzing your image…'}
            </p>
            <p className="mt-1 text-xs text-gray-600">Comparing against your historical performance data</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {state === 'error' && errorMsg && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────────── */}
        {state === 'done' && analysis && (
          <div className="space-y-5">

            {/* Score ring row */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Performance Prediction</p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-white font-semibold">
                    {fmt(analysis.predicted_views_low)}–{fmt(analysis.predicted_views_high)}
                  </span>
                  predicted views ·
                  <span className="text-white font-semibold">
                    {analysis.predicted_engagement_low.toFixed(1)}–{analysis.predicted_engagement_high.toFixed(1)}%
                  </span>
                  engagement
                </div>
              </div>
              <div className="flex flex-wrap justify-around gap-4">
                <ScoreRing score={analysis.overall_score}  label="Overall Score" color="auto" />
                <ScoreRing score={analysis.hook_strength}  label="Hook Strength"  color="#a78bfa" />
                <ScoreRing score={analysis.visual_quality} label="Visual Quality"  color="#38bdf8" />
                <ScoreRing score={analysis.platform_fit}   label="Platform Fit"   color="#fb923c" />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">AI Assessment</p>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Strengths + Improvements */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Strengths */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/10 text-xs">✓</span>
                  What's Working
                </p>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-emerald-500">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-yellow-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-yellow-500/10 text-xs">↑</span>
                  Improvements
                </p>
                <ul className="space-y-2.5">
                  {analysis.improvements.map((item, i) => (
                    <li key={i} className="rounded-lg border-l-2 border-yellow-500/40 bg-white/[0.02] px-3 py-2">
                      <p className="text-xs font-semibold text-white">{item.issue}</p>
                      <p className="mt-0.5 text-xs text-gray-400">→ {item.fix}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Reframe suggestions */}
            {analysis.reframe_suggestions.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Reframe Ideas</p>
                <div className="space-y-2">
                  {analysis.reframe_suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                      <span className="mt-0.5 shrink-0 text-xs font-bold text-purple-400">{i + 1}</span>
                      <p className="text-xs text-gray-300 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption suggestions */}
            {analysis.caption_suggestions.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Caption Suggestions</p>
                <div className="space-y-2">
                  {analysis.caption_suggestions.map((c, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                      <p className="text-xs text-gray-300 leading-relaxed">{c}</p>
                      <CopyButton text={c} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
