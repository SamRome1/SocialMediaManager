'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Slice = { name: string; value: number; color: string }

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: Slice }[] }) => {
  if (!active || !payload?.length) return null
  const s = payload[0]
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0e12] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-white">{s.name}</p>
      <p className="text-xs text-gray-400">{fmtNum(s.value)} views</p>
    </div>
  )
}

export function PlatformDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="w-full" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0'
          return (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-gray-400">{d.name}</span>
              </div>
              <span className="font-semibold text-white">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
