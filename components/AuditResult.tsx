import type { Audit } from '@/types'
import { PlatformBadge } from './PlatformBadge'

interface Props {
  audit: Audit
}

export function AuditResult({ audit }: Props) {
  const date = new Date(audit.created_at)
  const dateStr = isNaN(date.getTime())
    ? audit.created_at
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  const scoreColor =
    audit.avg_score >= 70
      ? 'text-emerald-400'
      : audit.avg_score >= 40
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={audit.platform} />
          <span className="text-xs text-gray-600">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1">
          <span className="text-xs text-gray-500">Score</span>
          <span className={`text-sm font-bold ${scoreColor}`}>{audit.avg_score}</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-300 leading-relaxed">{audit.summary}</p>

      <div className="mt-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-gray-600">
          Action Items
        </p>
        <ul className="space-y-2">
          {audit.action_items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-gray-400">
              <span className="mt-0.5 shrink-0 text-cyan-500">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-gray-700">Model: {audit.model_used}</p>
    </div>
  )
}
