export interface Post {
  id: string
  platform: string
  source_id: string | null
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
  content_type: string
  is_proven: boolean
  estimated_time: string
  views_low: number
  views_high: number
  eng_low: number
  eng_high: number
  followers_low: number
  followers_high: number
  signal: string
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
  content_type: string
  is_proven: boolean
  estimated_time: string
  views_low: number
  views_high: number
  eng_low: number
  eng_high: number
  followers_low: number
  followers_high: number
  signal: 'POST' | 'TEST' | 'SKIP'
}

export interface ModelConfidenceMetric {
  value: number
  sublabel: string
}

export interface ModelConfidence {
  viral_formula_match: ModelConfidenceMetric
  prediction_accuracy: ModelConfidenceMetric
  flop_risk: ModelConfidenceMetric
}

export interface PatternRow {
  label: string
  avg_views: number
}

export interface PatternEvidence {
  format: PatternRow[]
  duration: PatternRow[]
  topic: PatternRow[]
}

export interface PlaybookItem {
  label: string
  detail: string
}

export interface Playbook {
  always: PlaybookItem[]
  never: PlaybookItem[]
}

export interface OptimalSpec {
  label: string
  value: string
}

export interface OptimalSpecs {
  duration: string
  items?: number
  extras: OptimalSpec[]
}

export interface SimulationAnalysis {
  model_confidence: ModelConfidence
  ideas: SimulationIdea[]
  pattern_evidence: PatternEvidence
  playbook: Playbook
  optimal_specs: OptimalSpecs
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

export type Platform = 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'youtube' | 'facebook'

export const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'twitter', 'linkedin', 'youtube', 'facebook']

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  facebook: 'Facebook',
}
