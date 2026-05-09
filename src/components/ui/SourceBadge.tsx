import type { ApiSource } from '../../types'
import { clsx } from 'clsx'

const config: Record<ApiSource, { label: string; dot: string }> = {
  mangadex:  { label: 'MangaDex',  dot: 'bg-orange-400' },
  comick:    { label: 'Comick',    dot: 'bg-blue-400' },
  nhentai:   { label: 'NHentai',   dot: 'bg-red-400' },
  manganato: { label: 'MangaNato', dot: 'bg-green-400' },
}

export default function SourceBadge({ source, className }: { source: ApiSource; className?: string }) {
  const { label, dot } = config[source] ?? { label: source, dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium', className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
