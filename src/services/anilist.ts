// AniList GraphQL API — CORS: * — metadata enrichment only (no chapter reading)
// Provides: ratings, popularity, high-res covers, descriptions, genres, AniList ID

const ANILIST_URL = 'https://graphql.anilist.co'

export interface AnilistManga {
  id: number
  siteUrl: string
  title: { english: string | null; romaji: string | null }
  coverImage: { extraLarge: string; large: string }
  bannerImage: string | null
  averageScore: number | null   // 0–100
  meanScore: number | null
  popularity: number | null     // number of users tracking
  favourites: number | null
  chapters: number | null
  volumes: number | null
  status: string | null
  description: string | null
  genres: string[]
  startDate: { year: number | null }
}

const FRAGMENT = `
  id siteUrl
  title { english romaji }
  coverImage { extraLarge large }
  bannerImage
  averageScore meanScore popularity favourites
  chapters volumes status
  description(asHtml: false)
  genres
  startDate { year }
`

async function query<T>(gql: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.data ?? null) as T
  } catch {
    return null
  }
}

/** Find a manga on AniList by title string. Returns the best match or null. */
export async function searchAnilist(title: string): Promise<AnilistManga | null> {
  const data = await query<{ Media: AnilistManga }>(
    `query ($search: String) { Media(search: $search, type: MANGA, sort: SEARCH_MATCH) { ${FRAGMENT} } }`,
    { search: title },
  )
  return data?.Media ?? null
}

/** Fetch multiple manga at once for card grid enrichment (batched). */
export async function searchAnilistMany(
  titles: string[],
): Promise<Map<string, AnilistManga>> {
  if (titles.length === 0) return new Map()

  // AniList Page query — up to 50 results
  const data = await query<{ Page: { media: AnilistManga[] } }>(
    `query ($search: String) {
       Page(page: 1, perPage: 50) {
         media(search: $search, type: MANGA, sort: SEARCH_MATCH) { ${FRAGMENT} }
       }
     }`,
    { search: titles[0] }, // single-term search gets fuzzy matches
  )

  const results = new Map<string, AnilistManga>()
  const items = data?.Page?.media ?? []

  // Match each title to the best AniList result
  for (const title of titles) {
    const tl = title.toLowerCase()
    const match = items.find(
      (m) =>
        m.title.english?.toLowerCase() === tl ||
        m.title.romaji?.toLowerCase() === tl,
    ) ?? items.find(
      (m) =>
        m.title.english?.toLowerCase().includes(tl) ||
        m.title.romaji?.toLowerCase().includes(tl) ||
        tl.includes(m.title.english?.toLowerCase() ?? '___') ||
        tl.includes(m.title.romaji?.toLowerCase() ?? '___'),
    )
    if (match) results.set(title, match)
  }

  return results
}
