<script setup lang="ts">
import { useSlideContext } from '@slidev/client'
import { nextTick, onMounted, ref, watch } from 'vue'

/**
 * Two files side by side, like nvim's :vsplit, in Catppuccin Mocha. Put a code block
 * in each slot:
 *
 *   <NvimSplit left="app.js" right="worker.js">
 *   <template #left>
 *
 *   ```js
 *   …
 *   ```
 *
 *   </template>
 *   <template #right>
 *   …
 *   </template>
 *   </NvimSplit>
 *
 * Long lines soft-wrap like nvim's 'wrap' option instead of shrinking the font.
 *
 * `steps` highlights lines click by click, in both panes at once: steps[n] applies
 * after click n (set the slide's `clicks:` to steps.length - 1). Each side takes
 * 'all', 'none', or line numbers like '4', '8,10' or '7-11'; lines not listed dim.
 */
const props = withDefaults(defineProps<{
  /** File name shown at the top of each pane (nvim's winbar) */
  left?: string
  right?: string
  /** Code size; both panes match */
  fontSize?: number
  lineHeight?: number
  steps?: { left?: string, right?: string }[]
}>(), {
  left: '',
  right: '',
  fontSize: 15,
  lineHeight: 23,
  steps: () => [],
})

type Side = 'left' | 'right'
const buffers = ref<Record<Side, HTMLElement | undefined>>({ left: undefined, right: undefined })
const { $clicks } = useSlideContext()

function lit(spec: string, n: number): boolean {
  if (spec === 'all')
    return true
  return spec.split(',').some((part) => {
    const [a, b = a] = part.split('-').map(Number)
    return n >= a && n <= b
  })
}
function highlight() {
  if (!props.steps.length)
    return
  const step = props.steps[Math.min(Math.max($clicks.value, 0), props.steps.length - 1)]
  for (const side of ['left', 'right'] as Side[]) {
    const spec = step[side] ?? 'all'
    buffers.value[side]?.querySelectorAll('.line').forEach((line, i) => {
      line.classList.toggle('dim', !lit(spec, i + 1))
    })
  }
}
onMounted(() => nextTick(highlight))
watch($clicks, () => nextTick(highlight))

const ROWS = 40
</script>

<template>
  <div class="nvim-split" :style="{ '--slidev-code-font-size': `${fontSize}px`, '--slidev-code-line-height': `${lineHeight}px` }">
    <div v-for="side in (['left', 'right'] as const)" :key="side" class="pane">
      <div class="winbar">{{ side === 'left' ? left : right }}</div>
      <div class="pane-body">
        <div class="gutter" aria-hidden="true">
          <div v-for="n in ROWS" :key="n">~</div>
        </div>
        <div :ref="el => (buffers[side] = el as HTMLElement)" class="buffer">
          <slot :name="side" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Catppuccin Mocha */
.nvim-split {
  --mauve: #cba6f7;
  --text: #cdd6f4;
  --subtext: #a6adc8;
  --surface1: #45475a;
  --base: #1e1e2e;

  /* Cover the theme's background and frame, like NvimWindow */
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  overflow: hidden;
  background: var(--base);
  color: var(--text);
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  text-align: left;
}

.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
/* nvim's WinSeparator */
.pane + .pane {
  border-left: 2px solid var(--surface1);
}

.winbar {
  flex: none;
  padding: 8px 16px 6px 46px;
  color: var(--mauve);
  font-size: 15px;
  font-weight: 700;
}

.pane-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.gutter {
  flex: none;
  width: 34px;
  padding-left: 12px;
  color: var(--surface1);
  /* One tilde per code row */
  font-size: var(--slidev-code-font-size);
  line-height: var(--slidev-code-line-height);
}
.buffer {
  flex: 1;
  min-width: 0;
  padding-right: 14px;
  overflow: hidden;
}

/* The code sits on the editor background, and long lines wrap like :set wrap.
   :deep() because the code block is nested inside the slotted markdown. */
.buffer :deep(.slidev-code-wrapper) {
  margin: 0;
}
.buffer :deep(pre) {
  margin: 0;
  padding: 0 !important;
  background: transparent !important;
  overflow: visible !important;
}
.buffer :deep(pre),
.buffer :deep(code),
.buffer :deep(.line) {
  white-space: pre-wrap !important;
  overflow-wrap: anywhere;
}
.buffer :deep(.line) {
  transition: opacity 300ms;
}
.buffer :deep(.line.dim) {
  opacity: 0.3;
}
</style>
