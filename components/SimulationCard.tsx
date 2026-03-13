'use client'

import { useState } from 'react'
import type { Simulation } from '@/types'
import { PlatformBadge } from './PlatformBadge'

interface Props {
  simulation: Simulation
  onPublishedToggle?: (id: string, published: boolean) => void
}

export function SimulationCard({ simulation, onPublishedToggle }: Props) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor =
    simulation.predicted_score >= 70
      ? 'text-emerald-400'
      : simulation.predicted_score >= 40
        ? 'text-yellow-400'
        : 'text-red-400'

  const scoreBg =
    simulation.predicted_score >= 70
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : simulation.predicted_score >= 40
        ? 'bg-yellow-500/10 border-yellow-500/20'
        : 'bg-red-500/10 border-red-500/20'

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-4 transition hover:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={simulation.platform} size="sm" />
          <span className="rounded border border-white/5 bg-white/5 px-2 py-0.5 text-xs text-gray-400 capitalize">
            {simulation.format}
          </span>
          {simulation.topic && (
            <span className="text-xs text-gray-600">#{simulation.topic}</span>
          )}
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold ${scoreBg} ${scoreColor}`}>
          {simulation.predicted_score}/100
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-white leading-snug">
        &ldquo;{simulation.hook}&rdquo;
      </p>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">Script</p>
            <p className="text-sm text-gray-400 leading-relaxed">{simulation.script}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">CTA</p>
            <p className="text-sm text-gray-400">{simulation.cta}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">Why it works</p>
            <p className="text-xs text-gray-500 leading-relaxed">{simulation.why}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-cyan-500 hover:text-cyan-400 transition"
        >
          {expanded ? 'Show less' : 'Show details'}
        </button>

        {onPublishedToggle && (
          <button
            onClick={() => onPublishedToggle(simulation.id, !simulation.published)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              simulation.published
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {simulation.published ? '✓ Published' : 'Mark published'}
          </button>
        )}
      </div>
    </div>
  )
}
