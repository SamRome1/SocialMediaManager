import { ApifyClient } from 'apify-client'
import { supabaseAdmin } from '@/lib/supabase'
import type { Post } from '@/types'

const ACTOR_MAP: Record<string, string> = {
  instagram: 'apify/instagram-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  twitter: 'quacker/twitter-scraper',
  linkedin: 'curious_coder/linkedin-post-search',
  youtube: 'streamers/youtube-scraper',
}

function getClient(token?: string): ApifyClient {
  const apiToken = token || process.env.APIFY_API_TOKEN
  if (!apiToken) throw new Error('APIFY_API_TOKEN is not set')
  return new ApifyClient({ token: apiToken })
}

function cleanHandle(platform: string, handle: string): string {
  if (platform === 'instagram') {
    return handle
      .replace('@', '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
      .replace(/\/$/, '')
  }
  return handle.replace('@', '')
}

// ── Post normalization ───────────────────────────────────────────────────────

function normalizePost(
  platform: string,
  item: Record<string, unknown>,
): Omit<Post, 'id' | 'created_at' | 'score'> {
  const base = { platform, raw_apify_data: item }

  switch (platform) {
    case 'instagram':
      return {
        ...base,
        content: String(item.caption ?? item.alt ?? ''),
        format: String(item.type ?? item.productType ?? 'post'),
        likes: Number(item.likesCount ?? item.likes ?? 0),
        comments: Number(item.commentsCount ?? item.comments ?? 0),
        shares: 0,
        reach: Number(item.videoViewCount ?? item.videoPlayCount ?? item.likesCount ?? 0),
        posted_at: String(item.timestamp ?? item.takenAtTimestamp ?? new Date().toISOString()),
      }

    case 'tiktok': {
      const stats = (item.stats ?? {}) as Record<string, unknown>
      return {
        ...base,
        content: String(item.text ?? item.desc ?? ''),
        format: 'video',
        likes: Number(item.diggCount ?? stats.diggCount ?? 0),
        comments: Number(item.commentCount ?? stats.commentCount ?? 0),
        shares: Number(item.shareCount ?? stats.shareCount ?? 0),
        reach: Number(item.playCount ?? stats.playCount ?? 0),
        posted_at: String(item.createTimeISO ?? item.createTime ?? new Date().toISOString()),
      }
    }

    case 'twitter':
      return {
        ...base,
        content: String(item.full_text ?? item.text ?? ''),
        format: item.retweeted_status ? 'retweet' : 'tweet',
        likes: Number(item.favorite_count ?? item.likeCount ?? 0),
        comments: Number(item.reply_count ?? item.replyCount ?? 0),
        shares: Number(item.retweet_count ?? item.retweetCount ?? 0),
        reach: Number(item.impression_count ?? item.viewCount ?? 0),
        posted_at: String(item.created_at ?? item.createdAt ?? new Date().toISOString()),
      }

    case 'linkedin':
      return {
        ...base,
        content: String(item.text ?? item.description ?? ''),
        format: String(item.type ?? 'post'),
        likes: Number(item.numLikes ?? item.likesCount ?? 0),
        comments: Number(item.numComments ?? item.commentsCount ?? 0),
        shares: Number(item.numShares ?? 0),
        reach: Number(item.numViews ?? item.viewCount ?? 0),
        posted_at: String(item.postedAt ?? item.publishedAt ?? new Date().toISOString()),
      }

    case 'youtube':
      return {
        ...base,
        content: String(item.title ?? '') + (item.description ? '\n' + String(item.description).slice(0, 300) : ''),
        format: 'video',
        likes: Number(item.likes ?? item.likeCount ?? 0),
        comments: Number(item.commentsCount ?? item.commentCount ?? 0),
        shares: 0,
        reach: Number(item.viewCount ?? item.views ?? 0),
        posted_at: String(item.publishedAt ?? item.uploadDate ?? new Date().toISOString()),
      }

    default:
      return {
        ...base,
        content: '',
        format: 'post',
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        posted_at: new Date().toISOString(),
      }
  }
}

// ── Profile normalization ────────────────────────────────────────────────────

interface ProfileData {
  followers: number
  following: number
  posts_count: number
}

function normalizeProfile(platform: string, item: Record<string, unknown>): ProfileData {
  switch (platform) {
    case 'instagram':
      return {
        followers: Number(item.followersCount ?? item.followedByCount ?? 0),
        following: Number(item.followsCount ?? item.followCount ?? 0),
        posts_count: Number(item.postsCount ?? item.mediaCount ?? 0),
      }
    case 'tiktok':
      return {
        followers: Number(item.fans ?? item.followerCount ?? 0),
        following: Number(item.following ?? item.followingCount ?? 0),
        posts_count: Number(item.video ?? item.videoCount ?? 0),
      }
    case 'youtube':
      return {
        followers: Number(item.subscriberCount ?? item.subscribers ?? 0),
        following: 0,
        posts_count: Number(item.videoCount ?? 0),
      }
    default:
      return { followers: 0, following: 0, posts_count: 0 }
  }
}

function buildProfileInput(platform: string, handle: string): Record<string, unknown> {
  const username = cleanHandle(platform, handle)
  switch (platform) {
    case 'instagram':
      return {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'details',
        resultsLimit: 1,
      }
    case 'tiktok':
      return { profiles: [handle], maxItems: 1, profilesOnly: true }
    case 'youtube':
      return { channelUrl: handle, maxResults: 1 }
    default:
      return {}
  }
}

// ── Actor inputs for posts ───────────────────────────────────────────────────

function buildActorInput(platform: string, handle: string): Record<string, unknown> {
  const username = cleanHandle(platform, handle)
  switch (platform) {
    case 'instagram':
      return {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'posts',
        resultsLimit: 50,
      }
    case 'tiktok':
      return { profiles: [handle], maxItems: 50 }
    case 'twitter':
      return { searchTerms: [`from:${handle.replace('@', '')}`], maxItems: 50 }
    case 'linkedin':
      return { searchUrl: handle, maxPosts: 50 }
    case 'youtube':
      return { channelUrl: handle, maxResults: 50 }
    default:
      return {}
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchAndStoreProfile(
  platform: string,
  handle: string,
  apifyToken?: string,
): Promise<ProfileData | null> {
  const p = platform.toLowerCase()
  // Only these platforms support profile-level detail scraping
  if (!['instagram', 'tiktok', 'youtube'].includes(p)) return null

  try {
    const client = getClient(apifyToken)
    const actorId = ACTOR_MAP[p]
    const input = buildProfileInput(p, handle)

    const run = await client.actor(actorId).call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

    const raw = items.find(
      (item) => !(item as Record<string, unknown>).error,
    ) as Record<string, unknown> | undefined

    if (!raw) return null

    const profileData = normalizeProfile(p, raw)
    const username = cleanHandle(p, handle)

    // Fetch current followers before overwriting (for growth tracking)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('followers')
      .eq('platform', p)
      .eq('handle', username)
      .single()

    await supabaseAdmin.from('profiles').upsert(
      {
        platform: p,
        handle: username,
        followers: profileData.followers,
        previous_followers: existing?.followers ?? profileData.followers,
        following: profileData.following,
        posts_count: profileData.posts_count,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: 'platform,handle' },
    )

    return profileData
  } catch (err) {
    console.error(`[apify] profile fetch failed for ${platform}/${handle}:`, err)
    return null
  }
}

export async function scrapeAndStore(
  platform: string,
  handle: string,
  apifyToken?: string,
): Promise<{ inserted: number; errors: number }> {
  const p = platform.toLowerCase()
  const actorId = ACTOR_MAP[p]
  if (!actorId) throw new Error(`Unsupported platform: ${platform}`)

  const client = getClient(apifyToken)
  const input = buildActorInput(p, handle)

  const run = await client.actor(actorId).call(input)
  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  console.log(`[apify] ${p} returned ${items.length} items`)
  if (items.length > 0) {
    console.log(`[apify] first item keys:`, Object.keys(items[0] as object))
    console.log(`[apify] first item sample:`, JSON.stringify(items[0]).slice(0, 500))
  }

  let inserted = 0
  let errors = 0

  for (const item of items) {
    const row = item as Record<string, unknown>
    if (row.error) {
      console.warn('[apify] skipping error item:', row.errorDescription)
      continue
    }
    try {
      const post = normalizePost(p, row)
      const { error } = await supabaseAdmin.from('posts').insert(post)
      if (error) {
        console.error('Supabase insert error:', error)
        errors++
      } else {
        inserted++
      }
    } catch (err) {
      console.error('Normalization error:', err)
      errors++
    }
  }

  return { inserted, errors }
}
