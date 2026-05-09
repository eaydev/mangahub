import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MangaHub',
        short_name: 'MangaHub',
        description: 'Read manga online — free, fast, offline-capable',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // API calls go through the Cloudflare Worker (set via VITE_WORKER_URL).
        // Images are fetched directly as <img src=...> which doesn't need CORS headers.
        // TanStack Query handles API response caching in memory — no SW caching needed.
        runtimeCaching: [
          {
            urlPattern: /\/md-img\?url=/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'worker-chapter-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/uploads\.mangadex\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mangadex-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/meo\.comick\.pictures\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'comick-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/s4\.anilist\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'anilist-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
