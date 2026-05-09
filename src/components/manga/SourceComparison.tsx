import { useState } from 'react'
import { X, Zap, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import type { ApiSource } from '../../types'
import type { SourceComparison } from '../../services/sourceSelector'

interface SourceComparisonProps {
  comparison: SourceComparison | null
  isChecking: boolean
  activeSource: ApiSource
  onSetSource: (s: ApiSource) => void
}

export default function SourceComparisonBanner({
  comparison,
  isChecking,
  activeSource,
  onSetSource,
}: SourceComparisonProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // While checking, show a subtle spinner
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
        <RefreshCw size={11} className="animate-spin" />
        Checking sources for best chapter coverage…
      </div>
    )
  }

  if (!comparison) return null

  const { mangadex: md, comick: ck } = comparison
  const mdCount = md.count
  const ckCount = ck.count

  const betterSource: ApiSource = comparison.winner
  const worseSource: ApiSource = betterSource === 'mangadex' ? 'comick' : 'mangadex'
  const betterCount = betterSource === 'mangadex' ? mdCount : ckCount
  const worseCount = worseSource === 'mangadex' ? mdCount : ckCount

  const sourceLabel = (s: ApiSource) => s === 'mangadex' ? 'MangaDex' : 'Comick'
  const sourceColor = (s: ApiSource) => s === 'mangadex'
    ? 'text-orange-400 bg-orange-900/30 border-orange-700/40'
    : 'text-blue-400 bg-blue-900/30 border-blue-700/40'

  // Nothing interesting to show if both have the same count or only one is available
  const diff = betterCount - worseCount
  const showBanner = diff > 0 && md.available

  if (!showBanner) return null

  return (
    <div className="relative flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm animate-fadeIn">
      <Zap size={14} className="text-violet-400 shrink-0" />

      {/* Source pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          ['mangadex', mdCount] as const,
          ['comick', ckCount] as const,
        ]).map(([src, count]) => (
          <button
            key={src}
            onClick={() => onSetSource(src)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
              activeSource === src
                ? sourceColor(src) + ' ring-1 ring-current/40 scale-105'
                : 'text-gray-500 bg-gray-800 border-gray-700 hover:border-gray-500',
              !ck.available && src === 'comick' && 'opacity-40 cursor-not-allowed',
            )}
            disabled={!ck.available && src === 'comick'}
            title={!ck.available && src === 'comick' ? 'Comick not available (CloudFlare)' : undefined}
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 rounded-full',
                src === 'mangadex' ? 'bg-orange-400' : 'bg-blue-400',
              )}
            />
            {sourceLabel(src)}
            <span className={clsx('font-bold', activeSource === src ? '' : 'text-gray-400')}>
              ~{count} ch
            </span>
            {activeSource === src && (
              <span className="text-[10px] opacity-70">✓ active</span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation */}
      <p className="text-xs text-gray-500 flex-1 min-w-0">
        {activeSource === betterSource ? (
          <>Using <strong className="text-gray-300">{sourceLabel(betterSource)}</strong> — {betterCount} chapters ({diff} more than {sourceLabel(worseSource)})</>
        ) : (
          <><strong className="text-yellow-400">{sourceLabel(betterSource)}</strong> has {diff} more chapters — click to switch</>
        )}
      </p>

      <button
        onClick={() => setDismissed(true)}
        className="ml-auto text-gray-600 hover:text-gray-400 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  )
}
