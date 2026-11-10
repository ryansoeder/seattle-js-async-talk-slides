# Slides Spec — Slidev Deck for the Async Scheduling Talk

Build a Slidev deck that runs alongside a live demo. The demo app lives in a separate
repo (`../app`) and is described in `DEMO-SPEC.md`. Read that first.

---

## 0. Scope

- **Plain Markdown.** Theme: `@ktym4a/slidev-theme-ktym4a`, a Catppuccin-palette theme.
  Set it in the frontmatter (`theme: '@ktym4a/slidev-theme-ktym4a'`) and use its own
  configuration options only — read its README for them. No other theme, no custom theme.
- **Code highlighting** should use a matching Catppuccin syntax theme from Shiki, so code
  blocks match the slides. Check Slidev's docs for how to set the Shiki theme.
- **Slidev features in use:** layouts that ship with the theme, Magic Move for code,
  presenter notes, images, and click steps (`clicks:` frontmatter, `$clicks`,
  click-synced line highlighting).
- **Custom Vue components are allowed** for diagrams and animated explanations. Put them
  in `components/`, keep their styles scoped inside the component, and use Catppuccin
  Mocha colors so they match the theme. Extend an existing component (`EventLoop.vue`,
  `ConsoleLog.vue`) before adding a new one. Prefer a component over Mermaid for
  diagrams.
- **Custom animations are allowed** when they explain something, such as work moving
  between the call stack and the queues. Drive them from clicks so the presenter sets
  the pace, and make every step read correctly as a still frame — the PDF export shows
  only end states.
- **No extra CSS on slides** beyond font-size tweaks for legibility; styling lives in
  components.
- **Check sli.dev before using any feature.** Slidev's syntax changes between versions;
  do not rely on memory. Magic Move in particular uses four backticks
  (` ````md magic-move `) around the code blocks.

## 1. Workflow

The presenter builds the deck **one slide at a time**, by request.

- **Build only the slide asked for.** Don't add neighboring slides, finish a section,
  or generate the rest of the deck unprompted.
- Treat the rest of this document as **reference** for each request: §3 shows where a
  slide fits, §4–§8 say how to build it.
- After each slide, stop. Suggest the next slide in one line if useful, but don't
  build it.

---

## 2. The talk

**Title:** to be confirmed. Working title: *Your App Isn't Slow, It's Waiting in Line*.

**Abstract:** A fresh look at how to leverage the Event Loop and Web Workers to
eliminate jank in our apps, including some newer methods your LLM may not be suggesting
yet.

**Length:** 30 minutes. Aim for 25–35 slides, including demo cue slides.

**Format:** each segment shows a visible problem in the app, explains one technique,
reveals the code change, then shows the fix running. The presenter switches between
this deck, the app, a terminal, and Chrome DevTools.

---

## 3. Structure

| Time | Section | Branches used in the demo |
|---|---|---|
| 0:00–3:00 | Opening | `00-baseline` |
| 3:00–9:00 | Segment 1 — `Promise.all` | `00-baseline` → `01-promise-all` |
| 9:00–13:00 | Segment 2 — `Promise.allSettled` | `01-promise-all` → `02-allsettled` |
| 13:00–21:00 | Segment 3 — `setTimeout(0)` vs microtasks | `00-baseline` → `03a-microtask` → `03-settimeout` |
| 21:00–24:00 | Segment 4 — `scheduler.yield()` | `03-settimeout` → `04-scheduler-yield` |
| 24:00–28:00 | Segment 5 — Web Workers | `04-scheduler-yield` → `05-worker` |
| 28:00–30:00 | Close | — |

### Opening

1. Title slide.
2. The presenter's two-barista workflow diagram, full screen: `images/barista-workflow.png`.
   One line: two baristas share one bar without waiting on each other.
3. The turn: JavaScript gets one barista — one main thread.
4. Demo cue: tour of the app on `00-baseline`.

### Each segment follows the same pattern

1. **The problem** — one sentence describing what the audience is about to see.
2. **Demo cue** — run the "before" (see §5).
3. **The technique** — what it is, and where its work lands: call stack, task queue, or
   microtask queue. A simple diagram where it helps.
4. **The code** — a Magic Move block from the `🐌 JANK` version to the `⚡ FIX` version
   (see §4).
5. **Demo cue** — run the fix.
6. **The result** — DevTools screenshots, before and after, side by side.

**Segment 3** adds two slides after the technique slide: a Magic Move from the baseline
to the microtask version, then a demo cue for `03a-microtask` showing it doesn't help,
then continues from step 4 with the microtask → `setTimeout` change. The point: a
microtask "yield" never lets the browser paint.

**Segment 4** skips the "before" demo — the audience saw the freeze minutes earlier.
Its code slide is the one-line change from `03-settimeout` to `04-scheduler-yield`.

**Segment 5's** result slide shows the DevTools recording with the main thread and the
worker on separate tracks.

### Close

The barista diagram beside the segment 5 DevTools screenshot. Two lanes, two threads.
One closing line, then a thank-you slide.

---

## 4. Code on slides

- **Copy code from the branches. Never write it from scratch.** Use
  `git -C ../app show <branch>:app.js` (or `worker.js`, `matcher.js`) and extract the
  `🐌 JANK — Segment N` or `⚡ FIX — Segment N` block.
- Show only the marked block, not the whole file. **12 lines maximum per block**; if a
  block is longer, cut to the lines that change and mark the cut with `// …`.
- Use line highlighting to point at the changed lines.
- If code in the app changes during rehearsal, the matching slide must be re-copied.

---

## 5. Demo cue slides

A demo cue slide tells the presenter to switch to the app. On screen: a short label
such as **→ Demo**. In the presenter notes (an HTML comment at the end of the slide),
the exact steps:

```md
# → Demo

<!--
git checkout 03-settimeout
Reload (cache disabled). Click Search.
Start recording. Click Update matches, type in Medications. Stop.
Point at: many short tasks with gaps.
-->
```

The steps for every cue are in the run of show in `DEMO-SPEC.md` §1 and §6.

---

## 6. Screenshots and numbers

- DevTools screenshots don't exist yet; the presenter will capture them in rehearsal.
  Create slides with image placeholders named `images/seg<N>-before.png` and
  `images/seg<N>-after.png` (plus `images/seg3a-microtask.png`).
- **Never invent numbers.** Wherever a measurement belongs, write a visible
  placeholder like `[[match duration on 03 — from rehearsal]]`. Measured values
  already known are listed in `DEMO-SPEC.md` §8.

---

## 7. Accuracy rules

The talk is about exactly the topics LLMs commonly get wrong. On every slide:

- `setTimeout(fn, 0)` schedules a **task**, not a microtask.
- Microtasks are promise callbacks, `await` continuations, `queueMicrotask`, and
  `MutationObserver`. They **all** run before the browser can paint.
- Yielding with a task gives the browser a *chance* to handle input and paint; it
  doesn't force a paint.
- `await` pauses the **function**, not the thread.
- `async`/`await` gives concurrency, not parallelism. Only workers run code in
  parallel.
- `fetch` does **not** reject on HTTP errors like 404 — only when the request can't
  complete.
- The event loop and task queues come from the **browser**, not the JavaScript engine.
- `scheduler.yield()`: supported in Chromium, **not** in Safari. Do not claim Firefox
  support; the presenter will check current support before the talk.
- A worker cannot touch the DOM.
- Don't call a busy main thread "render-blocking" — that term means something else.
  Say "long task" or "blocks the main thread."

Animations make claims too: the order things move in, and the captions, must follow
these rules.

If a slide makes a technical claim not covered here, flag it in the presenter notes
with `CHECK:` so the presenter verifies it.

---

## 8. Legibility

- One idea per slide. No more than ~25 words of body text.
- Large code font; the room's back row must read it.
- Diagrams: few boxes, short labels. Animation captions: a few words per step.

## 9. Deliverables

- `slides.md` and an `images/` folder with placeholders.
- Before the talk: a PDF export (`slidev export`) as a backup.
