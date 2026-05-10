import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Bookmark, Settings, Search, X, Database, Zap, Shield } from 'lucide-react'
import { clsx } from 'clsx'
import { useApp } from '../../context/AppContext'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import Button from '../ui/Button'
import SourceBadge from '../ui/SourceBadge'

export default function Header() {
  const { settings, updateSettings } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchVal.trim()) return
    navigate(`/?q=${encodeURIComponent(searchVal.trim())}`)
    setSearchOpen(false)
    setSearchVal('')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg hidden sm:block">MangaHub</span>
          </Link>

          {/* Desktop search bar */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex flex-1 max-w-md ml-4"
          >
            <div className="relative w-full">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search manga, manhwa, manhua…"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl h-9 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors hover:border-gray-600"
              />
            </div>
          </form>

          <div className="flex-1 sm:flex-none" />

          <nav className="flex items-center gap-1">
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Search size={18} />
            </button>

            <Link
              to="/library"
              className={clsx(
                'h-9 px-3 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive('/library')
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )}
            >
              <Bookmark size={16} />
              <span className="hidden sm:block">Library</span>
            </Link>

            <button
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-sm p-4 animate-fadeIn sm:hidden">
          <form onSubmit={handleSearch} className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl h-11 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-white bg-gray-800"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings" size="sm">
        <div className="p-5 space-y-5">
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Database size={14} /> API Source
            </label>
            <Select
              value={settings.source}
              onChange={(v) => updateSettings({ source: v as 'mangadex' | 'comick' })}
              options={[
                { value: 'mangadex', label: 'MangaDex (primary)' },
                { value: 'comick', label: 'Comick (fallback)' },
              ]}
              className="w-full"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              MangaDex is the primary source. Comick is used as fallback automatically.
              <br />
              <span className="text-yellow-600">Note: Comick requires a real browser session — it may not work if you've never visited comick.io.</span>
            </p>
          </div>

          {/* Worker URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Zap size={14} className="text-violet-400" /> Worker URL
              {settings.workerUrl && (
                <span className="ml-auto text-[10px] bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded">active</span>
              )}
            </label>
            <input
              type="url"
              value={settings.workerUrl}
              onChange={(e) => updateSettings({ workerUrl: e.target.value.trim() })}
              placeholder="https://mangahub-proxy.your-name.workers.dev"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg h-9 px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Unlocks MangaNato + NHentai sources. Deploy <code className="text-gray-400">worker/</code> to Cloudflare — see README.
            </p>
          </div>

          {/* Consumet URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Zap size={14} className="text-green-400" /> Consumet Server URL
              {settings.consumetUrl && (
                <span className="ml-auto text-[10px] bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded">active</span>
              )}
            </label>
            <input
              type="url"
              value={settings.consumetUrl}
              onChange={(e) => updateSettings({ consumetUrl: e.target.value.trim() })}
              placeholder="https://your-app.up.railway.app"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg h-9 px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Unlocks MangaPill + WeebCentral (300+ chapters for most manga). Deploy <code className="text-gray-400">consumet-server/</code> to Railway.
            </p>
          </div>

          {/* Adult content toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Shield size={14} className="text-red-400" /> Adult content
              </label>
              <p className="text-xs text-gray-500 mt-0.5">Ecchi, hentai, 18+ (MangaDex + NHentai)</p>
            </div>
            <button
              role="switch"
              aria-checked={settings.includeAdult}
              onClick={() => updateSettings({ includeAdult: !settings.includeAdult })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${settings.includeAdult ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${settings.includeAdult ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Image quality */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image Quality (Reader)
            </label>
            <Select
              value={settings.imageQuality}
              onChange={(v) => updateSettings({ imageQuality: v as 'high' | 'data-saver' })}
              options={[
                { value: 'high', label: 'High quality' },
                { value: 'data-saver', label: 'Data saver (smaller files)' },
              ]}
              className="w-full"
            />
          </div>

          {/* Page fit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Page Fit (Reader)
            </label>
            <Select
              value={settings.pageFit}
              onChange={(v) => updateSettings({ pageFit: v as 'width' | 'height' | 'original' })}
              options={[
                { value: 'width', label: 'Fit width' },
                { value: 'height', label: 'Fit height' },
                { value: 'original', label: 'Original size' },
              ]}
              className="w-full"
            />
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center gap-3 flex-wrap">
            <SourceBadge source={settings.source} />
            {settings.workerUrl && (
              <>
                <SourceBadge source="nhentai" />
                <SourceBadge source="manganato" />
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
