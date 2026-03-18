'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

type Point = { label: string; likes: number; comments: number; shares: number }

function fmtY(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0e12] px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs text-gray-400">{label}</p>
      {payload.map((e) => (
        <p key={e.name} className="text-xs font-semibold" style={{ color: e.color }}>
          {e.name}: {fmtY(e.value)}
        </p>
      ))}
    </div>
  )
}

const LEGEND_STYLE = { fontSize: 11, color: '#6b7280' }

export function EngagementChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        <Line type="monotone" dataKey="likes" stroke="#f472b6" strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="comments" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="shares" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
