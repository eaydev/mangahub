import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Header from './components/layout/Header'
import Browse from './pages/Browse'
import MangaDetail from './pages/MangaDetail'
import Reader from './pages/Reader'
import Library from './pages/Library'

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <Routes>
          {/* Reader gets its own full-screen layout with no shared header */}
          <Route
            path="/manga/:id/chapter/:chapterId"
            element={<Reader />}
          />
          {/* All other pages share the header */}
          <Route
            path="*"
            element={
              <>
                <Header />
                <Routes>
                  <Route path="/" element={<Browse />} />
                  <Route path="/manga/:id" element={<MangaDetail />} />
                  <Route path="/library" element={<Library />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
    </AppProvider>
  )
}
