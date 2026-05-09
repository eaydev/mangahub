import { getMdChapterCount, findOnComick, getWorkerUrl } from './api'
import type { ApiSource } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SourceComparison {
  winner: ApiSource
  mangadex: { available: boolean; count: number }
  comick: { available: boolean; count: number; slug?: string }
  manganato?: { available: boolean; count: number; slug?: string }
  nhentai?: { available: boolean; count: number; id?: string }
  checkedAt: number
}

// ─── Cache in localStorage ────────────────────────────────────────────────────

const CACHE_KEY = 'mh_source_cache'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

interface CacheEntry { result: SourceComparison; cachedAt: number }

function readCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}
function writeCache(cache: Record<string, CacheEntry>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* quota */ }
}
function getCached(key: string): SourceComparison | null {
  const e = readCache()[key]
  if (!e || Date.now() - e.cachedAt > CACHE_TTL_MS) return null
  return e.result
}
function setCached(key: string, result: SourceComparison) {
  const c = readCache()
  c[key] = { result, cachedAt: Date.now() }
  writeCache(c)
}

// ─── Core comparison ──────────────────────────────────────────────────────────

export async function compareSourcesForManga(
  mangaId: string,
  mangaTitle: string,
  includeAdult = false,
): Promise<SourceComparison> {
  const cacheKey = `${mangaId}:${includeAdult ? 'a' : 'n'}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const workerUrl = getWorkerUrl()

  // ── Path A: worker available → use the /compare endpoint (parallel, server-side) ──
  if (workerUrl) {
    try {
      const qs = new URLSearchParams({
        title: mangaTitle,
        mangadexId: mangaId,
        adult: includeAdult ? 'true' : 'false',
      })
      const res = await fetch(`${workerUrl}/compare?${qs}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const d = await res.json() as {
          winner: string
          counts: Record<string, number>
          slugs: Record<string, string>
          hasAdultSource: boolean
        }

        const result: SourceComparison = {
          winner: d.winner as ApiSource,
          mangadex: { available: (d.counts.mangadex ?? 0) > 0, count: d.counts.mangadex ?? 0 },
          comick: { available: (d.counts.comick ?? 0) > 0, count: d.counts.comick ?? 0, slug: d.slugs.comick },
          manganato: d.counts.manganato != null
            ? { available: d.counts.manganato > 0, count: d.counts.manganato, slug: d.slugs.manganato }
            : undefined,
          nhentai: d.counts.nhentai != null
            ? { available: d.counts.nhentai > 0, count: d.counts.nhentai, id: d.slugs.nhentai }
            : undefined,
          checkedAt: Date.now(),
        }
        setCached(cacheKey, result)
        return result
      }
    } catch { /* fall through to direct checks */ }
  }

  // ── Path B: no worker → direct checks (MangaDex + Comick only) ───────────────
  const [mdResult, ckResult] = await Promise.allSettled([
    getMdChapterCount(mangaId),
    findOnComick(mangaTitle),
  ])

  const mdCount = mdResult.status === 'fulfilled' ? mdResult.value : 0
  const mdAvailable = mdResult.status === 'fulfilled'
  const ck = ckResult.status === 'fulfilled' ? ckResult.value : null
  const ckCount = ck?.chapterCount ?? ck?.lastChapter ?? 0
  const ckAvailable = ck !== null

  const mdEstimate = Math.ceil(mdCount / 2.5)
  const winner: ApiSource = ckAvailable && ckCount >= mdEstimate * 1.4 ? 'comick' : 'mangadex'

  const result: SourceComparison = {
    winner,
    mangadex: { available: mdAvailable, count: mdEstimate },
    comick: { available: ckAvailable, count: ckCount, slug: ck?.slug },
    checkedAt: Date.now(),
  }
  setCached(cacheKey, result)
  return result
}
