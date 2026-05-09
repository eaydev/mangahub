import { useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookmarkCheck,
  Bookmark,
  BookOpen,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Play,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useMangaDetail } from '../hooks/useMangaDetail'
import { useChapterList } from '../hooks/useChapterList'
import { useBestSource } from '../hooks/useBestSource'
import { useAnilistMeta } from '../hooks/useAnilistMeta'
import { useApp } from '../context/AppContext'
import type { ApiSource } from '../types'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import SourceComparisonBanner from '../components/manga/SourceComparison'
import AnilistBadge from '../components/manga/AnilistBadge'

const COVER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='560' viewBox='0 0 400 560'%3E%3Crect width='400' height='560' fill='%231f2937'/%3E%3Ctext x='200' y='290' text-anchor='middle' fill='%236b7280' font-size='80'%3E📖%3C/text%3E%3C/svg%3E"


export default function MangaDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Initial source from URL (may be overridden by auto-selector below)
  const urlSource = (searchParams.get('source') ?? 'mangadex') as ApiSource

  const { inLibrary, toggleLibrary, getProgress } = useApp()

  // Load the manga metadata from the URL-specified source
  const { data: manga, isPending, isError, refetch } = useMangaDetail(id!, urlSource)

  // Auto-source comparison runs in the background once manga metadata loads
  const { comparison, isChecking, activeSource, setSource } = useBestSource(manga)

  // AniList enrichment — runs in background, best-effort
  const { data: anilistMeta } = useAnilistMeta(manga?.title)

  // Chapter list always uses the active (potentially auto-switched) source
  const chaptersMangaId =
    activeSource === 'comick'
      ? (comparison?.comick.slug ?? manga?.sourceSlug ?? id!)
      : id!

  const { data: chapters = [], isPending: chapLoading } = useChapterList(
    chaptersMangaId,
    activeSource,
  )

  const [descExpanded, setDescExpanded] = useState(false)
  const [chapSortDesc, setChapSortDesc] = useState(true)
  const [imgError, setImgError] = useState(false)

  const progress = id ? getProgress(id) : undefined
  const saved = id ? inLibrary(id) : false

  const sortedChapters = chapSortDesc ? [...chapters].reverse() : chapters

  // Source params to embed in nav links
  const sourceParam =
    activeSource === 'comick' && comparison?.comick.slug
      ? `?source=comick&slug=${comparison.comick.slug}`
      : `?source=${activeSource}${manga?.sourceSlug ? `&slug=${manga.sourceSlug}` : ''}`

  const handleToggleLibrary = () => {
    if (manga) toggleLibrary(manga)
  }

  const startReading = () => {
    if (!chapters.length) return
    const target = progress
      ? chapters.find((c) => c.id === progress.chapterId) ?? chapters[0]
      : chapters[0]
    navigate(`/manga/${id}/chapter/${target.id}${sourceParam}`)
  }

  if (isPending) return <MangaDetailSkeleton />

  if (isError || !manga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-white font-semibold">Failed to load manga</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw size={14} /> Retry
        </Button>
      </div>
    )
  }

  // Prefer AniList's extraLarge cover when available — it's higher resolution
  const coverSrc = imgError
    ? COVER_FALLBACK
    : (anilistMeta?.coverImage?.extraLarge ?? manga.coverUrl ?? COVER_FALLBACK)

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* Hero / cover area */}
      <div className="relative">
        {/* Blurred background */}
        <div
          className="absolute inset-0 h-80 bg-center bg-cover"
          style={{ backgroundImage: `url(${coverSrc})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/50 via-gray-950/80 to-gray-950" />
        </div>

        <div className="relative z-10 px-4 pt-5 pb-0">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Cover */}
            <div className="shrink-0 mx-auto sm:mx-0">
              <img
                src={coverSrc}
                alt={manga.title}
                onError={() => setImgError(true)}
                className="w-40 sm:w-48 rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 min-w-0 pb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {manga.title}
              </h1>

              {manga.alternativeTitles && manga.alternativeTitles.length > 0 && (
                <p className="text-sm text-gray-500 truncate">
                  Alt: {manga.alternativeTitles.join(' / ')}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2">
                {manga.type && (
                  <Badge
                    variant={
                      ['manga', 'manhwa', 'manhua', 'novel'].includes(manga.type)
                        ? (manga.type as 'manga' | 'manhwa' | 'manhua' | 'novel')
                        : 'default'
                    }
                    className="capitalize"
                  >
                    {manga.type}
                  </Badge>
                )}
                {manga.status && (
                  <Badge
                    variant={
                      ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(manga.status)
                        ? (manga.status as 'ongoing' | 'completed' | 'hiatus' | 'cancelled')
                        : 'default'
                    }
                    className="capitalize"
                  >
                    {manga.status}
                  </Badge>
                )}
                {manga.contentRating && manga.contentRating !== 'safe' && (
                  <Badge variant="red" className="uppercase text-[10px]">
                    {manga.contentRating}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-400">
                {manga.authors && manga.authors.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <User size={13} />
                    {manga.authors.map((a) => a.name).join(', ')}
                  </span>
                )}
                {manga.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} /> {manga.year}
                  </span>
                )}
                {chapters.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} />
                    {chapLoading ? '…' : chapters.length} chapters
                  </span>
                )}
              </div>

              {/* AniList rating */}
              {anilistMeta && <AnilistBadge meta={anilistMeta} />}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-1">
                <Button
                  variant="primary"
                  disabled={chapLoading || chapters.length === 0}
                  onClick={startReading}
                >
                  <Play size={15} />
                  {progress ? `Continue Ch. ${progress.chapterNumber}` : 'Start Reading'}
                </Button>
                <Button variant="outline" onClick={handleToggleLibrary}>
                  {saved ? (
                    <><BookmarkCheck size={15} /> In Library</>
                  ) : (
                    <><Bookmark size={15} /> Add to Library</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content below hero */}
      <div className="px-4 py-6 space-y-6">
        {/* Source comparison banner — auto-source selection */}
        <SourceComparisonBanner
          comparison={comparison}
          isChecking={isChecking}
          activeSource={activeSource}
          onSetSource={(s) => setSource(s)}
        />

        {/* Description — prefer manga source, fall back to AniList */}
        {(manga.description || anilistMeta?.description) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Synopsis</h2>
            <div className="relative">
              <p
                className={clsx(
                  'text-sm text-gray-300 leading-relaxed whitespace-pre-line',
                  !descExpanded && 'line-clamp-4',
                )}
              >
                {manga.description || anilistMeta?.description?.replace(/<[^>]+>/g, '') || ''}
              </p>
              {(manga.description || anilistMeta?.description || '').length > 300 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-1 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-0.5"
                >
                  {descExpanded ? (
                    <><ChevronUp size={12} /> Show less</>
                  ) : (
                    <><ChevronDown size={12} /> Read more</>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Tags */}
        {manga.tags && manga.tags.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {manga.tags.map((tag) => (
                <Badge key={tag.id} variant="default">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Chapter list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Chapters {chapters.length > 0 && `(${chapters.length})`}
              </h2>
            </div>
            <button
              onClick={() => setChapSortDesc(!chapSortDesc)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {chapSortDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              {chapSortDesc ? 'Newest first' : 'Oldest first'}
            </button>
          </div>

          {chapLoading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}

          {!chapLoading && chapters.length === 0 && (
            <p className="text-gray-500 text-sm py-6 text-center">
              No chapters available.
              {activeSource === 'mangadex' && comparison?.comick.available && (
                <button
                  onClick={() => setSource('comick')}
                  className="ml-2 text-violet-400 hover:text-violet-300 underline"
                >
                  Try Comick instead
                </button>
              )}
            </p>
          )}

          <div className="divide-y divide-gray-800 rounded-xl overflow-hidden border border-gray-800">
            {sortedChapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/manga/${id}/chapter/${ch.id}${sourceParam}`}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/60 transition-colors border-b border-gray-800 last:border-0',
                  progress?.chapterId === ch.id
                    ? 'bg-violet-900/20 border-l-2 border-l-violet-500 pl-3.5'
                    : 'bg-gray-900',
                )}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium text-white whitespace-nowrap">
                    Ch. {ch.number}
                  </span>
                  {ch.title && (
                    <span className="text-sm text-gray-500 truncate hidden sm:inline">
                      {ch.title}
                    </span>
                  )}
                  {progress?.chapterId === ch.id && (
                    <span className="text-xs text-violet-400 whitespace-nowrap">● Current</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                  {ch.scanlationGroup && (
                    <span className="hidden sm:block truncate max-w-[120px]">{ch.scanlationGroup}</span>
                  )}
                  <span className="whitespace-nowrap">
                    {new Date(ch.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MangaDetailSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-5">
      <Skeleton className="h-4 w-16 mb-6" />
      <div className="flex gap-6">
        <Skeleton className="w-48 h-64 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
