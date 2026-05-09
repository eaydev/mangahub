import Skeleton from '../ui/Skeleton'

export default function MangaCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
      <Skeleton className="aspect-[2/3]" />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </div>
    </div>
  )
}
