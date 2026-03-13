import type { Post } from '@/types'
import { PlatformBadge } from './PlatformBadge'

interface Props {
  post: Post
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function PostCard({ post }: Props) {
  const date = new Date(post.posted_at)
  const dateStr = isNaN(date.getTime())
    ? post.posted_at
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const engagementRate =
    post.reach > 0
      ? (((post.likes + post.comments + post.shares) / post.reach) * 100).toFixed(2)
      : null

  return (
    <div className="rounded-xl border border-white/5 bg-[#111218] p-4 transition hover:border-white/10 hover:bg-[#14151f]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={post.platform} size="sm" />
          <span className="text-xs text-gray-600 capitalize">{post.format}</span>
        </div>
        <div className="flex items-center gap-2">
          {engagementRate && (
            <span className="text-xs font-semibold text-emerald-400">{engagementRate}%</span>
          )}
          {post.score !== null && (
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                post.score >= 70
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : post.score >= 40
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-red-500/10 text-red-400'
              }`}
            >
              {post.score}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm text-gray-300 leading-relaxed">
        {post.content || '(no caption)'}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatNumber(post.likes)}</p>
          <p className="text-xs text-gray-600">Likes</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatNumber(post.comments)}</p>
          <p className="text-xs text-gray-600">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatNumber(post.shares)}</p>
          <p className="text-xs text-gray-600">Shares</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatNumber(post.reach)}</p>
          <p className="text-xs text-gray-600">Reach</p>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-gray-600">{dateStr}</p>
    </div>
  )
}
