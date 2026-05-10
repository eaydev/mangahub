import { useState } from 'react'
import { X, Zap, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import type { ApiSource } from '../../types'
import type { SourceComparison } from '../../services/sourceSelector'

interface Props {
  comparison: SourceComparison | null
  isChecking: boolean
  activeSource: ApiSource
  onSetSource: (s: ApiSource) => void
}

const SOURCE_LABELS: Partial<Record<ApiSource, string>> = {
  mangadex:    'MangaDex',
  comick:      'Comick',
  manganato:   'MangaNato',
  nhentai:     'NHentai',
  mangapill:   'MangaPill',
  weebcentral: 'WeebCentral',
}

const SOURCE_DOT: Partial<Record<ApiSource, string>> = {
  mangadex:    'bg-orange-400',
  comick:      'bg-blue-400',
  manganato:   'bg-green-400',
  nhentai:     'bg-red-400',
  mangapill:   'bg-purple-400',
  weebcentral: 'bg-cyan-400',
}

export default function SourceComparisonBanner({ comparison, isChecking, activeSource, onSetSource }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
        <RefreshCw size={11} className="animate-spin" />
        Checking all sources for best chapter coverage…
      </div>
    )
  }

  if (!comparison) return null

  // Collect all sources that have data, sorted by chapter count desc
  const entries = (Object.entries(comparison.sources) as [ApiSource, { count: number; available: boolean }][])
    .filter(([, v]) => v.available && v.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)

  if (entries.length === 0) return null

  const [topSource, topData] = entries[0]
  const activeData = comparison.sources[activeSource]
  const diff = topData.count - (activeData?.count ?? 0)
  const usingBest = activeSource === topSource

  return (
    <div className="relative flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm animate-fadeIn">
      <Zap size={14} className="text-violet-400 shrink-0" />

      {/* Source pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {entries.map(([src, data]) => (
          <button
            key={src}
            onClick={() => onSetSource(src)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
              activeSource === src
                ? 'ring-1 ring-current/40 scale-105 text-white bg-gray-700 border-gray-500'
                : 'text-gray-500 bg-gray-800 border-gray-700 hover:border-gray-500 hover:text-gray-300',
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', SOURCE_DOT[src] ?? 'bg-gray-400')} />
            {SOURCE_LABELS[src] ?? src}
            <span className={clsx('font-bold', activeSource === src ? 'text-violet-300' : 'text-gray-400')}>
              ~{data.count} ch
            </span>
            {activeSource === src && <span className="text-[10px] opacity-60">✓</span>}
          </button>
        ))}
      </div>

      {/* Status text */}
      <p className="text-xs text-gray-500 flex-1 min-w-0">
        {usingBest
          ? <><strong className="text-gray-300">{SOURCE_LABELS[activeSource]}</strong> has the most chapters</>
          : <><strong className="text-yellow-400">{SOURCE_LABELS[topSource]}</strong> has {diff} more chapters — click to switch</>
        }
      </p>

      <button onClick={() => setDismissed(true)} className="ml-auto text-gray-600 hover:text-gray-400">
        <X size={13} />
      </button>
    </div>
  )
}
