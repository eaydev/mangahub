const { MANGA } = require('@consumet/extensions')

async function deepTest(name, query = 'blue lock') {
  console.log(`\n=== ${name} ===`)
  try {
    const p = new MANGA[name]()

    // Search
    const search = await Promise.race([p.search(query, 1), timeout(8000)])
    const first = search.results?.[0]
    console.log(`Search: ${search.results?.length} results`)
    if (!first) { console.log('No results'); return }
    console.log(`First: id="${first.id}" title="${JSON.stringify(first.title).slice(0,50)}"`)

    // Manga info
    const info = await Promise.race([p.fetchMangaInfo(first.id), timeout(8000)])
    console.log(`Chapters: ${info.chapters?.length ?? 0}`)
    const ch = info.chapters?.[0]
    if (!ch) { console.log('No chapters'); return }
    console.log(`First chapter id: "${ch.id}"`)

    // Pages
    const pages = await Promise.race([p.fetchChapterPages(ch.id), timeout(8000)])
    console.log(`Pages: ${pages?.length ?? 0}`)
    if (pages?.[0]) console.log(`First image: ${pages[0].img?.slice(0,70)}`)
    if (pages?.[0]?.headerForImage) console.log(`Headers needed:`, pages[0].headerForImage)

  } catch(e) { console.log(`Error: ${e.message?.slice(0,80)}`) }
}

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
}

;(async () => {
  for (const name of ['MangaHere', 'MangaPill', 'WeebCentral', 'ComicK']) {
    await deepTest(name)
  }
})()
