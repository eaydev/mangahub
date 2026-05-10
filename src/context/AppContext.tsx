import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { AppSettings, LibraryEntry, Manga, ReadingProgress } from '../types'
import * as storage from '../services/storage'
import { setWorkerUrl, setConsumetUrl } from '../services/api'

interface AppContextValue {
  settings: AppSettings
  updateSettings: (s: Partial<AppSettings>) => void

  library: LibraryEntry[]
  inLibrary: (id: string) => boolean
  toggleLibrary: (manga: Manga) => void

  progress: Record<string, ReadingProgress>
  saveProgress: (p: ReadingProgress) => void
  getProgress: (mangaId: string) => ReadingProgress | undefined
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings)
  const [library, setLibrary] = useState<LibraryEntry[]>(storage.getLibrary)
  const [progress, setProgress] = useState<Record<string, ReadingProgress>>(
    storage.getAllProgress,
  )

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    storage.saveSettings(s)
    const next = storage.getSettings()
    setSettings(next)
    setWorkerUrl(next.workerUrl)
    setConsumetUrl(next.consumetUrl)
  }, [])

  // Keep API service in sync with persisted worker URL on mount
  useEffect(() => {
    setWorkerUrl(settings.workerUrl)
    setConsumetUrl(settings.consumetUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inLibrary = useCallback(
    (id: string) => library.some((e) => e.mangaId === id),
    [library],
  )

  const toggleLibrary = useCallback((manga: Manga) => {
    storage.toggleLibrary(manga)
    setLibrary(storage.getLibrary())
  }, [])

  const saveProgress = useCallback((p: ReadingProgress) => {
    storage.saveProgress(p)
    setProgress(storage.getAllProgress())
  }, [])

  const getProgress = useCallback(
    (mangaId: string) => progress[mangaId],
    [progress],
  )

  // Sync settings to <html> for any future light-mode support
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        library,
        inLibrary,
        toggleLibrary,
        progress,
        saveProgress,
        getProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
