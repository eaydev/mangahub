import type { Manga } from '../../types'
import MangaCard from './MangaCard'
import MangaCardSkeleton from './MangaCardSkeleton'

interface MangaGridProps {
  manga: Manga[]
  loading?: boolean
  skeletonCount?: number
}

export default function MangaGrid({ manga, loading, skeletonCount = 24 }: MangaGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {manga.map((m) => (
        <MangaCard key={m.id} manga={m} />
      ))}
      {loading &&
        Array.from({ length: skeletonCount }).map((_, i) => (
          <MangaCardSkeleton key={`sk-${i}`} />
        ))}
    </div>
  )
}
