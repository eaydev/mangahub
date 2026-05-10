import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useChapterPages } from '../hooks/useChapterPages'
import { useChapterList } from '../hooks/useChapterList'
import { useMangaDetail } from '../hooks/useMangaDetail'
import { useApp } from '../context/AppContext'
import type { ApiSource } from '../types'
import ReaderNav from '../components/reader/ReaderNav'
import PageImage from '../components/reader/PageImage'
import SettingsPanel from '../components/reader/SettingsPanel'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'

export default function Reader() {
  // '*' splat captures the full chapter ID including any slashes (e.g. MangaPill: "580-10001000/blue-lock-chapter-1")
  const { id: mangaId, '*': chapterId } = useParams<{ id: string; '*': string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const source = (searchParams.get('source') ?? 'mangadex') as ApiSource
  const slug = searchParams.get('slug') ?? mangaId!

  const { settings, updateSettings, saveProgress } = useApp()

  const [navVisible, setNavVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const lastScrollY = useRef(0)
  const navTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Metadata (title, cover) ALWAYS comes from MangaDex — it's the canonical source.
  // The MangaDex UUID is always in the URL path regardless of which source serves chapters.
  const consumetSources = new Set(['mangapill', 'weebcentral'])
  const sourceId = (source === 'comick' || consumetSources.has(source)) ? slug : mangaId!

  const { data: manga } = useMangaDetail(mangaId!, 'mangadex')
  const { data: chapters = [] } = useChapterList(sourceId, source)
  const {
    data: chapterPages,
    isPending,
    isError,
    refetch,
  } = useChapterPages(chapterId!, source, settings.imageQuality)

  const currentChapter = chapters.find((c) => c.id === chapterId)
  const pages = chapterPages?.pages ?? []
  const sourceParam = `?source=${source}${slug !== mangaId ? `&slug=${encodeURIComponent(slug)}` : ''}`

  // Auto-hide nav on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const diff = y - lastScrollY.current
      if (diff > 5 && y > 100) {
        setNavVisible(false)
      } else if (diff < -5) {
        setNavVisible(true)
        clearTimeout(navTimeout.current)
      }
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Show nav when mouse near top
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setNavVisible(true)
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ci = chapters.findIndex((c) => c.id === chapterId)
      if (e.key === 'ArrowLeft' && ci > 0) {
        navigate(`/manga/${mangaId}/chapter/${chapters[ci - 1].id}${sourceParam}`)
      } else if (e.key === 'ArrowRight' && ci < chapters.length - 1) {
        navigate(`/manga/${mangaId}/chapter/${chapters[ci + 1].id}${sourceParam}`)
      } else if (e.key === 'Escape') {
        navigate(`/manga/${mangaId}${sourceParam}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapters, chapterId, mangaId, navigate, sourceParam])

  // Save reading progress
  useEffect(() => {
    if (!mangaId || !chapterId || !currentChapter || pages.length === 0) return
    saveProgress({
      mangaId,
      mangaTitle: manga?.title ?? 'Unknown',
      mangaCover: manga?.coverUrl,
      chapterId,
      chapterNumber: currentChapter.number,
      page: currentPage,
      totalPages: pages.length,
      updatedAt: Date.now(),
    })
  }, [mangaId, chapterId, currentChapter, pages.length, currentPage, manga, saveProgress])

  const handlePageVisible = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleChapterChange = (newChapterId: string) => {
    window.scrollTo({ top: 0 })
    navigate(`/manga/${mangaId}/chapter/${newChapterId}${sourceParam}`)
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-white font-semibold">Failed to load chapter</p>
        <p className="text-sm text-gray-500">The chapter images could not be fetched.</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw size={14} /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation bar */}
      {currentChapter && (
        <ReaderNav
          mangaId={mangaId!}
          mangaTitle={manga?.title ?? 'Loading…'}
          sourceParam={sourceParam}
          currentChapter={currentChapter}
          chapters={chapters}
          visible={navVisible}
          onChapterChange={handleChapterChange}
          onSettingsOpen={() => setSettingsOpen(true)}
          currentPage={currentPage}
          totalPages={pages.length}
        />
      )}

      {/* Reading area */}
      <div
        className="pt-14 max-w-5xl mx-auto"
        onClick={() => setNavVisible((v) => !v)}
      >
        {isPending ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-[60vh]" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {pages.map((src, i) => (
              <PageImage
                key={src}
                src={src}
                pageNumber={i + 1}
                fit={settings.pageFit}
                onVisible={handlePageVisible}
              />
            ))}
          </div>
        )}

        {/* Chapter end navigation */}
        {!isPending && pages.length > 0 && chapters.length > 0 && (
          <ChapterEndNav
            mangaId={mangaId!}
            chapterId={chapterId!}
            chapters={chapters}
            sourceParam={sourceParam}
            navigate={navigate}
          />
        )}
      </div>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </div>
  )
}

function ChapterEndNav({
  mangaId,
  chapterId,
  chapters,
  sourceParam,
  navigate,
}: {
  mangaId: string
  chapterId: string
  chapters: { id: string; number: string }[]
  sourceParam: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const ci = chapters.findIndex((c) => c.id === chapterId)
  const prev = ci > 0 ? chapters[ci - 1] : null
  const next = ci < chapters.length - 1 ? chapters[ci + 1] : null

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-4">
      <p className="text-gray-500 text-sm">— End of Chapter {chapters[ci]?.number ?? ''} —</p>
      <div className="flex gap-3">
        {prev && (
          <Button
            variant="outline"
            onClick={() => {
              window.scrollTo({ top: 0 })
              navigate(`/manga/${mangaId}/chapter/${prev.id}${sourceParam}`)
            }}
          >
            ← Ch. {prev.number}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate(`/manga/${mangaId}${sourceParam}`)}
        >
          Back to manga
        </Button>
        {next && (
          <Button
            variant="primary"
            onClick={() => {
              window.scrollTo({ top: 0 })
              navigate(`/manga/${mangaId}/chapter/${next.id}${sourceParam}`)
            }}
          >
            Ch. {next.number} →
          </Button>
        )}
      </div>
    </div>
  )
}
