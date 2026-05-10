import type {
  Manga,
  Chapter,
  Tag,
  SearchParams,
  SearchResult,
  ChapterPages,
  ApiSource,
  MangaStatus,
  MangaType,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

export const MANGADEX_BASE = 'https://api.mangadex.org'
export const COMICK_BASE = 'https://api.comick.io'
const MD_COVERS = 'https://uploads.mangadex.org/covers'
const COMICK_IMG = 'https://meo.comick.pictures'

// Consumet server URL
let _consumetUrl = ''
export function setConsumetUrl(url: string) { _consumetUrl = url.replace(/\/$/, '') }
export function getConsumetUrl() { return _consumetUrl }

function _initConsumetUrl(): string {
  try {
    const s = JSON.parse(localStorage.getItem('mh_settings') ?? '{}')
    if (s.consumetUrl) return String(s.consumetUrl).replace(/\/$/, '')
  } catch { /* ignore */ }
  // Vite replaces import.meta.env.VITE_* at build time
  const fromEnv = import.meta.env.VITE_CONSUMET_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  return ''
}
_consumetUrl = _initConsumetUrl()

function consumetFetch<T>(path: string): Promise<T> {
  if (!_consumetUrl) throw new Error('Consumet server not configured')
  return get<T>(`${_consumetUrl}${path}`)
}

const CONSUMET_SOURCES = new Set<string>(['mangapill', 'weebcentral'])

// Worker URL — read synchronously on module load so the very first API call uses it.
// Priority: localStorage (user-configured) → build-time VITE_WORKER_URL env var.
function _readWorkerUrl(): string {
  try {
    const s = JSON.parse(localStorage.getItem('mh_settings') ?? '{}')
    if (s.workerUrl) return String(s.workerUrl).replace(/\/$/, '')
  } catch { /* ignore */ }
  try {
    const env = (import.meta as { env?: Record<string, string> }).env
    if (env?.VITE_WORKER_URL) return env.VITE_WORKER_URL.replace(/\/$/, '')
  } catch { /* ignore */ }
  return ''
}

let _workerUrl: string = _readWorkerUrl()
export function setWorkerUrl(url: string) { _workerUrl = url.replace(/\/$/, '') }
export function getWorkerUrl() { return _workerUrl }

function workerFetch<T>(path: string): Promise<T> {
  if (!_workerUrl) throw new Error('Worker not configured')
  return get<T>(`${_workerUrl}${path}`)
}

// Route MangaDex / Comick calls through the worker when available.
// This fixes CORS on production deployments where browsers block direct API calls.
function mdUrl(path: string): string {
  return _workerUrl ? `${_workerUrl}/mangadex${path}` : `${MANGADEX_BASE}${path}`
}
// Comick through worker gets 502 (CF blocks CF-to-CF). Call directly from browser —
// the browser's real-browser fingerprint passes Comick's JS challenge better than a worker.
function comickUrl(path: string): string {
  return `${COMICK_BASE}${path}`
}

// Preferred language ordering for deduplication.
// When multiple scanlation groups upload the same chapter number,
// we pick whichever has the highest-priority language.
const LANG_PRIORITY = [
  'en', 'pt-br', 'es', 'es-la', 'fr', 'de', 'it', 'pl', 'nl',
  'tr', 'id', 'th', 'vi', 'ar', 'ru', 'ko', 'zh', 'zh-hk', 'ja',
]

function langScore(lang: string): number {
  const idx = LANG_PRIORITY.indexOf(lang)
  return idx === -1 ? 999 : idx
}

// ─── Rate limiter (MangaDex: ~5 req/s) ────────────────────────────────────────

let _lastReq = 0
async function throttle() {
  const gap = 210
  const now = Date.now()
  const wait = gap - (now - _lastReq)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  _lastReq = Date.now()
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function get<T>(url: string): Promise<T> {
  await throttle()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json') && !ct.includes('javascript')) {
    const preview = await res.text()
    throw new Error(`Non-JSON response (${ct}): ${preview.slice(0, 80)}`)
  }
  return res.json() as Promise<T>
}

// ─── MangaDex parsers ─────────────────────────────────────────────────────────

function mdCoverUrl(mangaId: string, fileName: string, size: '256' | '512' = '512') {
  return `${MD_COVERS}/${mangaId}/${fileName}.${size}.jpg`
}

function mdOriginalLangToType(lang?: string): MangaType {
  if (lang === 'ko') return 'manhwa'
  if (lang === 'zh' || lang === 'zh-hk') return 'manhua'
  return 'manga'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMdManga(item: any): Manga {
  const a = item.attributes ?? {}

  const title: string =
    a.title?.en ??
    (Object.values(a.title ?? {}) as string[])[0] ??
    'Unknown Title'

  const description: string =
    a.description?.en ??
    (Object.values(a.description ?? {}) as string[])[0] ??
    ''

  const rels = (item.relationships ?? []) as any[]
  const coverRel = rels.find((r) => r.type === 'cover_art')
  const coverUrl = coverRel?.attributes?.fileName
    ? mdCoverUrl(item.id, coverRel.attributes.fileName)
    : undefined


  const authors = rels
    .filter((r) => r.type === 'author')
    .map((r) => ({ id: r.id, name: r.attributes?.name ?? 'Unknown' }))

  const artists = rels
    .filter((r) => r.type === 'artist')
    .map((r) => ({ id: r.id, name: r.attributes?.name ?? 'Unknown' }))

  const tags: Tag[] = (a.tags ?? []).map((t: any) => ({
    id: t.id,
    name: t.attributes?.name?.en ?? 'Unknown',
  }))

  return {
    id: item.id,
    title,
    alternativeTitles: (a.altTitles ?? [])
      .map((t: any) => (Object.values(t) as string[])[0])
      .filter(Boolean)
      .slice(0, 4),
    description,
    coverUrl,
    status: (a.status as MangaStatus) ?? undefined,
    type: mdOriginalLangToType(a.originalLanguage),
    contentRating: a.contentRating,
    publicationDemographic: a.publicationDemographic,
    tags,
    authors,
    artists,
    year: a.year ?? undefined,
    latestChapter: a.lastChapter ?? undefined,
    source: 'mangadex',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMdChapter(item: any): Chapter {
  const a = item.attributes ?? {}
  const group = (item.relationships ?? []).find(
    (r: any) => r.type === 'scanlation_group',
  )
  return {
    id: item.id,
    number: a.chapter ?? '0',
    title: a.title ?? undefined,
    volume: a.volume ?? undefined,
    language: a.translatedLanguage ?? 'unknown',
    publishedAt: a.publishAt ?? a.createdAt,
    pages: a.pages,
    scanlationGroup: group?.attributes?.name,
    source: 'mangadex',
  }
}

// ─── Comick parsers ───────────────────────────────────────────────────────────

function comickStatus(n: number): MangaStatus {
  const m: Record<number, MangaStatus> = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' }
  return m[n] ?? 'ongoing'
}

function comickCountry(c: string): MangaType {
  if (c === 'kr') return 'manhwa'
  if (c === 'cn') return 'manhua'
  return 'manga'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseComickManga(item: any): Manga {
  const covers: any[] = item.md_covers ?? []
  const coverKey = covers[0]?.b2key ?? covers[0]?.gpurl ?? null
  const coverUrl = item.cover_url ?? (coverKey ? `${COMICK_IMG}/${coverKey}` : undefined)

  const tags: Tag[] = (item.md_comic_md_genres ?? item.genres ?? []).map((g: any) => ({
    id: String(g.genre?.id ?? g.id ?? g),
    name: g.genre?.name ?? g.name ?? String(g),
  }))

  return {
    id: item.slug ?? item.hid,
    title: item.title ?? item.name ?? 'Unknown',
    description: item.desc ?? item.summary ?? '',
    coverUrl,
    status: comickStatus(item.status),
    type: comickCountry(item.country ?? 'jp'),
    tags,
    authors: [],
    artists: [],
    year: item.year ?? undefined,
    latestChapter: item.last_chapter != null ? String(item.last_chapter) : undefined,
    source: 'comick',
    sourceSlug: item.slug ?? item.hid,
  }
}

// ─── Smart chapter deduplication ─────────────────────────────────────────────
// MangaDex returns one entry per chapter per scanlation group. For a chapter
// that 5 groups uploaded, we pick the highest-priority language among those.
// This gives us maximum chapter coverage (e.g. Blue Lock: 2 EN → 181 total).

function deduplicateChapters(chapters: Chapter[]): Chapter[] {
  const byNumber = new Map<string, Chapter>()
  for (const ch of chapters) {
    const existing = byNumber.get(ch.number)
    if (!existing || langScore(ch.language) < langScore(existing.language)) {
      byNumber.set(ch.number, ch)
    }
  }
  return Array.from(byNumber.values()).sort((a, b) => {
    const na = parseFloat(a.number)
    const nb = parseFloat(b.number)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.number.localeCompare(b.number)
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchManga(params: SearchParams): Promise<SearchResult> {
  const { source = 'mangadex' } = params
  if (source === 'nhentai') return _nhentaiSearch(params)
  if (source === 'manganato') return _manganatoSearch(params)
  if (source === 'comick') return _comickSearch(params)
  if (CONSUMET_SOURCES.has(source)) return _consumetSearch(params)

  try {
    return await _mdSearch(params)
  } catch (err) {
    console.warn('[MangaHub] MangaDex search failed, falling back to Comick:', err)
    return _comickSearch(params)
  }
}

async function _mdSearch(params: SearchParams): Promise<SearchResult> {
  const { query, status, tags, year, sort, limit = 24, offset = 0, includeAdult = false } = params
  const p = new URLSearchParams()
  p.set('limit', String(limit))
  p.set('offset', String(offset))
  p.append('includes[]', 'cover_art')
  p.append('includes[]', 'author')
  p.append('includes[]', 'artist')
  p.append('contentRating[]', 'safe')
  if (includeAdult) {
    p.append('contentRating[]', 'suggestive')
    p.append('contentRating[]', 'erotica')
    p.append('contentRating[]', 'pornographic')
  }

  if (query) p.set('title', query)
  if (status && status !== 'all') p.set('status[]', status)
  if (year) p.set('year', String(year))
  if (tags?.length) tags.forEach((t) => p.append('includedTags[]', t))

  const orderMap: Record<string, string> = {
    latest: 'order[latestUploadedChapter]=desc',
    popular: 'order[followedCount]=desc',
    title: 'order[title]=asc',
    rating: 'order[rating]=desc',
  }
  const orderStr = orderMap[sort ?? 'latest'] ?? orderMap.latest
  const [orderKey, orderVal] = orderStr.split('=')
  p.set(orderKey, orderVal)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await get<any>(mdUrl(`/manga?${p}`))
  return { data: data.data.map(parseMdManga), total: data.total, source: 'mangadex' }
}

async function _comickSearch(params: SearchParams): Promise<SearchResult> {
  const { query = '', limit = 24, offset = 0 } = params
  const page = Math.floor(offset / limit) + 1
  const p = new URLSearchParams({ q: query, limit: String(limit), page: String(page), t: 'false' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await get<any[]>(comickUrl(`/v1.0/search?${p}`))
  const arr = Array.isArray(data) ? data : []
  return {
    data: arr.map(parseComickManga),
    total: arr.length < limit ? offset + arr.length : offset + limit + 1,
    source: 'comick',
  }
}

export async function getMangaById(id: string, source: ApiSource = 'mangadex'): Promise<Manga> {
  if (CONSUMET_SOURCES.has(source)) {
    return consumetFetch<Manga>(`/manga/${source}/${encodeURIComponent(id)}`)
  }
  if (source === 'nhentai') {
    return workerFetch<Manga>(`/nhentai/manga/${id}`)
  }
  if (source === 'manganato') {
    const qs = new URLSearchParams({ slug: `https://chapmanganato.to/${id}` })
    return workerFetch<Manga>(`/manganato/manga/${encodeURIComponent(id)}?${qs}`)
  }
  if (source === 'comick') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await get<any>(comickUrl(`/comic/${id}`))
    return parseComickManga(d.comic ?? d)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await get<any>(mdUrl(`/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`))
  return parseMdManga(d.data)
}

export async function getChapterList(
  mangaId: string,
  source: ApiSource = 'mangadex',
): Promise<Chapter[]> {
  if (CONSUMET_SOURCES.has(source)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await consumetFetch<any>(`/manga/${source}/${encodeURIComponent(mangaId)}`)
    return d.chapters ?? []
  }
  if (source === 'nhentai') {
    return workerFetch<Chapter[]>(`/nhentai/chapters/${mangaId}`)
  }
  if (source === 'manganato') {
    const qs = new URLSearchParams({ slug: `https://chapmanganato.to/${mangaId}` })
    return workerFetch<Chapter[]>(`/manganato/chapters/${encodeURIComponent(mangaId)}?${qs}`)
  }
  if (source === 'comick') return _comickChapters(mangaId)

  const chapters: Chapter[] = []
  let offset = 0
  const limit = 500

  while (true) {
    const p = new URLSearchParams({
      'translatedLanguage[]': 'en',
      limit: String(limit),
      offset: String(offset),
      'order[chapter]': 'asc',
      'includes[]': 'scanlation_group',
      'contentRating[]': 'safe',
    })
    p.append('contentRating[]', 'suggestive')
    p.append('contentRating[]', 'erotica')
    p.append('contentRating[]', 'pornographic')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await get<any>(mdUrl(`/manga/${mangaId}/feed?${p}`))
    chapters.push(...d.data.map(parseMdChapter))
    if (chapters.length >= d.total || d.data.length === 0) break
    offset += limit
  }

  return deduplicateChapters(chapters)
}

async function _comickChapters(slug: string): Promise<Chapter[]> {
  const chapters: Chapter[] = []
  let page = 1
  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await get<any>(comickUrl(`/comic/${slug}/chapters?lang=en&page=${page}&limit=200&chap-order=1`))
    const arr: any[] = d.chapters ?? []
    chapters.push(
      ...arr.map((c): Chapter => ({
        id: c.hid,
        number: c.chap ?? '0',
        title: c.title ?? undefined,
        volume: c.vol ?? undefined,
        language: c.lang ?? 'en',
        publishedAt: c.created_at,
        scanlationGroup: c.group_name?.[0],
        source: 'comick',
      })),
    )
    if (arr.length < 200) break
    page++
  }
  return deduplicateChapters(chapters)
}

export async function getChapterPages(
  chapterId: string,
  source: ApiSource = 'mangadex',
  quality: 'high' | 'data-saver' = 'high',
): Promise<ChapterPages> {
  if (CONSUMET_SOURCES.has(source)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await consumetFetch<any>(`/pages/${source}/${encodeURIComponent(chapterId)}`)
    const pages: string[] = (d.pages ?? []).map((p: any) => {
      const url = p.url as string
      // WeebCentral (and possibly others) need a Referer header for their CDN.
      // Route those through the worker image proxy which can inject headers.
      if (d.imageReferer && _workerUrl) {
        return `${_workerUrl}/proxy-img?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(d.imageReferer)}`
      }
      return url
    })
    return { chapterId, pages, source }
  }
  if (source === 'nhentai') {
    // chapterId == gallery id for nhentai
    const d = await workerFetch<{ chapterId: string; pages: string[]; source: string }>(
      `/nhentai/pages/${chapterId}`,
    )
    return { chapterId, pages: d.pages, source: 'nhentai' }
  }
  if (source === 'manganato') {
    // chapterId is the slug path, e.g. "manga-xxx/chapter-123"
    const qs = new URLSearchParams({ slug: `https://chapmanganato.to/${chapterId}` })
    const d = await workerFetch<{ chapterId: string; pages: string[]; source: string }>(
      `/manganato/pages/${encodeURIComponent(chapterId)}?${qs}`,
    )
    return { chapterId, pages: d.pages, source: 'manganato' }
  }
  if (source === 'comick') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await get<any>(comickUrl(`/chapter/${chapterId}`))
    const imgs: any[] = d.chapter?.images ?? d.images ?? []
    return {
      chapterId,
      pages: imgs.map((i) => i.url ?? `${COMICK_IMG}/${i.b2key}`),
      source: 'comick',
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await get<any>(mdUrl(`/at-home/server/${chapterId}`))
  const { baseUrl, chapter } = d
  const { hash, data: hq, dataSaver: ds } = chapter
  const files: string[] = quality === 'data-saver' ? ds : hq
  const seg = quality === 'data-saver' ? 'data-saver' : 'data'

  // When worker is configured, proxy chapter images through it.
  // The at-home CDN assigns nodes based on the requesting IP — the worker made
  // the /at-home/server request, so images must also come from the same worker IP.
  const makeImageUrl = (filename: string) => {
    const direct = `${baseUrl}/${seg}/${hash}/${filename}`
    return _workerUrl
      ? `${_workerUrl}/md-img?url=${encodeURIComponent(direct)}`
      : direct
  }

  return {
    chapterId,
    pages: files.map(makeImageUrl),
    source: 'mangadex',
  }
}

export async function getTags(): Promise<Tag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await get<any>(mdUrl('/manga/tag'))
  return (d.data as any[])
    .map((t) => ({ id: t.id, name: t.attributes?.name?.en ?? 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Source comparison helpers ────────────────────────────────────────────────
// These are lightweight — they fetch only 1 item to get the total count,
// without loading all chapters. Used by the source selector in the background.

export async function getMdChapterCount(mangaId: string): Promise<number> {
  const p = new URLSearchParams({ limit: '1', offset: '0' })
  p.append('contentRating[]', 'safe')
  p.append('contentRating[]', 'suggestive')
  p.append('contentRating[]', 'erotica')
  p.append('contentRating[]', 'pornographic')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await get<any>(mdUrl(`/manga/${mangaId}/feed?${p}`))
  return d.total as number
}

export interface ComickMatch {
  slug: string
  title: string
  lastChapter: number
  chapterCount?: number
}

export async function findOnComick(title: string): Promise<ComickMatch | null> {
  const p = new URLSearchParams({ q: title, limit: '5', t: 'false' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await get<any[]>(comickUrl(`/v1.0/search?${p}`))
  const arr = Array.isArray(data) ? data : []
  if (arr.length === 0) return null

  // Pick the closest title match
  const titleLower = title.toLowerCase()
  const match = arr.find(
    (r) => r.title?.toLowerCase() === titleLower || r.slug?.toLowerCase().includes(titleLower.split(' ')[0].toLowerCase()),
  ) ?? arr[0]

  if (!match) return null

  // Quick chapter count from the chapters endpoint (just page 1)
  let chapterCount: number | undefined
  try {
    const slug = match.slug ?? match.hid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cd = await get<any>(comickUrl(`/comic/${slug}/chapters?page=1&limit=1&chap-order=0`))
    // total field if available, otherwise fall back to last_chapter
    chapterCount = cd.total ?? cd.chapters?.length
  } catch {
    chapterCount = match.last_chapter ?? 0
  }

  return {
    slug: match.slug ?? match.hid,
    title: match.title ?? match.name,
    lastChapter: match.last_chapter ?? 0,
    chapterCount,
  }
}

// ─── Consumet search ──────────────────────────────────────────────────────────

async function _consumetSearch(params: SearchParams): Promise<SearchResult> {
  const { query = '', source = 'mangapill', offset = 0, limit = 24 } = params
  const page = Math.floor(offset / limit) + 1
  const qs = new URLSearchParams({ q: query, provider: source, page: String(page) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await consumetFetch<any>(`/search?${qs}`)
  return {
    data: d.data ?? [],
    total: d.hasNextPage ? offset + limit + 1 : offset + (d.data?.length ?? 0),
    source: source as ApiSource,
  }
}

// ─── Worker-backed source search functions ────────────────────────────────────

async function _nhentaiSearch(params: SearchParams): Promise<SearchResult> {
  const { query = '', offset = 0, limit = 24 } = params
  const page = Math.floor(offset / limit) + 1
  const qs = new URLSearchParams({ q: query, page: String(page) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await workerFetch<any>(`/nhentai/search?${qs}`)
  return { data: d.data ?? [], total: d.total ?? 0, source: 'nhentai' }
}

async function _manganatoSearch(params: SearchParams): Promise<SearchResult> {
  const { query = '', offset = 0, limit = 24 } = params
  const page = Math.floor(offset / limit) + 1
  const qs = new URLSearchParams({ q: query, page: String(page) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await workerFetch<any>(`/manganato/search?${qs}`)
  return { data: d.data ?? [], total: d.total ?? 0, source: 'manganato' }
}
