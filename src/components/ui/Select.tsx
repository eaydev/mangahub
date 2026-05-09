import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: Option[]
  className?: string
  placeholder?: string
}

export default function Select({ value, onChange, options, className, placeholder }: SelectProps) {
  return (
    <div className={clsx('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg h-9 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer hover:border-gray-500 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  )
}
