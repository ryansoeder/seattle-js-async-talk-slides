<script setup lang="ts">
withDefaults(defineProps<{
  /** Big centered lines, like Neovim's start screen; the last one gets the accent color */
  title?: string[]
  /** Lines that appear one per click, down the slide */
  list?: string[]
  /** How many `list` lines are visible; pass `$clicks` */
  shown?: number
  /** Index of a `list` line to select, like a visual-mode selection */
  highlight?: number
}>(), {
  title: () => [],
  list: () => [],
  shown: Infinity,
  highlight: -1,
})

const ROWS = 30
</script>

<template>
  <div class="nvim">
    <div class="gutter" aria-hidden="true">
      <div v-for="n in ROWS" :key="n">~</div>
    </div>
    <div class="buffer" :class="{ 'with-title': title.length && list.length }">
      <div v-if="title.length" class="title">
        <div v-for="(line, i) in title" :key="i" :class="{ accent: i === title.length - 1 }">
          {{ line }}
        </div>
      </div>
      <div v-if="list.length" class="list">
        <div v-for="(item, i) in list" :key="i" class="item" :class="{ shown: i < shown, visual: i === highlight }">
          <span class="bullet">-</span>
          <span>{{ item }}</span>
        </div>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Catppuccin Mocha */
.nvim {
  --mauve: #cba6f7;
  --text: #cdd6f4;
  --surface1: #45475a;
  --base: #1e1e2e;

  /* Cover the theme's background and frame */
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  overflow: hidden;
  background: var(--base);
  color: var(--text);
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  font-size: 15px;
  line-height: 22px;
  text-align: left;
}

.gutter {
  flex: none;
  width: 34px;
  padding: 4px 0 0 12px;
  color: var(--surface1);
}
.buffer {
  flex: 1;
  display: grid;
  place-items: center;
  /* Balance the gutter so the title sits in the middle of the slide */
  margin-right: 34px;
}

.title {
  font-size: 58px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-align: center;
}
.title .accent {
  color: var(--mauve);
}

/* Lines revealed one per click; hidden ones keep their space so nothing shifts */
.list {
  display: flex;
  flex-direction: column;
  gap: 34px;
  width: 82%;
  font-size: 32px;
  line-height: 1.3;
}
/* Title above a list: pack them together and shrink to fit. Pinned to a fixed top
   (not centered) so slides that fade into each other keep matching lines in place. */
.buffer.with-title {
  align-content: start;
  padding-top: 112px;
  gap: 28px;
}
.buffer.with-title .title {
  font-size: 52px;
}
.buffer.with-title .list {
  gap: 14px;
  font-size: 26px;
}
.item {
  display: flex;
  gap: 0.6em;
  opacity: 0;
  translate: 0 10px;
  transition: opacity 400ms, translate 400ms, background-color 200ms;
}
.item.shown {
  opacity: 1;
  translate: 0 0;
}
.bullet {
  flex: none;
  color: var(--mauve);
}
/* Mocha's Visual highlight: the line looks selected with V */
.item {
  width: fit-content;
  margin-inline: -0.3em;
  padding-inline: 0.3em;
}
.item.visual {
  background: var(--surface1);
}

/* A screenshot dropped in the slot: centered, as large as fits */
.buffer :slotted(img) {
  display: block;
  max-width: 88%;
  max-height: 80%;
  object-fit: contain;
}
/* For transparent images with dark ink: a light Catppuccin Latte card behind them */
.buffer :slotted(img.paper) {
  max-width: 94%;
  max-height: 88%;
  padding: 18px 20px;
  background: #eff1f5;
}
</style>
