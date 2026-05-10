import { useInfiniteQuery } from '@tanstack/react-query'
import { searchManga, getWorkerUrl, getConsumetUrl } from '../services/api'
import type { FilterState, ApiSource, SearchParams } from '../types'

const LIMIT = 24

export function useMangaList(
  filters: FilterState & Pick<SearchParams, 'includeAdult'>,
  source: ApiSource,
) {
  const workerOnly = source === 'nhentai' || source === 'manganato'
  const consumetOnly = source === 'mangapill' || source === 'weebcentral'
  const workerReady = Boolean(getWorkerUrl())
  const consumetReady = Boolean(getConsumetUrl())
  const enabled = workerOnly ? workerReady : consumetOnly ? consumetReady : true

  return useInfiniteQuery({
    queryKey: ['manga', 'list', filters, source],
    queryFn: ({ pageParam }) =>
      searchManga({
        query: filters.query || undefined,
        status: filters.status,
        tags: filters.tags.length ? filters.tags : undefined,
        year: filters.year ? Number(filters.year) : undefined,
        sort: filters.sort,
        limit: LIMIT,
        offset: pageParam as number,
        source,
        includeAdult: filters.includeAdult,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.reduce((n, p) => n + p.data.length, 0)
      return fetched < lastPage.total ? fetched : undefined
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
