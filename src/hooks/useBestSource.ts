import { useEffect, useState } from 'react'
import type { Manga, ApiSource } from '../types'
import { compareSourcesForManga, type SourceComparison } from '../services/sourceSelector'
import { useApp } from '../context/AppContext'

export interface BestSourceState {
  comparison: SourceComparison | null
  isChecking: boolean
  activeSource: ApiSource
  setSource: (s: ApiSource) => void
  nhentaiId?: string
}

export function useBestSource(manga: Manga | undefined): BestSourceState {
  const { settings } = useApp()
  const [activeSource, setActiveSource] = useState<ApiSource>(manga?.source ?? 'mangadex')
  const [comparison, setComparison] = useState<SourceComparison | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (!manga) return
    setActiveSource(manga.source)
    setComparison(null)
    setIsChecking(true)
    let cancelled = false

    compareSourcesForManga(manga.id, manga.title, settings.includeAdult)
      .then((result) => {
        if (cancelled) return
        setComparison(result)
        setActiveSource(result.winner)
      })
      .catch(() => { /* best-effort */ })
      .finally(() => { if (!cancelled) setIsChecking(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manga?.id, manga?.title, settings.includeAdult])

  const nhentaiEntry = comparison?.sources?.nhentai
  return {
    comparison,
    isChecking,
    activeSource,
    setSource: setActiveSource,
    nhentaiId: nhentaiEntry?.available ? nhentaiEntry.slug : undefined,
  }
}
