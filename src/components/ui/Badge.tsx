import { clsx } from 'clsx'

type Variant = 'default' | 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'manga' | 'manhwa' | 'manhua' | 'novel' | 'violet' | 'blue' | 'green' | 'yellow' | 'red'

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-700 text-gray-300',
  violet: 'bg-violet-900/60 text-violet-300 border border-violet-700/50',
  blue: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
  green: 'bg-green-900/60 text-green-300 border border-green-700/50',
  yellow: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50',
  red: 'bg-red-900/60 text-red-300 border border-red-700/50',
  ongoing: 'bg-green-900/60 text-green-400 border border-green-700/40',
  completed: 'bg-blue-900/60 text-blue-400 border border-blue-700/40',
  hiatus: 'bg-yellow-900/60 text-yellow-400 border border-yellow-700/40',
  cancelled: 'bg-red-900/60 text-red-400 border border-red-700/40',
  manga: 'bg-violet-900/60 text-violet-300 border border-violet-700/40',
  manhwa: 'bg-sky-900/60 text-sky-300 border border-sky-700/40',
  manhua: 'bg-orange-900/60 text-orange-300 border border-orange-700/40',
  novel: 'bg-teal-900/60 text-teal-300 border border-teal-700/40',
}

interface BadgeProps {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

export default function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium leading-none whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
