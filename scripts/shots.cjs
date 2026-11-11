// Screenshot slides from a running dev server.
//
//   npx slidev --port 3950          (in another terminal, or in the background)
//   node scripts/shots.cjs <outDir> <spec>...
//
// A spec is one of:
//   12          slide 12 at click 0
//   12@7        slide 12 at click 7
//   fade:16     slide 16, press → and capture 150ms into the transition
//   fade:16+400 the same, 400ms in (also works mid-click: fade:33@0+400)
//
// Files land in <outDir> as s12.png, s12@7.png, fade-16.png. PORT overrides 3950.
const { chromium } = require('playwright-chromium')

const PORT = process.env.PORT || 3950
const [outDir, ...specs] = process.argv.slice(2)
if (!outDir || !specs.length) {
  console.error('usage: node scripts/shots.cjs <outDir> <slide[@click] | fade:slide>...')
  process.exit(1)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  let first = true
  const open = async (slide, clicks = 0) => {
    await page.goto(`http://localhost:${PORT}/${slide}?clicks=${clicks}`)
    await page.waitForTimeout(first ? 6000 : 2500) // the first load compiles the deck
    first = false
  }
  for (const spec of specs) {
    if (spec.startsWith('fade:')) {
      const [where, ms = '150'] = spec.slice(5).split('+')
      const [slide, clicks] = where.split('@')
      await open(slide, clicks)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(Number(ms))
      await page.screenshot({ path: `${outDir}/fade-${where}+${ms}.png` })
    } else {
      const [slide, clicks] = spec.split('@')
      await open(slide, clicks)
      await page.screenshot({ path: `${outDir}/s${spec}.png` })
    }
    console.log('saved', spec)
  }
  await browser.close()
})()
