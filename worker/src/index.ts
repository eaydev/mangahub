import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }))

// ─── Shared types (mirrored from app) ────────────────────────────────────────

interface WManga {
  id: string; title: string; coverUrl?: string; status?: string; type?: string
  description?: string; tags?: { id: string; name: string }[]
  authors?: { id: string; name: string }[]; year?: number
  latestChapter?: string; source: string; sourceSlug?: string; isAdult?: boolean
}
interface WChapter {
  id: string; number: string; title?: string; language: string
  publishedAt: string; pages?: number; scanlationGroup?: string; source: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json', ...init.headers },
    signal: AbortSignal.timeout(12000),
  })
}

function isJsonResponse(r: Response) {
  return (r.headers.get('content-type') ?? '').includes('json')
}

// ─── MangaDex proxy ───────────────────────────────────────────────────────────
// Passthrough — adds CORS, allows injecting auth headers in future

app.get('/mangadex/*', async (c) => {
  const path = c.req.path.replace('/mangadex', '')
  const qs = new URL(c.req.url).searchParams.toString()
  const url = `https://api.mangadex.org${path}${qs ? '?' + qs : ''}`
  const r = await safeFetch(url)
  if (!isJsonResponse(r)) return c.json({ error: 'upstream error' }, 502)
  return c.json(await r.json(), r.status as 200)
})

// Comick proxy removed — Cloudflare blocks CF-Worker → Comick requests (CF-to-CF bot detection).
// The browser calls api.comick.io directly; its real-browser fingerprint passes the challenge.

// ─── NHentai ─────────────────────────────────────────────────────────────────
// nhentai.net has a JSON API. Worker requests bypass the browser-only CF challenge.

const NH = 'https://nhentai.net'
const NH_IMG = 'https://i.nhentai.net'
const NH_THUMB = 'https://t.nhentai.net'

function nhExt(t: string) { return t === 'p' ? 'png' : t === 'g' ? 'gif' : 'jpg' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNhGallery(g: any): WManga {
  const title = g.title?.english || g.title?.pretty || g.title?.japanese || 'Unknown'
  const allTags = (g.tags ?? []) as any[]
  const tags = allTags.filter((t: any) => t.type === 'tag').map((t: any) => ({ id: String(t.id), name: t.name }))
  const artists = allTags.filter((t: any) => t.type === 'artist').map((t: any) => ({ id: String(t.id), name: t.name }))
  const covExt = nhExt(g.images?.cover?.t ?? 'j')
  return {
    id: String(g.id),
    title,
    coverUrl: `${NH_THUMB}/galleries/${g.media_id}/cover.${covExt}`,
    description: `${g.num_pages ?? '?'} pages`,
    status: 'completed',
    type: 'doujinshi',
    tags,
    authors: artists,
    year: g.upload_date ? new Date(g.upload_date * 1000).getFullYear() : undefined,
    latestChapter: '1',
    source: 'nhentai',
    isAdult: true,
  }
}

app.get('/nhentai/search', async (c) => {
  const q = c.req.query('q') ?? ''
  const page = c.req.query('page') ?? '1'
  const r = await safeFetch(`${NH}/api/galleries/search?query=${encodeURIComponent(q)}&page=${page}`, {
    headers: { 'Referer': NH, Accept: 'application/json' },
  })
  if (!isJsonResponse(r)) return c.json({ data: [], total: 0, source: 'nhentai' })
  const d = await r.json() as any
  return c.json({ data: (d.result ?? []).map(parseNhGallery), total: (d.num_pages ?? 1) * 25, source: 'nhentai' })
})

app.get('/nhentai/manga/:id', async (c) => {
  const r = await safeFetch(`${NH}/api/gallery/${c.req.param('id')}`, {
    headers: { 'Referer': NH, Accept: 'application/json' },
  })
  if (!isJsonResponse(r)) return c.json({ error: 'not found' }, 404)
  return c.json(parseNhGallery(await r.json()))
})

app.get('/nhentai/chapters/:id', async (c) => {
  const r = await safeFetch(`${NH}/api/gallery/${c.req.param('id')}`, {
    headers: { 'Referer': NH, Accept: 'application/json' },
  })
  if (!isJsonResponse(r)) return c.json([])
  const g = await r.json() as any
  const chapter: WChapter = {
    id: String(g.id),
    number: '1',
    title: g.title?.english ?? g.title?.pretty ?? undefined,
    language: 'en',
    publishedAt: g.upload_date ? new Date(g.upload_date * 1000).toISOString() : new Date().toISOString(),
    pages: g.num_pages,
    source: 'nhentai',
  }
  return c.json([chapter])
})

app.get('/nhentai/pages/:id', async (c) => {
  const r = await safeFetch(`${NH}/api/gallery/${c.req.param('id')}`, {
    headers: { 'Referer': NH, Accept: 'application/json' },
  })
  if (!isJsonResponse(r)) return c.json({ chapterId: c.req.param('id'), pages: [], source: 'nhentai' })
  const g = await r.json() as any
  const mediaId = g.media_id
  const pages: string[] = (g.images?.pages ?? []).map((p: any, i: number) =>
    `${NH_IMG}/galleries/${mediaId}/${i + 1}.${nhExt(p.t ?? 'j')}`
  )
  return c.json({ chapterId: c.req.param('id'), pages, source: 'nhentai' })
})

// ─── MangaNato ────────────────────────────────────────────────────────────────
// chapmanganato.to — large scanlation library. HTML scraped via CF HTMLRewriter.

const MN_BASE = 'https://chapmanganato.to'
const MN_HEADERS = {
  'User-Agent': BROWSER_UA,
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': MN_BASE,
}

// HTMLRewriter helpers — collect element attributes and text

class AttrCollector {
  results: Array<Record<string, string>> = []
  private cur: Record<string, string> = {}
  private attrs: string[]
  constructor(...attrs: string[]) { this.attrs = attrs }
  element(el: Element) {
    this.cur = {}
    this.attrs.forEach(a => { const v = el.getAttribute(a); if (v) this.cur[a] = v })
    this.results.push(this.cur)
  }
  text(t: Text) {
    const last = this.results[this.results.length - 1]
    if (last) last._text = ((last._text ?? '') + t.text).replace(/\s+/g, ' ').trim()
  }
}

async function htmlRewrite(response: Response, selector: string, attrs: string[]): Promise<Array<Record<string, string>>> {
  const col = new AttrCollector(...attrs)
  await new HTMLRewriter().on(selector, col).transform(response).arrayBuffer()
  return col.results
}

app.get('/manganato/search', async (c) => {
  const q = encodeURIComponent((c.req.query('q') ?? '').replace(/\s+/g, '_').toLowerCase())
  const page = c.req.query('page') ?? '1'
  const r = await safeFetch(`${MN_BASE}/search/story/${q}?page=${page}`, { headers: MN_HEADERS })
  if (!r.ok) return c.json({ data: [], total: 0, source: 'manganato' })

  // Collect <a> tags inside .story_item — first a is the manga link, img is the cover
  const links = await htmlRewrite(r.clone(), '.story_item a', ['href'])
  const imgs = await htmlRewrite(r.clone(), '.story_item img', ['src', 'alt'])
  const chapters = await htmlRewrite(r.clone(), '.story_item .story_item_right em a', ['href'])

  const manga: WManga[] = []
  for (let i = 0; i < imgs.length; i++) {
    const link = links[i * 2] ?? links[i] // first link per item
    const img = imgs[i]
    if (!link?.href) continue
    const id = link.href.replace(`${MN_BASE}/`, '').replace(/\/$/, '')
    manga.push({
      id,
      title: img.alt ?? link._text ?? 'Unknown',
      coverUrl: img.src,
      status: 'ongoing',
      type: 'manga',
      latestChapter: chapters[i]?._text?.replace(/chapter/i, '').trim(),
      source: 'manganato',
      sourceSlug: link.href,
    })
  }

  return c.json({ data: manga, total: manga.length >= 24 ? 9999 : manga.length, source: 'manganato' })
})

app.get('/manganato/manga/:id', async (c) => {
  const slug = c.req.query('slug') ?? `${MN_BASE}/${c.req.param('id')}`
  const r = await safeFetch(slug, { headers: MN_HEADERS })
  if (!r.ok) return c.json({ error: 'not found' }, 404)

  const [titleEl, imgEl, descEl, statusEl] = await Promise.all([
    htmlRewrite(r.clone(), 'div.story-info-right h1', []),
    htmlRewrite(r.clone(), 'span.info-image img', ['src']),
    htmlRewrite(r.clone(), 'div#panel-story-info-description', []),
    htmlRewrite(r.clone(), '.variations-tableInfo td.table-value', []),
  ])

  const id = c.req.param('id')
  const manga: WManga = {
    id,
    title: titleEl[0]?._text ?? 'Unknown',
    coverUrl: imgEl[0]?.src,
    description: descEl[0]?._text?.replace(/^Description\s*:?\s*/i, ''),
    status: statusEl[1]?._text?.toLowerCase() as any ?? 'ongoing',
    type: 'manga',
    source: 'manganato',
    sourceSlug: slug,
  }
  return c.json(manga)
})

app.get('/manganato/chapters/:id', async (c) => {
  const slug = c.req.query('slug') ?? `${MN_BASE}/${c.req.param('id')}`
  const r = await safeFetch(slug, { headers: MN_HEADERS })
  if (!r.ok) return c.json([])

  const chapterLinks = await htmlRewrite(r, 'ul.row-content-chapter li.a-h a.chapter-name', ['href'])
  const chapters: WChapter[] = chapterLinks
    .filter(l => l.href)
    .map(l => {
      // href: https://chapmanganato.to/manga-xxx/chapter-123.5
      const parts = l.href.split('/')
      const chPath = parts.slice(-2).join('/') // manga-xxx/chapter-123.5
      const numMatch = l.href.match(/chapter-([0-9.]+)/i)
      return {
        id: chPath,
        number: numMatch?.[1] ?? l._text?.replace(/chapter/i, '').trim() ?? '0',
        title: undefined,
        language: 'en',
        publishedAt: new Date().toISOString(),
        source: 'manganato',
      } satisfies WChapter
    })
    .reverse() // ascending order

  return c.json(chapters)
})

app.get('/manganato/pages/:id', async (c) => {
  const { id } = c.req.param()
  const slug = c.req.query('slug') ?? `${MN_BASE}/${id}`
  const r = await safeFetch(slug, { headers: { ...MN_HEADERS, Referer: `${MN_BASE}/` } })
  if (!r.ok) return c.json({ chapterId: id, pages: [], source: 'manganato' })

  const imgs = await htmlRewrite(r, 'div.container-chapter-reader img', ['src', 'data-src'])
  const pages = imgs
    .map(i => i['data-src'] ?? i.src)
    .filter(Boolean)
    .filter(url => url.startsWith('http') && !url.includes('thumb'))

  return c.json({ chapterId: id, pages, source: 'manganato' })
})

// ─── Source comparison ────────────────────────────────────────────────────────
// Queries all available sources in parallel and returns the winner + counts.
// This is called from the browser app background on every manga detail page.

app.get('/compare', async (c) => {
  const title = c.req.query('title') ?? ''
  const mangadexId = c.req.query('mangadexId') ?? ''
  const adult = c.req.query('adult') === 'true'

  const counts: Record<string, number> = {}
  const slugs: Record<string, string> = {}

  await Promise.allSettled([
    // MangaDex: quick total via feed?limit=1
    (async () => {
      if (!mangadexId) return
      const p = new URLSearchParams({ limit: '1', offset: '0' })
      ;['safe', 'suggestive', 'erotica', ...(adult ? ['pornographic'] : [])].forEach(cr => p.append('contentRating[]', cr))
      const r = await safeFetch(`https://api.mangadex.org/manga/${mangadexId}/feed?${p}`)
      if (!isJsonResponse(r)) return
      const d = await r.json() as any
      counts.mangadex = Math.ceil((d.total ?? 0) / 2.5)
    })(),

    // Comick: skipped in worker — CF blocks CF-to-CF requests.
    // The browser calls Comick directly with its own fingerprint.
    // (async () => { ... })(),

    // MangaNato: check chapter count from search
    (async () => {
      const q = encodeURIComponent(title.replace(/\s+/g, '_').toLowerCase())
      const r = await safeFetch(`${MN_BASE}/search/story/${q}?page=1`, { headers: MN_HEADERS })
      if (!r.ok) return
      const links = await htmlRewrite(r, '.story_item a', ['href'])
      if (!links[0]?.href) return
      const mangaId = links[0].href.replace(`${MN_BASE}/`, '').replace(/\/$/, '')
      slugs.manganato = links[0].href
      // Get chapter count from detail page
      const mr = await safeFetch(links[0].href, { headers: MN_HEADERS })
      if (!mr.ok) return
      const chs = await htmlRewrite(mr, 'ul.row-content-chapter li.a-h a.chapter-name', ['href'])
      counts.manganato = chs.length
    })(),

    // NHentai: only for adult searches
    ...(adult ? [(async () => {
      const r = await safeFetch(`${NH}/api/galleries/search?query=${encodeURIComponent(title)}&page=1`, {
        headers: { Referer: NH, Accept: 'application/json' },
      })
      if (!isJsonResponse(r)) return
      const d = await r.json() as any
      if ((d.result ?? []).length > 0) {
        counts.nhentai = d.result.length
        slugs.nhentai = String(d.result[0].id)
      }
    })()] : []),
  ])

  // Winner = reading source with most unique chapters
  // NHentai is a supplementary adult-only source, not in the chapter-count race
  const readingSources = Object.entries(counts)
    .filter(([s]) => s !== 'nhentai')
    .sort(([, a], [, b]) => b - a)

  const winner = readingSources[0]?.[0] ?? 'mangadex'
  const hasAdultSource = adult && (counts.nhentai ?? 0) > 0

  return c.json({ winner, counts, slugs, hasAdultSource })
})

// ─── Generic image proxy (for CDNs that need a Referer header) ───────────────
// Used for WeebCentral and other consumet providers whose CDNs hotlink-protect.

app.get('/proxy-img', async (c) => {
  const encodedUrl = c.req.query('url')
  const referer = c.req.query('referer') ?? ''
  if (!encodedUrl) return c.text('missing url', 400)

  const imageUrl = decodeURIComponent(encodedUrl)
  const r = await safeFetch(imageUrl, {
    headers: { ...(referer ? { Referer: referer } : {}), Accept: 'image/*' },
  })
  if (!r.ok) return c.text('upstream error', r.status as 400)

  return new Response(r.body, {
    headers: {
      'Content-Type': r.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

// ─── Chapter image proxy ──────────────────────────────────────────────────────
// MangaDex's at-home CDN assigns nodes based on the requesting IP.
// The worker makes the /at-home/server request, so images must also be fetched
// through the worker to match the IP. Without this, at-home nodes return 404.

app.get('/md-img', async (c) => {
  const encodedUrl = c.req.query('url')
  if (!encodedUrl) return c.text('missing url', 400)

  const imageUrl = decodeURIComponent(encodedUrl)
  // Only allow MangaDex image CDN URLs to prevent open-proxy abuse
  if (!imageUrl.includes('mangadex.network') && !imageUrl.includes('mangadex.org')) {
    return c.text('forbidden origin', 403)
  }

  const r = await safeFetch(imageUrl, {
    headers: { Referer: 'https://mangadex.org', Accept: 'image/*' },
  })

  if (!r.ok) return c.text('upstream error', r.status as 400)

  return new Response(r.body, {
    headers: {
      'Content-Type': r.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (c) => c.json({ status: 'ok', sources: ['mangadex', 'comick', 'nhentai', 'manganato'] }))

export default app
