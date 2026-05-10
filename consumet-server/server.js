const express = require('express')
const cors = require('cors')
const { MANGA } = require('@consumet/extensions')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

// ─── Providers (only confirmed-working ones) ──────────────────────────────────
//   MangaPill   — 300-350+ chapters for most manga, images work, no auth
//   WeebCentral — 300-350+ chapters, images need Referer header (handled below)
//   ComicK      — good for English chapters, fast CDN
//   MangaHere   — large archive but chapter pages time out, search-only useful

const PROVIDER_DEFS = {
  mangapill:    { factory: () => new MANGA.MangaPill(),    imageReferer: null },
  weebcentral:  { factory: () => new MANGA.WeebCentral(),  imageReferer: 'https://weebcentral.com' },
  comick:       { factory: () => new MANGA.ComicK(),       imageReferer: null },
}

const providers = {}
for (const [key, def] of Object.entries(PROVIDER_DEFS)) {
  try {
    providers[key] = { instance: def.factory(), imageReferer: def.imageReferer }
    console.log(`✅  ${key}`)
  } catch (e) {
    console.warn(`⚠️   ${key} failed:`, e.message?.slice(0, 60))
  }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normTitle(t) {
  if (!t) return 'Unknown'
  if (typeof t === 'string') return t
  return t.english ?? t.romaji ?? t.native ?? 'Unknown'
}

function normManga(item, source) {
  return {
    id: item.id,
    title: normTitle(item.title),
    coverUrl: item.image ?? item.cover,
    description: item.description ?? '',
    status: (item.status ?? 'ongoing').toLowerCase().replace(/\s+/g, '_'),
    type: 'manga',
    source,
    sourceSlug: item.id,
    latestChapter: item.latestChapter ?? undefined,
  }
}

function normChapter(ch, source) {
  const raw = normTitle(ch.title ?? ch.id ?? '')
  const num = raw.replace(/^chapter\s*/i, '').trim()
  return {
    id: ch.id,
    number: num || raw || '0',
    title: typeof ch.title === 'string' ? ch.title : undefined,
    volume: ch.volume != null ? String(ch.volume) : undefined,
    language: 'en',
    publishedAt: ch.releaseDate
      ? (typeof ch.releaseDate === 'number'
          ? new Date(ch.releaseDate * 1000).toISOString()
          : String(ch.releaseDate))
      : new Date().toISOString(),
    pages: ch.pages ?? undefined,
    source,
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

function getProvider(name, res) {
  const p = providers[name]
  if (!p) {
    res.status(404).json({
      error: `Unknown provider: ${name}`,
      available: Object.keys(providers),
    })
    return null
  }
  return p
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', providers: Object.keys(providers) })
})

// GET /search?q=blue+lock&provider=mangapill&page=1
app.get('/search', async (req, res) => {
  const { q = '', provider = 'mangapill', page = '1' } = req.query
  const p = getProvider(provider, res)
  if (!p) return

  try {
    const result = await p.instance.search(q, Number(page))
    res.json({
      data: (result.results ?? []).map(m => normManga(m, provider)),
      hasNextPage: result.hasNextPage ?? false,
      currentPage: Number(page),
      source: provider,
    })
  } catch (e) {
    console.error(`[search:${provider}]`, e.message)
    res.status(500).json({ error: e.message, provider })
  }
})

// GET /manga/mangapill/580/blue-lock
app.get('/manga/:provider/*', async (req, res) => {
  const { provider } = req.params
  const id = req.params[0]
  const p = getProvider(provider, res)
  if (!p) return

  try {
    const info = await p.instance.fetchMangaInfo(id)
    res.json({
      ...normManga(info, provider),
      chapters: (info.chapters ?? []).map(ch => normChapter(ch, provider)),
      authors: info.authors ?? [],
      genres: info.genres ?? [],
    })
  } catch (e) {
    console.error(`[manga:${provider}/${id}]`, e.message)
    res.status(500).json({ error: e.message, provider, id })
  }
})

// GET /pages/mangapill/580-10345000/blue-lock-chapter-345
// Returns pages array + imageReferer if the CDN needs a Referer header
app.get('/pages/:provider/*', async (req, res) => {
  const { provider } = req.params
  const chapterId = req.params[0]
  const p = getProvider(provider, res)
  if (!p) return

  try {
    const pages = await p.instance.fetchChapterPages(chapterId)
    res.json({
      chapterId,
      source: provider,
      // imageReferer: set when CDN requires a Referer header to serve images
      imageReferer: p.imageReferer,
      pages: (pages ?? []).map(pg => ({
        url: pg.img ?? pg.url,
        page: pg.page ?? 0,
      })),
    })
  } catch (e) {
    console.error(`[pages:${provider}/${chapterId}]`, e.message)
    res.status(500).json({ error: e.message, provider, chapterId })
  }
})

// GET /compare?title=blue+lock
// Checks all providers in parallel, returns winner by chapter count
app.get('/compare', async (req, res) => {
  const { title = '' } = req.query
  const results = {}

  await Promise.allSettled(
    Object.entries(providers).map(async ([name, p]) => {
      try {
        const search = await p.instance.search(title, 1)
        const first = search.results?.[0]
        if (!first) { results[name] = { available: false, chapterCount: 0 }; return }

        const info = await p.instance.fetchMangaInfo(first.id)
        results[name] = {
          id: first.id,
          title: normTitle(first.title),
          chapterCount: info.chapters?.length ?? 0,
          available: true,
          imageReferer: p.imageReferer,
        }
      } catch (e) {
        results[name] = { available: false, chapterCount: 0, error: e.message }
      }
    })
  )

  const winner = Object.entries(results)
    .filter(([, v]) => v.available && (v.chapterCount ?? 0) > 0)
    .sort(([, a], [, b]) => (b.chapterCount ?? 0) - (a.chapterCount ?? 0))[0]?.[0] ?? null

  res.json({ winner, results })
})

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`\n🚀 MangaHub Consumet server :${PORT}`)
  console.log(`   Providers: ${Object.keys(providers).join(', ')}\n`)
})
