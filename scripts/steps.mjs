// Inspect and edit the <EventLoop :steps> list of a slide in slides.md, keeping the
// slide's `clicks:` count and the code block's line-highlight list in step with it.
// slides.md stays the source of truth: this edits it in place.
//
//   node scripts/steps.mjs check                 every EventLoop slide: clicks, highlights, steps agree
//   node scripts/steps.mjs list <slide>          one line per step: click, highlighted lines, caption
//   node scripts/steps.mjs delete <slide> <step> remove a step (and its highlight entry)
//   node scripts/steps.mjs dup <slide> <step>    insert a copy right after it, to edit by hand
//
// <slide> is the number Slidev shows; <step> is the click number (step 0 = click 0).
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../slides.md', import.meta.url)
const src = readFileSync(FILE, 'utf8')

// Slides are separated by lines that are exactly `---`. The headmatter (the deck's
// first frontmatter) also uses two of them; per-slide frontmatter in this deck is
// written as ```yaml blocks, so every other `---` line is a slide break.
function splitSlides(text) {
  const lines = text.split('\n')
  const seps = lines.flatMap((l, i) => (l === '---' ? [i] : []))
  const starts = [seps[0], ...seps.slice(2)] // slide 1 begins at the headmatter
  return starts.map((s, n) => ({
    number: n + 1,
    from: s,
    to: (starts[n + 1] ?? lines.length),
    lines,
  }))
}

function parseSlide(slide) {
  const body = slide.lines.slice(slide.from, slide.to)
  const at = (re) => body.findIndex((l) => re.test(l))
  const elStart = at(/^<EventLoop\b/)
  if (elStart < 0) return null
  const elEnd = body.findIndex((l, i) => i > elStart && /^\]" \/>/.test(l))
  const steps = body.slice(elStart + 1, elEnd)
  const hlLine = body.findIndex((l, i) => i < elStart && /^```\w+ \{.*\}/.test(l))
  const clicksLine = at(/^clicks: \d+$/)
  const hl = hlLine >= 0 ? body[hlLine].match(/\{(.*)\}/)[1].split('|') : null
  return { body, elStart, elEnd, steps, hlLine, hl, clicksLine, clicks: clicksLine >= 0 ? Number(body[clicksLine].slice(8)) : null }
}

const caption = (step) => step.match(/caption: '((?:[^'\\]|\\.)*)'/)?.[1].replace(/\\'/g, "'") ?? ''

function problems(p) {
  const out = []
  if (p.clicks !== p.steps.length - 1) out.push(`clicks: ${p.clicks}, but ${p.steps.length} steps need clicks: ${p.steps.length - 1}`)
  if (p.hl && p.hl.length !== p.steps.length) out.push(`${p.hl.length} highlight entries for ${p.steps.length} steps`)
  p.steps.forEach((s, i) => { if (!/^\s*\{.*\},\s*$/.test(s)) out.push(`step ${i} isn't one { … }, line`) })
  return out
}

function write(slides, slide, p) {
  const { lines } = slide
  const body = [...p.body]
  body.splice(p.elStart + 1, p.elEnd - p.elStart - 1, ...p.steps)
  if (p.hlLine >= 0) body[p.hlLine] = body[p.hlLine].replace(/\{.*\}/, `{${p.hl.join('|')}}`)
  if (p.clicksLine >= 0) body[p.clicksLine] = `clicks: ${p.steps.length - 1}`
  lines.splice(slide.from, slide.to - slide.from, ...body)
  writeFileSync(FILE, lines.join('\n'))
}

const [cmd, slideArg, stepArg] = process.argv.slice(2)
const slides = splitSlides(src)
const pick = () => {
  const slide = slides[Number(slideArg) - 1]
  const p = slide && parseSlide(slide)
  if (!p) { console.error(`slide ${slideArg} has no <EventLoop :steps>`); process.exit(1) }
  return [slide, p]
}
const stepIndex = (p) => {
  const i = Number(stepArg)
  if (!Number.isInteger(i) || i < 0 || i >= p.steps.length) { console.error(`step must be 0–${p.steps.length - 1}`); process.exit(1) }
  return i
}

if (cmd === 'check') {
  let bad = 0
  for (const slide of slides) {
    const p = parseSlide(slide)
    if (!p) continue
    const issues = problems(p)
    bad += issues.length
    console.log(`slide ${slide.number}: ${p.steps.length} steps ${issues.length ? '✗ ' + issues.join('; ') : '✓'}`)
  }
  process.exit(bad ? 1 : 0)
} else if (cmd === 'list') {
  const [, p] = pick()
  p.steps.forEach((s, i) => console.log(String(i).padStart(3), (p.hl?.[i] ?? '').padEnd(5), caption(s)))
} else if (cmd === 'delete' || cmd === 'dup') {
  const [slide, p] = pick()
  const i = stepIndex(p)
  if (cmd === 'delete') {
    p.steps.splice(i, 1); p.hl?.splice(i, 1)
  } else {
    p.steps.splice(i + 1, 0, p.steps[i]); p.hl?.splice(i + 1, 0, p.hl[i])
  }
  write(slides, slide, p)
  console.log(`${cmd === 'delete' ? 'deleted' : 'duplicated'} step ${i}; slide ${slide.number} now has ${p.steps.length} steps (clicks: ${p.steps.length - 1})`)
} else {
  console.error('usage: node scripts/steps.mjs check | list <slide> | delete <slide> <step> | dup <slide> <step>')
  process.exit(1)
}
