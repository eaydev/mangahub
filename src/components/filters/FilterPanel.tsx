import { useState, useEffect } from 'react'
import { Search, X, ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react'
import type { FilterState, SortOption } from '../../types'
import Select from '../ui/Select'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useTags } from '../../hooks/useTags'
import { clsx } from 'clsx'

interface FilterPanelProps {
  filters: FilterState
  onChange: (f: FilterState) => void
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: 'Latest updates' },
  { value: 'popular', label: 'Most popular' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'rating', label: 'Highest rated' },
]

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const { data: allTags = [] } = useTags()

  const visibleTags = tagSearch
    ? allTags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 40)
    : allTags.slice(0, 40)

  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial })
  }

  const reset = () => {
    onChange({ query: '', status: 'all', tags: [], year: '', sort: 'latest' })
    setTagSearch('')
  }

  const toggleTag = (id: string) => {
    const tags = filters.tags.includes(id)
      ? filters.tags.filter((t) => t !== id)
      : [...filters.tags, id]
    update({ tags })
  }

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    filters.tags.length +
    (filters.year ? 1 : 0) +
    (filters.sort !== 'latest' ? 1 : 0)

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
      {/* Always-visible row */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search title…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg h-9 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent hover:border-gray-600 transition-colors"
          />
          {filters.query && (
            <button
              onClick={() => update({ query: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick selects */}
        <Select
          value={filters.status}
          onChange={(v) => update({ status: v })}
          options={STATUS_OPTIONS}
          className="w-36"
        />
        <Select
          value={filters.sort}
          onChange={(v) => update({ sort: v as SortOption })}
          options={SORT_OPTIONS}
          className="w-44"
        />

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'flex items-center gap-1.5',
            activeCount > 0 && 'text-violet-400',
          )}
        >
          <Filter size={13} />
          Filters
          {activeCount > 0 && (
            <span className="bg-violet-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw size={13} />
            Reset
          </Button>
        )}
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 animate-slideDown space-y-4">
          {/* Year */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 w-20 shrink-0">Year</label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) => update({ year: e.target.value })}
              placeholder="e.g. 2020"
              min="1950"
              max={new Date().getFullYear()}
              className="w-28 bg-gray-800 border border-gray-700 rounded-lg h-9 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Tags</label>
              {filters.tags.length > 0 && (
                <button
                  onClick={() => update({ tags: [] })}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear ({filters.tags.length})
                </button>
              )}
            </div>

            {/* Selected tags */}
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {filters.tags.map((id) => {
                  const tag = allTags.find((t) => t.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleTag(id)}
                      className="flex items-center gap-1 bg-violet-600/30 border border-violet-600/50 text-violet-300 text-xs rounded px-2 py-0.5 hover:bg-red-600/30 hover:border-red-600/50 hover:text-red-300 transition-colors"
                    >
                      {tag?.name ?? id}
                      <X size={10} />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Tag search */}
            <input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tags…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg h-8 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
            />

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {visibleTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={clsx(
                    'text-xs rounded px-2 py-0.5 border transition-colors',
                    filters.tags.includes(tag.id)
                      ? 'bg-violet-600/30 border-violet-600/50 text-violet-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300',
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {!expanded && filters.tags.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {filters.tags.map((id) => {
            const tag = allTags.find((t) => t.id === id)
            return (
              <button key={id} onClick={() => toggleTag(id)}>
                <Badge variant="violet" className="cursor-pointer hover:opacity-70 transition-opacity">
                  {tag?.name ?? id} ×
                </Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
