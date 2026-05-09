# MangaHub Proxy Worker

Cloudflare Worker that unlocks two additional manga sources:

| Source | What it adds |
|---|---|
| **MangaNato** (chapmanganato.to) | Huge scanlation library, often has chapters missing from MangaDex |
| **NHentai** | Doujinshi / adult content (only shown when Adult toggle is ON) |

It also proxies Comick to bypass CloudFlare's browser-only JS challenge.

## Deploy in 2 minutes

```bash
# 1. Install Wrangler CLI
npm i -g wrangler

# 2. Log in to Cloudflare (opens browser)
wrangler login

# 3. Deploy from this directory
cd worker
npm install
npm run deploy
```

Wrangler will print your worker URL:
```
https://mangahub-proxy.YOUR-NAME.workers.dev
```

Paste that URL into the app → Settings ⚙️ → Worker URL field.

## Local dev

```bash
npm run dev   # starts on http://localhost:8787
```

Test it:
```
curl http://localhost:8787/
# → {"status":"ok","sources":["mangadex","comick","nhentai","manganato"]}

curl "http://localhost:8787/nhentai/search?q=naruto&page=1"
curl "http://localhost:8787/manganato/search?q=blue+lock"
curl "http://localhost:8787/compare?title=Blue+Lock&mangadexId=4141c5dc-c525-4df5-afd7-cc7d192a832f&adult=false"
```

## How source auto-selection works

When you open any manga detail page, the app calls `/compare` on the worker.
The worker queries MangaDex, Comick, MangaNato, and (if adult mode on) NHentai **in parallel**.
It returns chapter counts and the winning source. The app silently switches to the best source — no user interaction needed.

## Cloudflare free tier limits

- 100,000 requests/day
- 10ms CPU per invocation

This is plenty for personal use. Upgrade to Workers Paid ($5/mo) for 10M requests/day.
