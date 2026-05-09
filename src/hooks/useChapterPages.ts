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
    staleTime: 5 * 60 * 1000,  // at-home URLs expire in ~15 min, refresh at 5 min
    gcTime: 10 * 60 * 1000,
  })
}
