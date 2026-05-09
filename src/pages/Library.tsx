import { Link } from 'react-router-dom'
import { BookmarkX, BookOpen, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import MangaCard from '../components/manga/MangaCard'
import Button from '../components/ui/Button'
import * as storage from '../services/storage'

export default function Library() {
  const { library } = useApp()
  const recentlyRead = storage.getRecentlyRead(10)

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-10">
      {/* Recently read */}
      {recentlyRead.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-violet-400" />
              Continue Reading
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recentlyRead.map((p) => {
              const entry = library.find((e) => e.mangaId === p.mangaId)
              if (!entry) return null
              return <MangaCard key={p.mangaId} manga={entry.manga} />
            })}
          </div>
        </section>
      )}

      {/* Library */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookmarkX size={18} className="text-violet-400" />
            My Library
            {library.length > 0 && (
              <span className="text-sm font-normal text-gray-500">({library.length})</span>
            )}
          </h2>
          <Link to="/" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Browse <ArrowRight size={13} />
          </Link>
        </div>

        {library.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-6xl">📚</span>
            <div>
              <p className="text-white font-semibold text-lg">Your library is empty</p>
              <p className="text-gray-500 text-sm mt-1">
                Browse manga and tap the bookmark icon to add titles here
              </p>
            </div>
            <Link to="/">
              <Button variant="primary">
                <BookOpen size={15} /> Browse Manga
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {library.map((entry) => (
              <MangaCard key={entry.mangaId} manga={entry.manga} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
