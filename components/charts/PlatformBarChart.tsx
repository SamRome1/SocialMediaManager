'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

type PlatformRow = { name: string; views: number; likes: number; comments: number }

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
      <p className="mb-1.5 text-xs font-semibold text-white">{label}</p>
      {payload.map((e) => (
        <p key={e.name} className="text-xs font-semibold" style={{ color: e.color }}>
          {e.name}: {fmtY(e.value)}
        </p>
      ))}
    </div>
  )
}

const LEGEND_STYLE = { fontSize: 11, color: '#6b7280' }

export function PlatformBarChart({ data }: { data: PlatformRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        <Bar dataKey="views" name="Views" fill="#22d3ee" radius={[3, 3, 0, 0]} />
        <Bar dataKey="likes" name="Likes" fill="#f472b6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="comments" name="Comments" fill="#a78bfa" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
