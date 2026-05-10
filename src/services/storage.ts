import type { LibraryEntry, Manga, ReadingProgress, AppSettings } from '../types'

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  library: 'mh_library',
  progress: 'mh_progress',
  settings: 'mh_settings',
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full — ignore
  }
}

// ─── Library ──────────────────────────────────────────────────────────────────

export function getLibrary(): LibraryEntry[] {
  return read<LibraryEntry[]>(KEYS.library, [])
}

export function isInLibrary(mangaId: string): boolean {
  return getLibrary().some((e) => e.mangaId === mangaId)
}

export function addToLibrary(manga: Manga): void {
  const lib = getLibrary().filter((e) => e.mangaId !== manga.id)
  lib.unshift({ mangaId: manga.id, manga, addedAt: Date.now() })
  write(KEYS.library, lib)
}

export function removeFromLibrary(mangaId: string): void {
  const lib = getLibrary().filter((e) => e.mangaId !== mangaId)
  write(KEYS.library, lib)
}

export function toggleLibrary(manga: Manga): boolean {
  if (isInLibrary(manga.id)) {
    removeFromLibrary(manga.id)
    return false
  }
  addToLibrary(manga)
  return true
}

// ─── Reading progress ─────────────────────────────────────────────────────────

export function getAllProgress(): Record<string, ReadingProgress> {
  return read<Record<string, ReadingProgress>>(KEYS.progress, {})
}

export function getProgress(mangaId: string): ReadingProgress | undefined {
  return getAllProgress()[mangaId]
}

export function saveProgress(progress: ReadingProgress): void {
  const all = getAllProgress()
  all[progress.mangaId] = { ...progress, updatedAt: Date.now() }
  write(KEYS.progress, all)
}

export function clearProgress(mangaId: string): void {
  const all = getAllProgress()
  delete all[mangaId]
  write(KEYS.progress, all)
}

export function getRecentlyRead(limit = 10): ReadingProgress[] {
  return Object.values(getAllProgress())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  source: 'mangadex',
  imageQuality: 'high',
  pageFit: 'width',
  includeAdult: false,
  workerUrl: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WORKER_URL ?? '',
  consumetUrl: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_CONSUMET_URL ?? '',
}

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  write(KEYS.settings, { ...getSettings(), ...settings })
}
