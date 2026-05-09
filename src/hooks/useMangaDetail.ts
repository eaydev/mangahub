import { useQuery } from '@tanstack/react-query'
import { getMangaById } from '../services/api'
import type { ApiSource } from '../types'

export function useMangaDetail(id: string, source: ApiSource = 'mangadex') {
  return useQuery({
    queryKey: ['manga', 'detail', id, source],
    queryFn: () => getMangaById(id, source),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
  })
}
