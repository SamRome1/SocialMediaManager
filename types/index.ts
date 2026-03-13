export interface Post {
  id: string
  platform: string
  content: string
  format: string
  likes: number
  comments: number
  shares: number
  reach: number
  score: number | null
  posted_at: string
  raw_apify_data: Record<string, unknown>
  created_at: string
}

export interface Profile {
  id: string
  platform: string
  handle: string
  followers: number
  previous_followers: number
  following: number
  posts_count: number
  scraped_at: string
}

export interface Audit {
  id: string
  platform: string
  summary: string
  action_items: string[]
  avg_score: number
  top_post_id: string | null
  model_used: string
  created_at: string
}

export interface Simulation {
  id: string
  platform: string
  format: string
  topic: string
  hook: string
  script: string
  cta: string
  predicted_score: number
  why: string
  published: boolean
  created_at: string
}

export interface Settings {
  id: string
  brand_name: string
  niche: string
  tone: string
  platforms: string[]
  apify_token: string
  scrape_schedule: string
  updated_at: string
}

export interface AuditResult {
  summary: string
  action_items: string[]
  top_performing_format: string
  avg_score: number
}

export interface SimulationIdea {
  hook: string
  script: string
  cta: string
  predicted_score: number
  why: string
}

export interface PlatformStat {
  platform: string
  posts: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngRate: number
}

export type Platform = 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'youtube'

export const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'twitter', 'linkedin', 'youtube']

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}
