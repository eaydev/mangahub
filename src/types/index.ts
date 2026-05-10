export type ApiSource = 'mangadex' | 'comick' | 'nhentai' | 'manganato' | 'mangapill' | 'weebcentral'
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
export type MangaType = 'manga' | 'manhwa' | 'manhua' | 'novel' | 'oneshot' | 'doujinshi'
export type SortOption = 'latest' | 'popular' | 'title' | 'rating'
export type ImageQuality = 'high' | 'data-saver'
export type PageFit = 'width' | 'height' | 'original'

export interface Tag {
  id: string
  name: string
}

export interface Author {
  id: string
  name: string
}

export interface Manga {
  id: string
  title: string
  alternativeTitles?: string[]
  description?: string
  coverUrl?: string
  status?: MangaStatus
  type?: MangaType
  contentRating?: string
  publicationDemographic?: string
  tags?: Tag[]
  authors?: Author[]
  artists?: Author[]
  year?: number
  latestChapter?: string
  source: ApiSource
  sourceSlug?: string
  isAdult?: boolean
}

export interface Chapter {
  id: string
  number: string
  title?: string
  volume?: string
  language: string
  publishedAt: string
  pages?: number
  scanlationGroup?: string
  source: ApiSource
}

export interface ChapterPages {
  chapterId: string
  pages: string[]
  source: ApiSource
}

export interface SearchParams {
  query?: string
  status?: string
  tags?: string[]
  year?: number
  sort?: SortOption
  limit?: number
  offset?: number
  source?: ApiSource
  includeAdult?: boolean
}

export interface SearchResult {
  data: Manga[]
  total: number
  source: ApiSource
}

export interface ReadingProgress {
  mangaId: string
  mangaTitle: string
  mangaCover?: string
  chapterId: string
  chapterNumber: string
  page: number
  totalPages: number
  updatedAt: number
}

export interface LibraryEntry {
  mangaId: string
  manga: Manga
  addedAt: number
}

export interface AppSettings {
  source: ApiSource
  imageQuality: ImageQuality
  pageFit: PageFit
  includeAdult: boolean
  workerUrl: string
  consumetUrl: string
}

export interface FilterState {
  query: string
  status: string
  tags: string[]
  year: string
  sort: SortOption
}
