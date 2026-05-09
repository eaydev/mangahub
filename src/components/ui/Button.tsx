import React from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-sm',
  secondary:
    'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white',
  ghost:
    'bg-transparent hover:bg-gray-800 active:bg-gray-700 text-gray-300 hover:text-white',
  danger:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white',
  outline:
    'border border-gray-600 hover:border-gray-400 bg-transparent text-gray-300 hover:text-white',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs rounded-md gap-1',
  md: 'h-9 px-4 text-sm rounded-lg gap-1.5',
  lg: 'h-11 px-6 text-base rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-lg',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50 select-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
