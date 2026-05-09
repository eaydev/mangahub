import { useQuery } from '@tanstack/react-query'
import { getChapterList } from '../services/api'
import type { ApiSource } from '../types'

export function useChapterList(mangaId: string, source: ApiSource = 'mangadex') {
  return useQuery({
    queryKey: ['manga', 'chapters', mangaId, source],
    queryFn: () => getChapterList(mangaId, source),
    enabled: Boolean(mangaId),
    staleTime: 10 * 60 * 1000,
  })
}
