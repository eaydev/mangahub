import { useQuery } from '@tanstack/react-query'
import { getTags } from '../services/api'

export function useTags() {
  return useQuery({
    queryKey: ['manga', 'tags'],
    queryFn: getTags,
    staleTime: Infinity, // tags don't change
  })
}
