import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, RefreshCw, BookOpen, Clock, FlameKindling } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useMangaList } from '../hooks/useMangaList'
import type { FilterState } from '../types'
import MangaGrid from '../components/manga/MangaGrid'
import FilterPanel from '../components/filters/FilterPanel'
import SourceBadge from '../components/ui/SourceBadge'
import Button from '../components/ui/Button'
import MangaCard from '../components/manga/MangaCard'
import * as storage from '../services/storage'

const DEFAULT_FILTERS: FilterState = {
  query: '',
  status: 'all',
  tags: [],
  year: '',
  sort: 'latest',
}

export default function Browse() {
  const [searchParams] = useSearchParams()
  const { settings } = useApp()
  const loaderRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') ?? '',
  }))

  // Sync URL query param to filter
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setFilters((f) => ({ ...f, query: q }))
  }, [searchParams])

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useMangaList({ ...filters, includeAdult: settings.includeAdult }, settings.source)

  // NHentai search — only when worker is configured, adult mode on, and there's a query
  const {
    data: adultData,
    isPending: adultPending,
  } = useMangaList(
    { ...filters, includeAdult: true, sort: 'latest' },
    'nhentai',
  )

  const allManga = data?.pages.flatMap((p) => p.data) ?? []
  const activeSource = data?.pages[0]?.source ?? settings.source
  const adultManga = settings.includeAdult && settings.workerUrl && filters.query
    ? (adultData?.pages.flatMap((p) => p.data) ?? [])
    : []

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const recentlyRead = storage.getRecentlyRead(6)

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Continue reading section */}
      {recentlyRead.length > 0 && !filters.query && filters.status === 'all' && filters.tags.length === 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            <Clock size={14} /> Continue Reading
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {recentlyRead.map((p) => {
              const lib = storage.getLibrary().find((e) => e.mangaId === p.mangaId)
              if (!lib) return null
              return (
                <div key={p.mangaId} className="w-32 shrink-0">
                  <MangaCard manga={lib.manga} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            <BookOpen size={14} />
            {isPending ? 'Loading…' : `${data?.pages[0]?.total.toLocaleString() ?? 0} titles`}
          </h1>
          <SourceBadge source={activeSource} />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle size={40} className="text-red-400" />
          <div>
            <p className="text-white font-semibold">Failed to load manga</p>
            <p className="text-gray-500 text-sm mt-1">
              {error instanceof Error ? error.message : 'An error occurred. Please try again.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw size={14} /> Try again
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isError && (
        <MangaGrid
          manga={allManga}
          loading={isPending || isFetchingNextPage}
          skeletonCount={isPending ? 24 : 8}
        />
      )}

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="h-4" />

      {/* Empty state */}
      {!isPending && !isError && allManga.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <span className="text-5xl">📚</span>
          <p className="text-white font-semibold">No manga found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
          <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Adult / NHentai results section */}
      {adultManga.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-400/80 uppercase tracking-wider mb-3">
            <FlameKindling size={14} /> Doujinshi / NHentai
            <span className="text-gray-600 font-normal normal-case tracking-normal text-xs">· 18+</span>
          </h2>
          <MangaGrid manga={adultManga} loading={adultPending} skeletonCount={0} />
        </section>
      )}

      {/* No more results */}
      {!isPending && !isError && allManga.length > 0 && !hasNextPage && (
        <p className="text-center text-xs text-gray-600 py-4">
          — All results loaded —
        </p>
      )}
    </main>
  )
}
