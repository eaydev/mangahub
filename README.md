# MangaHub

A production-ready Progressive Web App for reading manga, manhwa, and manhua — fully client-side, no backend required.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

| Tool | Purpose |
|---|---|
| Vite 5 + React 18 + TypeScript | Core framework |
| Tailwind CSS 3 | Styling (dark manga theme) |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Data fetching + caching |
| vite-plugin-pwa + Workbox | PWA / offline support |
| localStorage | Library, progress, settings persistence |

## Features

- **Browse** — infinite-scroll catalogue with search, status/tag/year filters, sort options
- **Manga Detail** — cover, synopsis, tags, full chapter list with asc/desc sort
- **Reader** — vertical scroll, auto-hide nav, keyboard shortcuts, per-chapter progress saved automatically
- **Library** — bookmarked titles + continue-reading section
- **PWA** — installable on desktop & mobile, caches API responses and images offline

## API Sources

### Primary — MangaDex (`https://api.mangadex.org`)
- Full CORS support, no API key required
- Rich metadata: tags, authors, cover art, scanlation groups
- At-home CDN for chapter images (high-quality + data-saver modes)

### Fallback — Comick (`https://api.comick.io`)
- Used automatically when MangaDex is unreachable or rate-limited
- Covers manga, manhwa, and manhua
- Switchable manually in Settings ⚙️

The active source is always shown as a small badge in the UI.

> **Note:** Please respect MangaDex's [usage policy](https://api.mangadex.org/docs/). Do not use this app commercially or remove attribution. MangaDex must be credited.

## PWA Icons

The app needs `public/pwa-192x192.png` and `public/pwa-512x512.png` for full PWA installability.  
Generate them from the SVG favicon:

```bash
# Using sharp (install once: npm i -D sharp)
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/favicon.svg');
sharp(svg).resize(192).png().toFile('public/pwa-192x192.png', () => console.log('192 done'));
sharp(svg).resize(512).png().toFile('public/pwa-512x512.png', () => console.log('512 done'));
"
```

## Reader Keyboard Shortcuts

| Key | Action |
|---|---|
| `←` | Previous chapter |
| `→` | Next chapter |
| `Esc` | Back to manga detail |

## Project Structure

```
src/
├── components/
│   ├── filters/      FilterPanel (search, status, tags, year, sort)
│   ├── layout/       Header (logo, search, library link, settings)
│   ├── manga/        MangaCard, MangaGrid, MangaCardSkeleton
│   ├── reader/       ReaderNav, PageImage, SettingsPanel
│   └── ui/           Button, Badge, Skeleton, Modal, Select, SourceBadge
├── context/          AppContext (library, progress, settings)
├── hooks/            useMangaList, useMangaDetail, useChapterList, useChapterPages, useTags
├── pages/            Browse, MangaDetail, Reader, Library
├── services/
│   ├── api.ts        MangaDex + Comick integration with fallback logic
│   └── storage.ts    localStorage helpers for library / progress / settings
└── types/            Shared TypeScript types
```
