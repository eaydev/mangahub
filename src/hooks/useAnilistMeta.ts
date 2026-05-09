import { useQuery } from '@tanstack/react-query'
import { searchAnilist, type AnilistManga } from '../services/anilist'

export function useAnilistMeta(title: string | undefined): {
  data: AnilistManga | null | undefined
  isPending: boolean
} {
  const { data, isPending } = useQuery({
    queryKey: ['anilist', 'meta', title],
    queryFn: () => searchAnilist(title!),
    enabled: Boolean(title),
    staleTime: 24 * 60 * 60 * 1000, // AniList data changes rarely
    retry: 1,
  })
  return { data, isPending }
}
