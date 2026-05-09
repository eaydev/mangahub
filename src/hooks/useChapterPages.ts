import { useQuery } from '@tanstack/react-query'
import { getChapterPages } from '../services/api'
import type { ApiSource, ImageQuality } from '../types'

export function useChapterPages(
  chapterId: string,
  source: ApiSource = 'mangadex',
  quality: ImageQuality = 'high',
) {
  return useQuery({
    queryKey: ['chapter', 'pages', chapterId, source, quality],
    queryFn: () => getChapterPages(chapterId, source, quality),
    enabled: Boolean(chapterId),
    staleTime: 60 * 60 * 1000, // chapter pages rarely change
  })
}
