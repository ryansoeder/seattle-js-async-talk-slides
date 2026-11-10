<script setup lang="ts">
withDefaults(defineProps<{ lines?: string[] }>(), { lines: () => [] })
</script>

<template>
  <section class="console">
    <div class="tab">Console</div>
    <TransitionGroup name="line" tag="div" class="lines">
      <div v-for="(l, i) in lines" :key="`${i}-${l}`" class="line">
        <span class="prompt">›</span> {{ l }}
      </div>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.console {
  position: relative;
  height: 100%;
  border: 4px solid transparent;
  border-radius: 14px;
  background:
    linear-gradient(#11111b, #11111b) padding-box,
    linear-gradient(90deg, #f9e2af, #fab387) border-box;
  padding: 22px 14px 8px;
  color: #cdd6f4;
  text-align: left;
}
.tab {
  position: absolute;
  top: -17px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 14px;
  background: #45475a;
  border: 2px solid #585b70;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
.lines {
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  font-size: 17px;
  line-height: 1.3;
}
.prompt {
  color: #6c7086;
}
.line-enter-active {
  transition: opacity 300ms 350ms, translate 300ms 350ms;
}
.line-enter-from {
  opacity: 0;
  translate: -8px 0;
}
</style>
