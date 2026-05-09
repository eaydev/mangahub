import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Settings2,
  BookOpen,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Chapter } from '../../types'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

interface ReaderNavProps {
  mangaId: string
  mangaTitle: string
  sourceParam: string
  currentChapter: Chapter
  chapters: Chapter[]
  visible: boolean
  onChapterChange: (chapterId: string) => void
  onSettingsOpen: () => void
  currentPage: number
  totalPages: number
}

export default function ReaderNav({
  mangaId,
  mangaTitle,
  sourceParam,
  currentChapter,
  chapters,
  visible,
  onChapterChange,
  onSettingsOpen,
  currentPage,
  totalPages,
}: ReaderNavProps) {
  const [chapterListOpen, setChapterListOpen] = useState(false)

  const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-transform duration-300',
          visible ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <div className="bg-gray-950/95 backdrop-blur border-b border-gray-800 px-3 h-14 flex items-center gap-2">
          {/* Back */}
          <Link
            to={`/manga/${mangaId}${sourceParam}`}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>

          {/* Title + chapter */}
          <div className="flex-1 min-w-0 mx-1">
            <p className="text-xs text-gray-500 truncate">{mangaTitle}</p>
            <button
              onClick={() => setChapterListOpen(true)}
              className="flex items-center gap-1 text-sm font-medium text-white hover:text-violet-400 transition-colors"
            >
              <BookOpen size={13} />
              Chapter {currentChapter.number}
              {currentChapter.title && (
                <span className="text-gray-400 hidden sm:inline">
                  — {currentChapter.title}
                </span>
              )}
            </button>
          </div>

          {/* Page counter */}
          {totalPages > 0 && (
            <span className="text-xs text-gray-500 shrink-0 hidden sm:block">
              {currentPage}/{totalPages}
            </span>
          )}

          {/* Prev/next chapter */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!prevChapter}
            onClick={() => prevChapter && onChapterChange(prevChapter.id)}
            title="Previous chapter"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!nextChapter}
            onClick={() => nextChapter && onChapterChange(nextChapter.id)}
            title="Next chapter"
          >
            <ChevronRight size={18} />
          </Button>

          {/* Chapter list */}
          <Button variant="ghost" size="icon" onClick={() => setChapterListOpen(true)} title="Chapter list">
            <List size={16} />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon" onClick={onSettingsOpen} title="Reader settings">
            <Settings2 size={16} />
          </Button>
        </div>

        {/* Progress bar */}
        {totalPages > 0 && (
          <div className="h-0.5 bg-gray-800">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${(currentPage / totalPages) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Chapter list modal */}
      <Modal
        open={chapterListOpen}
        onClose={() => setChapterListOpen(false)}
        title={`Chapters — ${mangaTitle}`}
        size="md"
      >
        <div className="max-h-[65vh] overflow-y-auto">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                onChapterChange(ch.id)
                setChapterListOpen(false)
              }}
              className={clsx(
                'w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0',
                ch.id === currentChapter.id
                  ? 'bg-violet-900/30 text-violet-300'
                  : 'text-gray-300',
              )}
            >
              <span className="font-medium text-sm">
                Ch. {ch.number}
                {ch.title && (
                  <span className="text-gray-500 font-normal ml-1.5">
                    — {ch.title}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {ch.scanlationGroup && <span>{ch.scanlationGroup}</span>}
                <span>
                  {new Date(ch.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
