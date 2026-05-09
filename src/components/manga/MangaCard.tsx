import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import type { Manga } from '../../types'
import Badge from '../ui/Badge'
import { useApp } from '../../context/AppContext'
import { searchAnilist } from '../../services/anilist'

interface MangaCardProps {
  manga: Manga
}

const COVER_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%231f2937'/%3E%3Ctext x='100' y='145' text-anchor='middle' fill='%236b7280' font-size='40'%3E📖%3C/text%3E%3C/svg%3E"

export default function MangaCard({ manga }: MangaCardProps) {
  const { inLibrary, toggleLibrary, getProgress } = useApp()
  // tryFallback flips to true only after the primary cover fails to load
  const [tryFallback, setTryFallback] = useState(false)
  const [imgError, setImgError] = useState(false)
  const saved = inLibrary(manga.id)
  const progress = getProgress(manga.id)

  // Query AniList reactively — only fires after MangaDex cover fails
  const { data: aniData } = useQuery({
    queryKey: ['anilist', 'cover', manga.title],
    queryFn: () => searchAnilist(manga.title),
    enabled: tryFallback,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const coverSrc = imgError
    ? COVER_FALLBACK
    : tryFallback && aniData?.coverImage?.large
      ? aniData.coverImage.large
      : manga.coverUrl ?? COVER_FALLBACK

  const handleImgError = useCallback(() => {
    if (!tryFallback) {
      setTryFallback(true)   // attempt AniList cover
    } else {
      setImgError(true)      // AniList also failed → SVG fallback
    }
  }, [tryFallback])

  const handleLibrary = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      toggleLibrary(manga)
    },
    [manga, toggleLibrary],
  )

  const STATUS_VARIANTS = new Set(['ongoing', 'completed', 'hiatus', 'cancelled'])
  const TYPE_VARIANTS = new Set(['manga', 'manhwa', 'manhua', 'novel'])

  const statusVariant = manga.status && STATUS_VARIANTS.has(manga.status)
    ? manga.status as 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
    : undefined

  const typeVariant = manga.type && TYPE_VARIANTS.has(manga.type)
    ? manga.type as 'manga' | 'manhwa' | 'manhua' | 'novel'
    : undefined

  return (
    <Link
      to={`/manga/${manga.id}?source=${manga.source}${manga.sourceSlug ? `&slug=${manga.sourceSlug}` : ''}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
    >
      {/* Cover image */}
      <div className="relative overflow-hidden aspect-[2/3] bg-gray-800">
        <img
          src={coverSrc}
          alt={manga.title}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Library button */}
        <button
          onClick={handleLibrary}
          className={clsx(
            'absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100',
            saved
              ? 'bg-violet-600 text-white opacity-100'
              : 'bg-black/60 backdrop-blur text-gray-300 hover:bg-violet-600 hover:text-white',
          )}
          title={saved ? 'Remove from library' : 'Add to library'}
        >
          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>

        {/* Type badge */}
        {typeVariant && (
          <div className="absolute top-2 left-2">
            <Badge variant={typeVariant} className="uppercase text-[10px]">
              {manga.type}
            </Badge>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700">
            <div
              className="h-full bg-violet-500"
              style={{ width: `${(progress.page / Math.max(progress.totalPages, 1)) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-2.5 flex-1">
        <h3 className="text-sm font-medium text-white leading-snug line-clamp-2 min-h-[2.5rem]">
          {manga.title}
        </h3>

        <div className="flex items-center gap-1.5 mt-auto pt-1 flex-wrap">
          {statusVariant && (
            <Badge variant={statusVariant} className="capitalize">
              {manga.status}
            </Badge>
          )}
          {manga.latestChapter && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-500 ml-auto">
              <BookOpen size={11} />
              Ch. {manga.latestChapter}
            </span>
          )}
        </div>

        {/* Continue reading indicator */}
        {progress && (
          <p className="text-[11px] text-violet-400 truncate">
            Continue Ch. {progress.chapterNumber}
          </p>
        )}
      </div>
    </Link>
  )
}
