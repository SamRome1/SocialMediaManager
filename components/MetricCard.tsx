interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: 'cyan' | 'pink' | 'purple' | 'green'
}

const ACCENT_COLORS = {
  cyan: 'text-cyan-400',
  pink: 'text-pink-400',
  purple: 'text-purple-400',
  green: 'text-emerald-400',
}

export function MetricCard({ label, value, sub, trend, accent = 'cyan' }: Props) {
  const trendColor =
    trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${ACCENT_COLORS[accent]}`}>
        {value}
      </p>
      {(sub || trend) && (
        <p className={`mt-1.5 text-xs ${trendColor}`}>
          {trendIcon}{trendIcon ? ' ' : ''}{sub}
        </p>
      )}
    </div>
  )
}
