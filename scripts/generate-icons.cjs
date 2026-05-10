#!/usr/bin/env node
// Generates pwa-192x192.png and pwa-512x512.png from public/favicon.svg
// Runs as part of the Netlify build via "prebuild" in package.json

const fs = require('fs')
const path = require('path')

const SVG_PATH = path.join(__dirname, '../public/favicon.svg')
const OUT_DIR  = path.join(__dirname, '../public')

async function run() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error('favicon.svg not found — skipping icon generation')
    return
  }

  const svgBuffer = fs.readFileSync(SVG_PATH)

  try {
    const sharp = require('sharp')
    for (const size of [192, 512]) {
      const out = path.join(OUT_DIR, `pwa-${size}x${size}.png`)
      await sharp(svgBuffer).resize(size, size).png().toFile(out)
      console.log(`✅  Generated ${out}`)
    }
  } catch (e) {
    console.warn('sharp unavailable, trying @resvg/resvg-js …', e.message?.slice(0, 60))
    try {
      const { Resvg } = require('@resvg/resvg-js')
      for (const size of [192, 512]) {
        const resvg = new Resvg(svgBuffer, { fitTo: { mode: 'width', value: size } })
        const png = resvg.render().asPng()
        const out = path.join(OUT_DIR, `pwa-${size}x${size}.png`)
        fs.writeFileSync(out, png)
        console.log(`✅  Generated ${out}`)
      }
    } catch (e2) {
      console.warn('Both renderers failed — skipping icon generation. PWA install prompt may not appear.')
      console.warn(e2.message)
    }
  }
}

run()
