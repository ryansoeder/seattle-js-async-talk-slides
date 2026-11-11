<script lang="ts">
// Web APIs the talk uses (most common first), then the rest of the platform, roughly most common first.
// The list scrolls, so the presenter can scroll through it on stage.
export const TALK_APIS = ['addEventListener', 'setTimeout', 'fetch', 'performance.now', 'postMessage', 'Worker', 'scheduler.yield']
export const MORE_APIS = [
  'document', 'window', 'console', 'localStorage', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'sessionStorage', 'URL', 'URLSearchParams', 'FormData',
  'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal', 'location', 'history', 'navigator',
  'XMLHttpRequest', 'Blob', 'File', 'FileReader', 'queueMicrotask', 'structuredClone', 'matchMedia',
  'getComputedStyle', 'Event', 'CustomEvent', 'EventTarget', 'MutationObserver', 'IntersectionObserver',
  'ResizeObserver', 'PerformanceObserver', 'WebSocket', 'EventSource', 'MessageChannel', 'BroadcastChannel',
  'SharedWorker', 'navigator.serviceWorker', 'caches', 'indexedDB', 'crypto.subtle', 'crypto.randomUUID',
  'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'requestIdleCallback', 'scheduler.postTask',
  'navigator.clipboard', 'navigator.geolocation', 'navigator.share', 'Notification', 'navigator.permissions',
  'customElements', 'ShadowRoot', 'DOMParser', 'XMLSerializer', 'Range', 'Selection', 'TreeWalker',
  'Element.animate', 'document.startViewTransition', 'requestFullscreen', 'requestPointerLock',
  'CanvasRenderingContext2D', 'OffscreenCanvas', 'createImageBitmap', 'WebGL2RenderingContext',
  'navigator.gpu', 'AudioContext', 'MediaRecorder', 'navigator.mediaDevices', 'MediaSource',
  'RTCPeerConnection', 'WebTransport', 'ReadableStream', 'WritableStream', 'TransformStream',
  'CompressionStream', 'DecompressionStream', 'navigator.locks', 'navigator.storage',
  'navigator.credentials', 'PublicKeyCredential', 'PaymentRequest', 'PushManager', 'ReportingObserver',
  'speechSynthesis', 'navigator.mediaSession', 'navigator.wakeLock', 'navigator.vibrate',
  'navigator.getGamepads', 'navigator.sendBeacon', 'navigator.setAppBadge', 'showOpenFilePicker',
  'VideoEncoder', 'VideoDecoder', 'navigator.usb', 'navigator.bluetooth', 'navigator.hid',
  'navigator.serial', 'navigator.xr', 'EyeDropper', 'IdleDetector', 'BarcodeDetector', 'alert', 'confirm',
  'prompt', 'print', 'open'
]

// What each box is for, revealed with `explain` (the Web APIs box "explains" itself with the list above).
// Accuracy (SLIDES-SPEC §7): the event loop doesn't hand work to the queues; your code calls Web APIs,
// the browser queues tasks, promises queue microtasks, and the loop moves queued work onto the empty stack.
// Box colors, shared with CodeTicks.vue so code legends match the diagram.
// Keep in sync with the --prep/--shot/--serve/--pour/--charcoal variables below.
export const COLORS = {
  stack: { bg: '#a8302c', ink: '#ffffff' },
  apis: { bg: '#9e3650', ink: '#ffffff' },
  micro: { bg: '#0f766e', ink: '#ffffff' },
  tasks: { bg: '#96d3d1', ink: '#4f5050' },
  loop: { bg: '#4f5050', ink: '#ffffff' },
  worker: { bg: '#6f4a2e', ink: '#ffffff' },
} as const

export const NOTES = {
  stack: 'Runs your code in order, one function call at a time',
  loop: 'When the stack is empty: every microtask, then the next task',
  tasks: 'Callbacks from timers, events and messages. One per loop.',
  micro: 'Promise callbacks, await, queueMicrotask. All run before the next task.',
  worker: 'Its own thread and event loop. Runs worker.js; no DOM.',
}
</script>

<script setup lang="ts">
import { useSlideContext } from '@slidev/client'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type Kind = 'frame' | 'task' | 'micro' | 'timer'
type Box = 'stack' | 'apis' | 'tasks' | 'micro' | 'wstack' | 'wtasks'
type Panel = 'stack' | 'apis' | 'tasks' | 'micro' | 'loop' | 'worker'
/** A string, or an object whose `id` stays the same as it moves between boxes */
type Token = string | { id: string, label: string, kind?: Kind, at?: string }
/** One frame of an animation: whatever it leaves out falls back to the props */
interface Step {
  stack?: Token[]
  apis?: Token[]
  tasks?: Token[]
  microtasks?: Token[]
  /** Frames on the worker thread's call stack, bottom first (needs `worker`) */
  workerStack?: Token[]
  /** Messages waiting for the worker thread, next-to-run first (needs `worker`) */
  workerTasks?: Token[]
  active?: Panel | Panel[]
  caption?: string
  explain?: Panel[]
  hidden?: Panel[]
  look?: Panel | ''
  render?: boolean
}

const props = withDefaults(defineProps<{
  /** Frames on the call stack, bottom first */
  stack?: Token[]
  /** Work handed to the browser; `at` highlights that Web API's name */
  apis?: Token[]
  /** Tasks waiting, next-to-run first */
  tasks?: Token[]
  /** Microtasks waiting, next-to-run first */
  microtasks?: Token[]
  workerStack?: Token[]
  workerTasks?: Token[]
  /** Add a Worker thread box (its own stack and task queue) next to a narrower Web APIs box */
  worker?: boolean
  webApis?: string[]
  /** Panel(s) to highlight; the others dim */
  active?: Panel | Panel[]
  /** Short narration shown under the event-loop icon */
  caption?: string
  /** Boxes that show what they're for; 'apis' shows the Web API list */
  explain?: Panel[]
  /** Boxes left out; a hidden Microtask Queue collapses so the Task Queue takes its space */
  hidden?: Panel[]
  /** Eyes in the Event Loop box's corner, looking at this box ('' = no eyes) */
  look?: Panel | ''
  /** Show "Render opportunity" in the Event Loop box */
  render?: boolean
  /** Override the explanation text per box */
  notes?: Partial<Record<Panel, string>>
  /**
   * Click-driven animation: steps[0] shows before the first click, steps[n] after
   * click n. Set the slide's `clicks:` frontmatter to steps.length - 1.
   * A token object keeps its `id` across steps, so it slides between boxes.
   */
  steps?: Step[]
  height?: number
}>(), {
  stack: () => [],
  apis: () => [],
  tasks: () => [],
  microtasks: () => [],
  workerStack: () => [],
  workerTasks: () => [],
  worker: false,
  webApis: () => [...TALK_APIS, ...MORE_APIS],
  active: () => [],
  caption: '',
  explain: () => ['apis'],
  hidden: () => [],
  look: '',
  render: false,
  notes: () => ({}),
  steps: () => [],
  height: 470,
})

// What's on screen now: the current step (if any) layered over the props
const { $clicks } = useSlideContext()
const state = computed(() => {
  const n = props.steps.length
  const s: Step = n ? props.steps[Math.min(Math.max($clicks.value, 0), n - 1)] : {}
  return {
    stack: s.stack ?? props.stack,
    apis: s.apis ?? props.apis,
    tasks: s.tasks ?? props.tasks,
    microtasks: s.microtasks ?? props.microtasks,
    workerStack: s.workerStack ?? props.workerStack,
    workerTasks: s.workerTasks ?? props.workerTasks,
    active: s.active ?? props.active,
    caption: s.caption ?? props.caption,
    explain: s.explain ?? props.explain,
    hidden: s.hidden ?? props.hidden,
    look: s.look ?? props.look,
    render: s.render ?? props.render,
  }
})
const shows = (p: Panel) => state.value.explain.includes(p)
const note = (p: Panel) => props.notes[p] ?? (NOTES as Partial<Record<Panel, string>>)[p] ?? ''

const actives = computed<Panel[]>(() =>
  Array.isArray(state.value.active) ? state.value.active : [state.value.active])
const panelClass = (name: Panel) => ({
  'is-active': actives.value.includes(name),
  'is-dim': actives.value.length > 0 && !actives.value.includes(name),
  'is-hidden': state.value.hidden.includes(name),
})

// ---- Token layout -------------------------------------------------------
// Tokens live in one absolutely positioned layer so they can travel between
// panels. Each box has an empty "slot" element; we measure the slots with
// offset* values, which ignore Slidev's scale().

interface Rect { x: number, y: number, w: number, h: number }
const root = ref<HTMLElement>()
const panelEls: Partial<Record<Panel, HTMLElement>> = {}
const slotEls: Partial<Record<Box, HTMLElement>> = {}
const layout = reactive<{ slots: Partial<Record<Box, Rect>>, panels: Partial<Record<Panel, Rect>> }>({ slots: {}, panels: {} })

// Web API names: a scrollable list; a highlighted name scrolls into view
const apiList = ref<HTMLElement>()
const apiEls: Record<string, HTMLElement> = {}
const highlighted = computed(() => new Set(state.value.apis.map(t => typeof t === 'string' ? '' : t.at)))
watch(highlighted, (on) => {
  const list = apiList.value
  const el = [...on].map(name => name && apiEls[name]).find(Boolean)
  if (!list || !el)
    return
  const top = el.offsetTop - list.offsetTop
  if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight)
    list.scrollTo({ top: Math.max(0, top - 4), behavior: 'smooth' })
})

function inRoot(el: HTMLElement, panel: HTMLElement): Rect {
  return {
    x: panel.offsetLeft + panel.clientLeft + el.offsetLeft,
    y: panel.offsetTop + panel.clientTop + el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight,
  }
}

function measure() {
  for (const box of Object.keys(slotEls) as Box[]) {
    const p = panelEls[box === 'wstack' || box === 'wtasks' ? 'worker' : box]
    const s = slotEls[box]
    if (p && s)
      layout.slots[box] = inRoot(s, p)
  }
  for (const [name, p] of Object.entries(panelEls) as [Panel, HTMLElement][]) {
    if (p)
      layout.panels[name] = { x: p.offsetLeft, y: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight }
  }
}

// ---- 👀 ----------------------------------------------------------------
// A pair of eyes (drawn like the emoji) in the Event Loop box's top-right
// corner. They stay upright; the pupils slide toward the `look` box.
const EYES = { w: 60, h: 40, top: 6, right: 8 }
const pupil = computed(() => {
  const loop = layout.panels.loop
  const target = state.value.look ? layout.panels[state.value.look] : undefined
  if (!loop || !target)
    return { x: 0, y: 0 }
  const ex = loop.x + loop.w - EYES.right - EYES.w / 2
  const ey = loop.y + EYES.top + EYES.h / 2
  // Straight at the box if we're under/over it, otherwise at its center
  const tx = ex >= target.x && ex <= target.x + target.w ? ex : target.x + target.w / 2
  const ty = target.y + target.h / 2
  const a = Math.atan2(ty - ey, tx - ex)
  return { x: Math.cos(a) * 5, y: Math.sin(a) * 8 }
})

let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  document.fonts?.ready.then(measure)
  ro = new ResizeObserver(measure)
  if (root.value)
    ro.observe(root.value)
  // Revealed notes resize the slots without resizing the root
  for (const el of Object.values(slotEls))
    if (el)
      ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())

// Event loop slides drop the theme's per-slide frame (gradient + dashed border,
// drawn by the theme's slide-bottom layer); see the unscoped style at the end.
const PLAIN = 'event-loop-slide'
let page: Element | null | undefined
onMounted(() => {
  page = root.value?.closest('.slidev-page')
  page?.classList.add(PLAIN)
})
onBeforeUnmount(() => page?.classList.remove(PLAIN))

const TOKEN_H = 30
const GAP = 6
const API_TOKEN_W = 220
const DEFAULT_KIND: Record<Box, Kind> = { stack: 'frame', apis: 'timer', tasks: 'task', micro: 'micro', wstack: 'frame', wtasks: 'task' }

// ---- One thing at a time ------------------------------------------------
// Within a click, changes play in order instead of all at once:
//   1. tokens that left fade out
//   2. tokens that changed boxes slide over
//   3. new call-stack frames appear
//   4. then what they handed off appears (Web APIs, queues)
// The eyes turn once step 1 is done (e.g. after the stack empties).
const LEAVE_MS = 300
const MOVE_MS = 650
const ENTER_MS = 350
type Where = Map<string, Box>
function whereIs(st: typeof state.value): Where {
  const m: Where = new Map()
  const add = (list: Token[], box: Box) => list.forEach(raw => m.set(typeof raw === 'string' ? raw : raw.id, box))
  add(st.stack, 'stack')
  add(st.apis, 'apis')
  add(st.tasks, 'tasks')
  add(st.microtasks, 'micro')
  add(st.workerStack, 'wstack')
  add(st.workerTasks, 'wtasks')
  return m
}
const delays = ref<Record<string, number>>({})
const eyesDelay = ref(0)
watch(state, (now, before) => {
  if (!before)
    return
  const a = whereIs(before)
  const b = whereIs(now)
  const left = [...a.keys()].some(id => !b.has(id))
  const moved = [...b].filter(([id, box]) => a.has(id) && a.get(id) !== box).map(([id]) => id)
  const entered = [...b].filter(([id]) => !a.has(id))
  let t = left ? LEAVE_MS : 0
  eyesDelay.value = t
  const d: Record<string, number> = {}
  // Everything that stays (including tokens shuffling within a box) waits for the leavers
  ;[...b.keys()].filter(id => a.has(id)).forEach(id => (d[id] = t))
  if (moved.length)
    t += MOVE_MS
  const enteredStack = entered.filter(([, box]) => box === 'stack')
  enteredStack.forEach(([id]) => (d[id] = t))
  if (enteredStack.length)
    t += ENTER_MS
  entered.filter(([, box]) => box !== 'stack').forEach(([id]) => (d[id] = t))
  delays.value = d
})

const tokens = computed(() => {
  const out: { id: string, label: string, kind: Kind, rect: Rect, delay: number }[] = []
  const place = (list: Token[], box: Box) => {
    const s = layout.slots[box]
    if (!s)
      return
    list.forEach((raw, i) => {
      const t = typeof raw === 'string' ? { id: raw, label: raw } : raw
      const kind = t.kind ?? DEFAULT_KIND[box]
      let rect: Rect
      if (box !== 'apis') {
        // Stack and queues fill from the bottom up: the first item sits on the
        // floor of the box (for a queue that's the next one to run)
        rect = { x: s.x, y: s.y + s.h - (i + 1) * TOKEN_H - i * GAP, w: s.w, h: TOKEN_H }
      }
      else {
        // In flight: a row along the bottom of the Web APIs box
        const n = list.length
        const w = Math.min(API_TOKEN_W, (s.w - (n - 1) * GAP) / n)
        rect = { x: s.x + i * (w + GAP), y: s.y + (s.h - TOKEN_H) / 2, w, h: TOKEN_H }
      }
      out.push({ id: t.id, label: t.label, kind, rect, delay: delays.value[t.id] ?? 0 })
    })
  }
  place(state.value.stack, 'stack')
  place(state.value.apis, 'apis')
  place(state.value.tasks, 'tasks')
  place(state.value.microtasks, 'micro')
  place(state.value.workerStack, 'wstack')
  place(state.value.workerTasks, 'wtasks')
  // Stable DOM order: if a token's position in the list changed when it moved
  // boxes, Vue would re-insert its element and the browser would drop the
  // left/top transition (it would jump instead of slide).
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
})
</script>

<template>
  <div ref="root" class="runtime" :class="{ 'no-micro': state.hidden.includes('micro'), 'compact': height < 400, 'with-worker': worker, 'no-worker': worker && state.hidden.includes('worker') }" :style="{ height: `${height}px` }">
    <section
      :ref="el => (panelEls.stack = el as HTMLElement)"
      class="panel stack" :class="panelClass('stack')"
      style="--c: var(--prep)"
    >
      <div class="label">Call Stack</div>
      <Transition name="note"><p v-if="shows('stack')" class="note">{{ note('stack') }}</p></Transition>
      <div :ref="el => (slotEls.stack = el as HTMLElement)" class="slot" />
    </section>

    <section
      :ref="el => (panelEls.loop = el as HTMLElement)"
      class="panel loop" :class="panelClass('loop')" style="--c: var(--charcoal)"
    >
      <div class="label">Event Loop</div>
      <Transition name="eyes">
        <svg v-if="state.look" class="eyes" viewBox="0 0 60 40" aria-hidden="true">
          <g v-for="cx in [16, 44]" :key="cx">
            <ellipse :cx="cx" cy="20" rx="12.5" ry="18" fill="#fff" stroke="#c9c9c9" stroke-width="1.5" />
            <g class="pupil" :style="{ transform: `translate(${pupil.x}px, ${pupil.y}px)`, transitionDelay: `${eyesDelay}ms` }">
              <circle :cx="cx" cy="20" r="7" fill="#6b3f1d" />
              <circle :cx="cx" cy="20" r="4.2" fill="#1b1b1b" />
              <circle :cx="cx + 2" cy="17.5" r="1.7" fill="#fff" />
            </g>
          </g>
        </svg>
      </Transition>
      <div class="loop-body">
        <svg class="loop-icon" :class="{ 'spinning': actives.includes('loop'), 'yields-to-note': shows('loop') || (state.render && height < 300) }" viewBox="0 0 64 64" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter">
            <path d="M13 28 A20 20 0 0 1 47 17" />
            <path d="M39 12 L48 16 L45 25" />
            <path d="M51 36 A20 20 0 0 1 17 47" />
            <path d="M25 52 L16 48 L19 39" />
          </g>
        </svg>
        <Transition name="note"><p v-if="shows('loop')" class="note loop-note">{{ note('loop') }}</p></Transition>
        <Transition name="note"><div v-if="state.render" class="render-op">Render opportunity</div></Transition>
        <Transition name="fade" mode="out-in">
          <div :key="state.caption" class="caption">{{ state.caption }}</div>
        </Transition>
      </div>
    </section>

    <section
      :ref="el => (panelEls.apis = el as HTMLElement)"
      class="panel apis" :class="panelClass('apis')"
      style="--c: var(--shot)"
    >
      <div class="label">Web APIs</div>
      <div ref="apiList" class="api-list" :class="{ concealed: !shows('apis') }">
        <template v-for="(api, i) in webApis" :key="api">
          <span
            :ref="el => { if (el) apiEls[api] = el as HTMLElement }"
            class="api" :class="{ on: highlighted.has(api) }"
          >{{ api }}<span v-if="i < webApis.length - 1" class="sep">,</span></span>{{ ' ' }}
        </template>
      </div>
      <div :ref="el => (slotEls.apis = el as HTMLElement)" class="slot api-slot" />
    </section>

    <section
      :ref="el => (panelEls.micro = el as HTMLElement)"
      class="panel micro" :class="panelClass('micro')"
      style="--c: var(--serve)"
    >
      <div class="label">Microtask Queue</div>
      <Transition name="note"><p v-if="shows('micro')" class="note">{{ note('micro') }}</p></Transition>
      <div :ref="el => (slotEls.micro = el as HTMLElement)" class="slot" />
    </section>

    <section
      :ref="el => (panelEls.tasks = el as HTMLElement)"
      class="panel tasks" :class="panelClass('tasks')"
      style="--c: var(--pour)"
    >
      <div class="label">Task Queue</div>
      <Transition name="note"><p v-if="shows('tasks')" class="note">{{ note('tasks') }}</p></Transition>
      <div :ref="el => (slotEls.tasks = el as HTMLElement)" class="slot" />
    </section>

    <!-- Between draining the microtasks and taking the next task: where the browser can paint -->
    <div class="render-line" aria-hidden="true">
      <span class="render-tag">Render</span>
    </div>

    <section
      v-if="worker"
      :ref="el => (panelEls.worker = el as HTMLElement)"
      class="panel worker" :class="panelClass('worker')"
      style="--c: var(--brew)"
    >
      <div class="label">Worker Thread</div>
      <Transition name="note"><p v-if="shows('worker')" class="note">{{ note('worker') }}</p></Transition>
      <div class="worker-lanes">
        <div class="worker-lane">
          <div class="sublabel">Stack</div>
          <div :ref="el => (slotEls.wstack = el as HTMLElement)" class="slot" />
        </div>
        <div class="worker-lane">
          <div class="sublabel">Task Queue</div>
          <div :ref="el => (slotEls.wtasks = el as HTMLElement)" class="slot" />
        </div>
      </div>
    </section>

    <TransitionGroup name="tok" tag="div" class="tokens">
      <div
        v-for="t in tokens" :key="t.id"
        class="token" :class="`k-${t.kind}`"
        :style="{
          left: `${t.rect.x}px`,
          top: `${t.rect.y}px`,
          width: `${t.rect.w}px`,
          height: `${t.rect.h}px`,
          transitionDelay: `${t.delay}ms`,
        }"
      >
        {{ t.label }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* In the style of the barista workflow diagram: flat color blocks, charcoal
   label tags, white items, condensed uppercase type.
   Accessibility (WCAG AA): dark blocks are >= 5:1 with white text; the light
   Task Queue uses charcoal text (4.8:1); tokens are charcoal on white (8:1).
   Dimming moves a block away from its text color, so contrast only goes up. */
.runtime {
  --prep: #a8302c;     /* call stack, white text 6.7:1 */
  --shot: #9e3650;     /* web apis, 6.8:1 */
  --serve: #0f766e;    /* microtasks, 5.5:1 */
  --pour: #96d3d1;     /* tasks: the image's light "steam" teal, charcoal text 4.8:1 */
  --charcoal: #4f5050; /* event loop + tags, 8.1:1 */
  --brew: #6f4a2e;     /* worker thread: coffee brown, the second barista, 7.8:1 */
  --night: #1e1e2e;    /* what dimmed blocks fade toward */
  --paper: #eff1f5;    /* light card behind the blocks, like the workflow slide */
  --white: #ffffff;
  --condensed: 'DIN Condensed', 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --mono: var(--slidev-code-font-family, ui-monospace, monospace);
  --move: 650ms cubic-bezier(0.65, 0, 0.35, 1);

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  transition: grid-template-columns var(--move);
  /* Equal rows: queue boxes need room for their explanations; the API list scrolls */
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    'stack micro tasks'
    'loop  apis  apis';
  gap: 8px;
  padding: 14px;
  background: var(--paper);
  color: var(--white);
  text-align: left;
}

.panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 12px 10px;
  --ink: var(--white);    /* text on this block */
  --dim-to: var(--night); /* dimming fades away from the ink */
  --dim-keep: 45%;        /* how much of the block's color survives dimming */
  background: var(--c);
  color: var(--ink);
  transition: background-color 400ms, opacity 400ms;
}
.panel.is-hidden {
  opacity: 0;
}
/* No Microtask Queue yet: its column shrinks to nothing and the Task Queue
   widens to fill it (the Web APIs box spans both columns, so it doesn't move) */
.runtime.no-micro {
  grid-template-columns: minmax(0, 1fr) minmax(0, 0fr) minmax(0, 2fr);
}
.no-micro .micro {
  padding-inline: 0;
}
.tasks {
  --ink: var(--charcoal);
  --dim-to: var(--paper);
  --dim-keep: 62%; /* a light block on a light card: keep more color so it doesn't vanish */
  transition: background-color 400ms, margin-left var(--move);
}
.no-micro .tasks {
  margin-left: -8px; /* stretch over the empty column's extra grid gap */
}
/* Dim = the block fades away from its text color (darker under white text,
   lighter under charcoal), so text stays readable.
   The loop never dims: its caption narrates every step. */
.panel.is-dim:not(.loop) {
  background: color-mix(in srgb, var(--c) var(--dim-keep), var(--dim-to));
}

.stack { grid-area: stack; }
.loop { grid-area: loop; }
.apis { grid-area: apis; }
.micro { grid-area: micro; }
.tasks { grid-area: tasks; }
.worker { grid-area: worker; }

/* A Worker thread takes the bottom-right column; Web APIs narrows to one */
.runtime.with-worker {
  grid-template-areas:
    'stack micro tasks'
    'loop  apis  worker';
}
/* Worker not revealed yet: Web APIs stretches over its column (margin percentages
   are relative to the grid column, and both columns are the same width). One thing
   at a time, like the Microtask Queue reveal: revealing, Web APIs slides back and
   then the worker fades in; hiding, the worker fades out and then Web APIs stretches.
   Web APIs is layered above the worker so they never show through each other. */
.with-worker .apis {
  z-index: 1;
  transition: background-color 400ms, margin-right var(--move);
}
.no-worker .apis {
  margin-right: calc(-100% - 8px);
  transition: background-color 400ms, margin-right var(--move) 300ms;
}
.with-worker .worker {
  transition: background-color 400ms, opacity 300ms 650ms;
}
.no-worker .worker {
  transition: background-color 400ms, opacity 300ms;
}
.worker-lanes {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
}
.worker-lane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.worker-lane:first-child {
  flex: 1.6; /* frames like postMessage() need the room; the inbox holds one short message */
}
.worker-lane + .worker-lane {
  padding-left: 10px;
  border-left: 2px solid rgb(255 255 255 / 0.3);
}
.sublabel {
  flex: none;
  margin-bottom: 4px;
  font-family: var(--condensed);
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}

/* Charcoal tag flush with the block's top-left corner, like "FIRST DRINK" */
.label {
  flex: none;
  align-self: flex-start;
  margin: 0 0 10px -12px;
  padding: 5px 10px 2px;
  background: var(--charcoal);
  font-family: var(--condensed);
  font-size: 23px;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--white);
}
.loop .label {
  background: var(--white);
  color: var(--charcoal);
}

/* Empty area that tokens are positioned into (kept static so offset* stays relative to the panel) */
.slot {
  flex: 1;
  min-height: 0;
}

.api-list {
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 0.5) transparent;
  pointer-events: auto;
  /* Fade the cut-off last line instead of slicing it */
  mask-image: linear-gradient(to bottom, #000 calc(100% - 26px), transparent);
  font-family: var(--mono);
  font-size: 17px;
  line-height: 25px;
  color: var(--white);
}
.api-list {
  transition: opacity 400ms, translate 400ms;
}
.api-list.concealed {
  opacity: 0;
  translate: 0 8px;
  pointer-events: none;
}
.api {
  white-space: nowrap;
  transition: background-color 300ms;
}
.api.on {
  padding: 1px 5px;
  background: var(--white);
  color: var(--charcoal);
  font-weight: 700;
}
.sep {
  opacity: 0.75;
  font-weight: 400;
}
.api-slot {
  flex: none;
  height: 34px;
}

/* What a box is for: plain sentence case, big enough for the back row */
.note {
  flex: none;
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
  text-wrap: pretty;
}
.loop-note {
  text-align: center;
  font-size: 19px;
}
.note-enter-active {
  transition: opacity 400ms, translate 400ms;
}
.note-enter-from {
  opacity: 0;
  translate: 0 8px;
}

.eyes {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 60px;
  height: 40px;
  overflow: visible;
  transition: opacity 300ms, scale 300ms;
}
.pupil {
  transition: transform var(--move);
}
.eyes-enter-from,
.eyes-leave-to {
  opacity: 0;
  scale: 0.4;
}

.loop-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.loop-icon {
  width: 60px;
  height: 60px;
  flex: none;
  color: var(--white);
}
.loop-icon.spinning {
  animation: spin 1.4s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* The boundary between the two queues, in the grid gap: microtasks drain, then the
   browser may paint, then the next task. Grid column 3's left edge is the Task Queue's;
   the line straddles the 8px gap before it, above the blocks and below the tokens. */
.render-line {
  grid-row: 1;
  grid-column: 3;
  justify-self: start;
  position: relative;
  z-index: 1;
  width: 3px;
  margin: -6px 0 -6px -5.5px;
  background: var(--charcoal);
  /* Revealed with the Microtask Queue: wait for the columns to finish moving */
  transition: opacity 300ms 650ms;
}
.no-micro .render-line {
  opacity: 0;
  transition: opacity 200ms;
}
.render-tag {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  rotate: 180deg;
  writing-mode: vertical-rl;
  padding: 7px 4px 5px 1px;
  background: var(--charcoal);
  color: var(--white);
  font-family: var(--condensed);
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* A chance to paint, not a guarantee: "opportunity" on purpose (SLIDES-SPEC §7) */
.render-op {
  padding: 6px 12px 3px;
  background: var(--white);
  color: var(--charcoal);
  font-family: var(--condensed);
  font-size: 24px;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.compact .loop-icon {
  width: 36px;
  height: 36px;
}
.compact .loop-body {
  gap: 6px;
}
.compact .caption {
  min-height: 0;
  font-size: 19px;
}
.compact .note {
  font-size: 17px;
  line-height: 1.2;
}
.compact .loop-note {
  font-size: 17px;
}
/* Short on room: the description replaces the icon (and so does the render badge
   on the shortest diagrams, where icon + badge + caption don't fit) */
.compact .loop-icon.yields-to-note {
  display: none;
}
.compact .render-op {
  font-size: 21px;
}

.caption {
  min-height: 2.2em;
  font-family: var(--condensed);
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: center;
}

/* ---- Tokens: white boxes with charcoal text, readable on any block ---- */
.tokens {
  position: absolute;
  inset: 0;
  z-index: 2; /* above a layered Web APIs box */
  pointer-events: none;
}
.token {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  overflow: hidden;
  background: var(--white);
  /* Charcoal edge keeps white tokens distinct on the light Task Queue */
  box-shadow: 0 0 0 2px var(--charcoal), 0 3px 8px -3px rgb(0 0 0 / 0.5);
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;
  color: var(--charcoal);
  white-space: nowrap;
  /* Positioned with left/top, not transform: TransitionGroup's move (FLIP) step
     resets inline transforms when a token changes boxes, which threw tokens to
     the top-left corner. With no transform transition, it skips that step. */
  transition: left var(--move), top var(--move), width var(--move), height var(--move), opacity 300ms, scale 300ms;
}

.tok-leave-active {
  transition-delay: 0s !important; /* leaving always goes first */
}
.tok-enter-from,
.tok-leave-to {
  opacity: 0;
  scale: 0.7;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
/* Unscoped on purpose: hides the theme's slide-bottom layer (its root is the
   first child of .slidev-page) only on slides that contain an EventLoop. */
.slidev-page.event-loop-slide > .wrapper {
  display: none;
}
/* Same plain editor background as the nvim-style slides (Catppuccin Mocha base) */
.slidev-page.event-loop-slide {
  background: #1e1e2e;
}
</style>
