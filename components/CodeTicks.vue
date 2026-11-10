<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { COLORS } from './EventLoop.vue'

type Box = keyof typeof COLORS

const props = withDefaults(defineProps<{
  /** One entry per code line: the box whose color the line's tick uses, or null for no tick */
  ticks: (Box | null)[]
  /** How many ticks are visible, top-down; pass something based on `$clicks` */
  shown?: number
}>(), {
  shown: Infinity,
})

// Ticks appear in order, skipping lines without one
const order = computed(() => {
  let n = 0
  return props.ticks.map(t => (t ? n++ : -1))
})

// Measure each rendered code line (Shiki's `.line` spans) so ticks line up
// whatever the font size. Rects are divided by Slidev's scale.
const wrap = ref<HTMLElement>()
const lines = ref<{ top: number, h: number }[]>([])
function measure() {
  const el = wrap.value
  if (!el)
    return
  const box = el.getBoundingClientRect()
  const scale = box.width / el.offsetWidth || 1
  lines.value = [...el.querySelectorAll('.line')].map((l) => {
    const r = l.getBoundingClientRect()
    return { top: (r.top - box.top) / scale, h: r.height / scale }
  })
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  document.fonts?.ready.then(measure)
  ro = new ResizeObserver(measure)
  if (wrap.value)
    ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

const SIZE = 22
</script>

<template>
  <div ref="wrap" class="code-ticks">
    <div class="gutter" aria-hidden="true">
      <template v-for="(t, i) in ticks" :key="i">
        <span
          v-if="t && lines[i]"
          class="tick"
          :class="{ shown: order[i] < shown }"
          :style="{
            top: `${lines[i].top + (lines[i].h - SIZE) / 2}px`,
            background: COLORS[t].bg,
            color: COLORS[t].ink,
          }"
        >
          <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" /></svg>
        </span>
      </template>
    </div>
    <div class="code">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* A legend in the code's left gutter: one colored check per line, matching the
   EventLoop box (queue, or call stack) that line's work goes to. */
.code-ticks {
  position: relative;
  display: flex;
  gap: 10px;
}
.gutter {
  position: relative;
  flex: none;
  width: 22px;
}
.code {
  flex: 1;
  min-width: 0;
}
.tick {
  position: absolute;
  left: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  opacity: 0;
  scale: 0.4;
  transition: opacity 300ms, scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tick.shown {
  opacity: 1;
  scale: 1;
}
.tick svg {
  width: 16px;
  height: 16px;
}
</style>
