import { getMdChapterCount, findOnComick, getWorkerUrl, getConsumetUrl } from './api'
import type { ApiSource } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceEntry = { available: boolean; count: number; slug?: string }

export interface SourceComparison {
  winner: ApiSource
  sources: Partial<Record<ApiSource, SourceEntry>>
  checkedAt: number
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'mh_source_cache_v3'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

interface CacheEntry { result: SourceComparison; cachedAt: number }

function readCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}
function writeCache(c: Record<string, CacheEntry>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* quota */ }
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
// Runs worker + consumet + direct checks ALL in parallel, then picks the
// source with the most chapters as the winner.

export async function compareSourcesForManga(
  mangaId: string,
  mangaTitle: string,
  includeAdult = false,
): Promise<SourceComparison> {
  // Include server config in key — changing URLs automatically invalidates cache
  const configHash = btoa(`${getWorkerUrl()}|${getConsumetUrl()}`).slice(0, 8)
  const cacheKey = `${mangaId}:${includeAdult ? 'a' : 'n'}:${configHash}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const workerUrl = getWorkerUrl()
  const consumetUrl = getConsumetUrl()

  const sources: Partial<Record<ApiSource, SourceEntry>> = {}

  // Run all three checks in parallel — don't let any one block the others
  await Promise.allSettled([

    // ── 1. Worker → MangaDex + Comick + MangaNato counts ──────────────────────
    (async () => {
      if (!workerUrl) return
      const qs = new URLSearchParams({
        title: mangaTitle, mangadexId: mangaId,
        adult: includeAdult ? 'true' : 'false',
      })
      const res = await fetch(`${workerUrl}/compare?${qs}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return
      const d = await res.json() as { counts: Record<string, number>; slugs: Record<string, string> }
      for (const [src, count] of Object.entries(d.counts)) {
        if (count > 0) sources[src as ApiSource] = { available: true, count, slug: d.slugs?.[src] }
      }
    })(),

    // ── 2. Consumet → MangaPill + WeebCentral counts ──────────────────────────
    (async () => {
      if (!consumetUrl) return
      const qs = new URLSearchParams({ title: mangaTitle, providers: 'mangapill,weebcentral' })
      const res = await fetch(`${consumetUrl}/compare?${qs}`, { signal: AbortSignal.timeout(25000) })
      if (!res.ok) return
      const d = await res.json() as { results: Record<string, { chapterCount?: number; available?: boolean; id?: string }> }
      for (const [src, v] of Object.entries(d.results)) {
        if (v.available && (v.chapterCount ?? 0) > 0) {
          sources[src as ApiSource] = { available: true, count: v.chapterCount ?? 0, slug: v.id }
        }
      }
    })(),

    // ── 3. Direct fallback: MangaDex + Comick (if worker not available) ────────
    (async () => {
      if (workerUrl) return // worker already covers these
      const [mdResult, ckResult] = await Promise.allSettled([
        getMdChapterCount(mangaId),
        findOnComick(mangaTitle),
      ])
      if (mdResult.status === 'fulfilled') {
        sources.mangadex = { available: true, count: Math.ceil(mdResult.value / 2.5) }
      }
      const ck = ckResult.status === 'fulfilled' ? ckResult.value : null
      if (ck) sources.comick = { available: true, count: ck.chapterCount ?? ck.lastChapter ?? 0, slug: ck.slug }
    })(),
  ])

  // Pick the source with the highest chapter count
  // MangaDex estimate is inflated (raw feed count / 2.5) so weigh consumet sources equally
  const winner = (Object.entries(sources) as [ApiSource, SourceEntry][])
    .filter(([, v]) => v.available && v.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)[0]?.[0] ?? 'mangadex'

  const result: SourceComparison = { winner, sources, checkedAt: Date.now() }
  setCached(cacheKey, result)
  return result
}
