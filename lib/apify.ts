import { ApifyClient } from 'apify-client'
import { supabaseAdmin } from '@/lib/supabase'
import type { Post } from '@/types'

const ACTOR_MAP: Record<string, string> = {
  instagram: 'apify/instagram-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  twitter: 'apidojo/tweet-scraper',
  linkedin: 'harvestapi/linkedin-company-posts',
  youtube: 'streamers/youtube-scraper',
  facebook: 'apify/facebook-posts-scraper',
}

// Some platforms need a separate actor for profile/page data
const PROFILE_ACTOR_MAP: Record<string, string> = {
  facebook: 'apify/facebook-pages-scraper',
}

// LinkedIn personal profiles use a different actor than company pages
const LINKEDIN_PROFILE_ACTOR = 'harvestapi/linkedin-profile-posts'

function getLinkedInActorId(handle: string): string {
  return handle.includes('/in/') ? LINKEDIN_PROFILE_ACTOR : ACTOR_MAP['linkedin']
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
    case 'instagram': {
      const format = String(item.type ?? item.productType ?? 'post')
      const isVideo = /video/i.test(format)
      return {
        ...base,
        source_id: String(item.shortCode ?? item.id ?? '') || null,
        content: String(item.caption ?? item.alt ?? ''),
        format,
        likes: Number(item.likesCount ?? item.likes ?? 0),
        comments: Number(item.commentsCount ?? item.comments ?? 0),
        shares: 0,
        reach: isVideo ? Number(item.videoViewCount ?? item.videoPlayCount ?? 0) : 0,
        posted_at: String(item.timestamp ?? item.takenAtTimestamp ?? new Date().toISOString()),
      }
    }

    case 'tiktok': {
      const stats = (item.stats ?? {}) as Record<string, unknown>
      return {
        ...base,
        source_id: String(item.id ?? '') || null,
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
        source_id: String(item.id_str ?? item.id ?? '') || null,
        content: String(item.full_text ?? item.text ?? ''),
        format: item.retweeted_status ? 'retweet' : 'tweet',
        likes: Number(item.favorite_count ?? item.likeCount ?? 0),
        comments: Number(item.reply_count ?? item.replyCount ?? 0),
        shares: Number(item.retweet_count ?? item.retweetCount ?? 0),
        reach: Number(item.impression_count ?? item.viewCount ?? 0),
        posted_at: String(item.created_at ?? item.createdAt ?? new Date().toISOString()),
      }

    case 'linkedin': {
      // postedAt is an object { date: ISO string, timestamp: number }
      const postedAt = item.postedAt as Record<string, unknown> | string | null | undefined
      const postedAtStr =
        postedAt && typeof postedAt === 'object'
          ? String((postedAt as Record<string, unknown>).date ?? new Date().toISOString())
          : String(postedAt ?? new Date().toISOString())

      // engagement counts may be top-level or nested under item.engagement
      const eng = (item.engagement ?? {}) as Record<string, unknown>

      return {
        ...base,
        source_id: String(item.id ?? item.urn ?? '') || null,
        content: String(item.content ?? item.text ?? item.commentary ?? item.description ?? ''),
        format: String(item.type ?? 'post'),
        likes: Number(item.likes ?? eng.likes ?? eng.numLikes ?? 0),
        comments: Number(
          Array.isArray(item.comments)
            ? (item.comments as unknown[]).length
            : (item.comments ?? eng.comments ?? eng.numComments ?? 0),
        ),
        shares: Number(item.shares ?? eng.shares ?? eng.numShares ?? eng.reposts ?? 0),
        // LinkedIn does not expose impression/view counts publicly — always null from any scraper
        reach: 0,
        posted_at: postedAtStr,
      }
    }

    case 'youtube':
      return {
        ...base,
        source_id: String(item.id ?? item.videoId ?? '') || null,
        content: String(item.title ?? '') + (item.description ? '\n' + String(item.description).slice(0, 300) : ''),
        format: 'video',
        likes: Number(item.likes ?? item.likeCount ?? 0),
        comments: Number(item.commentsCount ?? item.commentCount ?? 0),
        shares: 0,
        reach: Number(item.viewCount ?? item.views ?? 0),
        posted_at: String(item.publishedAt ?? item.uploadDate ?? item.date ?? item.upload_date ?? item.publishDate ?? new Date().toISOString()),
      }

    case 'facebook':
      return {
        ...base,
        source_id: String(item.postId ?? item.id ?? '') || null,
        content: String(item.text ?? item.message ?? ''),
        format: String(item.type ?? 'post'),
        likes: Number(item.likes ?? item.likesCount ?? 0),
        comments: Number(item.comments ?? item.commentsCount ?? 0),
        shares: Number(item.shares ?? item.sharesCount ?? 0),
        reach: Number(item.viewsCount ?? item.views ?? item.viewCount ?? item.videoViewCount ?? 0),
        posted_at: String(item.time ?? item.timestamp ?? item.date ?? new Date().toISOString()),
      }

    default:
      return {
        ...base,
        source_id: null,
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
    case 'tiktok': {
      const authorMeta = (item.authorMeta ?? {}) as Record<string, unknown>
      return {
        followers: Number(item.fans ?? item.followerCount ?? authorMeta.fans ?? authorMeta.followerCount ?? 0),
        following: Number(item.following ?? item.followingCount ?? authorMeta.following ?? authorMeta.followingCount ?? 0),
        posts_count: Number(item.video ?? item.videoCount ?? authorMeta.video ?? authorMeta.videoCount ?? 0),
      }
    }
    case 'twitter': {
      const author = (item.author ?? item.user ?? {}) as Record<string, unknown>
      return {
        followers: Number(item.followers ?? item.followersCount ?? author.followers ?? author.followersCount ?? 0),
        following: Number(item.following ?? item.followingCount ?? author.following ?? author.followingCount ?? 0),
        posts_count: Number(item.statusesCount ?? author.statusesCount ?? 0),
      }
    }
    case 'youtube':
      return {
        followers: Number(item.numberOfSubscribers ?? item.subscriberCount ?? item.subscribers ?? 0),
        following: 0,
        posts_count: Number(item.channelTotalVideos ?? item.videoCount ?? 0),
      }
    case 'linkedin': {
      // author.info is a string like "89,534 followers" — parse it
      const author = (item.author ?? {}) as Record<string, unknown>
      const info = String(author.info ?? '')
      const followerMatch = info.match(/([\d,]+)\s+follower/i)
      const followers = followerMatch ? parseInt(followerMatch[1].replace(/,/g, ''), 10) : 0
      return { followers, following: 0, posts_count: 0 }
    }
    case 'facebook':
      return {
        followers: Number(
          item.followers ?? item.followersCount ?? item.likes ?? item.pageLikes ?? 0,
        ),
        following: 0,
        posts_count: Number(item.posts ?? item.postsCount ?? 0),
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
      return {
        profiles: [username],
        resultsPerPage: 1,
        profileScrapeSections: ['videos'],
        profileSorting: 'latest',
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      }
    case 'twitter':
      return {
        twitterHandles: [username],
        maxItems: 1,
        sort: 'Latest',
      }
    case 'youtube': {
      const channelUrl = handle.startsWith('http')
        ? handle.replace(/\/videos\/?$/, '')
        : `https://www.youtube.com/@${username}`
      return {
        startUrls: [{ url: channelUrl }],
        maxResults: 1,
        maxResultsShorts: 0,
        downloadSubtitles: false,
      }
    }
    case 'facebook': {
      const pageUrl = handle.startsWith('http')
        ? handle
        : `https://www.facebook.com/${handle.replace('@', '')}/`
      return { startUrls: [{ url: pageUrl }] }
    }
    case 'linkedin': {
      const linkedinUrl = handle.startsWith('http')
        ? handle
        : handle.includes('/in/')
          ? `https://www.linkedin.com/in/${handle.replace('@', '')}/`
          : `https://www.linkedin.com/company/${handle.replace('@', '')}/`
      return { targetUrls: [linkedinUrl], maxPosts: 1 }
    }
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
        resultsType: 'reels',
        resultsLimit: 200,
      }
    case 'tiktok':
      return {
        profiles: [username],
        resultsPerPage: 500,
        profileScrapeSections: ['videos'],
        profileSorting: 'latest',
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadAvatars: false,
        shouldDownloadMusicCovers: false,
      }
    case 'twitter':
      return {
        twitterHandles: [username],
        maxItems: 200,
        sort: 'Latest',
        onlyImage: false,
        onlyVideo: false,
        onlyQuote: false,
      }
    case 'linkedin': {
      const linkedinUrl = handle.startsWith('http')
        ? handle
        : handle.includes('/in/')
          ? `https://www.linkedin.com${handle.startsWith('/') ? '' : '/'}${handle}`
          : `https://www.linkedin.com/company/${handle.replace('@', '')}/`
      return {
        targetUrls: [linkedinUrl],
        maxPosts: 50,
        scrapeReactions: false,
        includeReposts: false,
      }
    }
    case 'youtube': {
      const channelUrl = handle.startsWith('http')
        ? handle
        : `https://www.youtube.com/@${username}/videos`
      return {
        startUrls: [{ url: channelUrl }],
        maxResults: 30,
        maxResultsShorts: 30,
        downloadSubtitles: false,
        hasCC: false,
        hasLocation: false,
        hasSubtitles: false,
        is360: false,
        is3D: false,
        is4K: false,
        isHD: false,
        isLive: false,
      }
    }
    case 'facebook': {
      const pageUrl = handle.startsWith('http')
        ? handle
        : `https://www.facebook.com/${handle.replace('@', '')}/`
      return {
        startUrls: [{ url: pageUrl }],
        resultsLimit: 50,
        captionText: false,
      }
    }
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
  if (!['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin'].includes(p)) return null

  try {
    const client = getClient(apifyToken)
    const actorId = PROFILE_ACTOR_MAP[p] ?? (p === 'linkedin' ? getLinkedInActorId(handle) : ACTOR_MAP[p])
    const input = buildProfileInput(p, handle)

    const run = await client.actor(actorId).call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 })

    console.log(`[apify] profile fetch for ${p}/${handle} — ${items.length} items returned`)
    if (items.length > 0) {
      console.log(`[apify] profile item keys:`, Object.keys(items[0] as object))
      console.log(`[apify] profile item sample:`, JSON.stringify(items[0]).slice(0, 1000))
    }

    const raw = items.find(
      (item) => !(item as Record<string, unknown>).error,
    ) as Record<string, unknown> | undefined

    if (!raw) {
      console.warn(`[apify] no valid profile item found for ${p}/${handle}`)
      return null
    }

    const profileData = normalizeProfile(p, raw)
    console.log(`[apify] normalized profile:`, profileData)
    const username = cleanHandle(p, handle)

    // Fetch current followers before overwriting (for growth tracking)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('followers')
      .eq('platform', p)
      .eq('handle', username)
      .single()

    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(
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

    if (upsertError) {
      console.error(`[apify] profile upsert failed for ${p}/${username}:`, upsertError)
    } else {
      console.log(`[apify] profile upserted successfully for ${p}/${username}`)
    }

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
  cutoffDate?: Date,
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const p = platform.toLowerCase()
  const actorId = p === 'linkedin' ? getLinkedInActorId(handle) : ACTOR_MAP[p]
  if (!actorId) throw new Error(`Unsupported platform: ${platform}`)

  const client = getClient(apifyToken)
  const input = buildActorInput(p, handle)

  const run = await client.actor(actorId).call(input)
  const { items, total } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1000 })

  console.log(`[apify] ${p} returned ${items.length} items (dataset total: ${total}, run status: ${run.status})`)
  if (items.length > 0) {
    console.log(`[apify] first item keys:`, Object.keys(items[0] as object))
    console.log(`[apify] first item sample:`, JSON.stringify(items[0]).slice(0, 500))
  }

  // Normalize all valid items first
  const posts: Omit<Post, 'id' | 'created_at' | 'score'>[] = []
  for (const item of items) {
    const row = item as Record<string, unknown>
    if (row.error) {
      console.warn('[apify] skipping error item:', row.errorDescription)
      continue
    }
    try {
      const post = normalizePost(p, row)
      if (cutoffDate && new Date(post.posted_at) < cutoffDate) {
        console.log('[apify] skipping old post from:', post.posted_at, 'cutoff:', cutoffDate)
        continue
      }
      // For Instagram, skip non-video posts (images/carousels have no view data)
      if (p === 'instagram' && post.reach === 0) {
        console.log('[apify] skipping instagram non-video post:', post.source_id)
        continue
      }
      posts.push(post)
    } catch (err) {
      console.error('Normalization error:', err)
    }
  }

  // Batch-check which source_ids already exist in the DB
  const sourceIds = posts.map((p) => p.source_id).filter((id): id is string => !!id)
  const existingIds = new Set<string>()
  if (sourceIds.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('source_id')
      .eq('platform', p)
      .in('source_id', sourceIds)
    for (const row of existing ?? []) {
      if (row.source_id) existingIds.add(row.source_id)
    }
  }

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const post of posts) {
    if (post.source_id && existingIds.has(post.source_id)) {
      skipped++
      continue
    }
    const { error } = await supabaseAdmin.from('posts').insert(post)
    if (error) {
      console.error('Supabase insert error:', error)
      errors++
    } else {
      inserted++
    }
  }

  console.log(`[apify] ${p} — inserted: ${inserted}, skipped (duplicates): ${skipped}, errors: ${errors}`)
  return { inserted, skipped, errors }
}
