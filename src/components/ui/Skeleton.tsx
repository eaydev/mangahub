import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export default function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={clsx(
        'rounded bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:500px_100%] animate-shimmer',
        className,
      )}
    />
  )
}
