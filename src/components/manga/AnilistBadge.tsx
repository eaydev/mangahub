import { ExternalLink } from 'lucide-react'
import type { AnilistManga } from '../../services/anilist'

interface AnilistBadgeProps {
  meta: AnilistManga
  compact?: boolean
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400 border-green-700/50 bg-green-900/30'
  if (score >= 65) return 'text-yellow-400 border-yellow-700/50 bg-yellow-900/30'
  return 'text-red-400 border-red-700/50 bg-red-900/30'
}

export default function AnilistBadge({ meta, compact = false }: AnilistBadgeProps) {
  const score = meta.averageScore ?? meta.meanScore

  if (compact) {
    // Inline score pill used on manga cards
    if (!score) return null
    return (
      <span
        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor(score)}`}
        title={`AniList score: ${score}/100`}
      >
        ★ {score}
      </span>
    )
  }

  // Full badge for detail page
  return (
    <div className="flex flex-wrap items-center gap-3">
      {score != null && (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold ${scoreColor(score)}`}>
          <span className="text-base leading-none">★</span>
          <span>{score}<span className="text-xs font-normal opacity-60">/100</span></span>
          <span className="text-xs font-normal opacity-60">AniList</span>
        </div>
      )}
      {meta.popularity != null && (
        <span className="text-xs text-gray-500">
          {meta.popularity.toLocaleString()} tracking
        </span>
      )}
      {meta.favourites != null && (
        <span className="text-xs text-gray-500">
          {meta.favourites.toLocaleString()} ♥
        </span>
      )}
      <a
        href={meta.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
      >
        AniList <ExternalLink size={11} />
      </a>
    </div>
  )
}
