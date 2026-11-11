// Step through an EventLoop slide and print, after each click: where the eyes look,
// which box every token is in, and the caption (flagging captions that wrap).
//
//   npx slidev --port 3950          (in another terminal, or in the background)
//   node scripts/trace.cjs <slide> [fromClick] [toClick]
//
// Clicks are pressed one at a time (→), so this also catches motion that only goes
// wrong when stepping, not when jumping straight to ?clicks=N. PORT overrides 3950.
const { chromium } = require('playwright-chromium')

const PORT = process.env.PORT || 3950
const [slide, fromArg = '0', toArg] = process.argv.slice(2)
if (!slide) {
  console.error('usage: node scripts/trace.cjs <slide> [fromClick] [toClick]')
  process.exit(1)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const from = Number(fromArg)
  await page.goto(`http://localhost:${PORT}/${slide}?clicks=${from}`)
  await page.waitForTimeout(6000)

  // Slidev keeps neighbouring slides mounted, so everything is scoped to this slide
  const probe = () => page.evaluate((slide) => {
    const root = document.querySelector(`.slidev-page-${slide}`)
    if (!root?.querySelector('.runtime')) return null
    const boxes = {}
    for (const k of ['stack', 'micro', 'tasks', 'apis', 'worker']) {
      const el = root.querySelector(`.panel.${k}`)
      if (el) boxes[k] = el.getBoundingClientRect()
    }
    const boxOf = (r) => {
      const x = r.x + r.width / 2, y = r.y + r.height / 2
      for (const [k, b] of Object.entries(boxes)) if (x >= b.x && x <= b.right && y >= b.y && y <= b.bottom) return k
      return '?'
    }
    const tokens = [...root.querySelectorAll('.token')]
      .filter(t => +getComputedStyle(t).opacity > 0.5)
      .map(t => `${t.textContent.trim()}→${boxOf(t.getBoundingClientRect())}`)
    // The pupils point at the box they're looking at: straight up = stack,
    // up-right = microtask queue, flatter right = task queue
    const pupil = root.querySelector('.pupil')
    const m = pupil && getComputedStyle(pupil).transform.match(/matrix\(([^)]*)\)/)
    const [px, py] = m ? m[1].split(',').slice(4).map(Number) : [0, 0]
    const eyes = !pupil ? '-' : Math.abs(px) < 1 && Math.abs(py) < 1 ? 'center' : Math.abs(px) < 1 ? 'stack' : py <= -3 ? 'micro' : 'tasks'
    const cap = root.querySelector('.caption')
    const wraps = cap && cap.getBoundingClientRect().height > 40
    return `eyes→${eyes.padEnd(6)} | ${tokens.join(', ') || '—'} | "${cap?.textContent.trim() ?? ''}"${wraps ? '  ⚠ WRAPS' : ''}`
  }, slide)

  const last = toArg === undefined ? Infinity : Number(toArg)
  for (let c = from; c <= last; c++) {
    if (c > from) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(2000)
      // Past the last click, → goes to the next slide: stop there
      if (new URL(page.url()).pathname !== `/${slide}`) break
    }
    const line = await probe()
    if (line === null) break // moved past the slide
    console.log(String(c).padStart(3), line)
  }
  await browser.close()
})()
