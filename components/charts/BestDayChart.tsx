'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

type DayRow = { name: string; avgViews: number; posts: number }

function fmtY(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; payload: DayRow }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0e12] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-white">{label}</p>
      <p className="text-xs text-cyan-400">{fmtY(row.avgViews)} avg views</p>
      <p className="text-xs text-gray-400">{row.posts} posts</p>
    </div>
  )
}

export function BestDayChart({ data }: { data: DayRow[] }) {
  const max = Math.max(...data.map((d) => d.avgViews), 1)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="25%">
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
        <Bar dataKey="avgViews" name="Avg Views" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.avgViews === max ? '#22d3ee' : 'rgba(34,211,238,0.3)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
