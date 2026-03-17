import { PLATFORM_LABELS, type Platform } from '@/types'

const PLATFORM_STYLES: Record<Platform, string> = {
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  tiktok: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  twitter: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  linkedin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  youtube: 'bg-red-500/10 text-red-400 border-red-500/20',
  facebook: 'bg-blue-600/10 text-blue-500 border-blue-600/20',
}

interface Props {
  platform: string
  size?: 'sm' | 'md'
}

export function PlatformBadge({ platform, size = 'md' }: Props) {
  const key = platform.toLowerCase() as Platform
  const style = PLATFORM_STYLES[key] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const label = PLATFORM_LABELS[key] ?? platform

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${style} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {label}
    </span>
  )
}
