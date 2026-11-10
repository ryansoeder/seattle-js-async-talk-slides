<script setup lang="ts">
/**
 * The EventLoop diagram's Task Queue box, split into empty horizontal lanes: one per
 * task source. The HTML spec gives an event loop "one or more task queues"; the browser
 * picks which one to take the next task from. Same colors and type as EventLoop.vue.
 */
withDefaults(defineProps<{
  /** How many lanes to draw */
  lanes?: number
}>(), {
  lanes: 4,
})
</script>

<template>
  <div class="card">
    <div class="panel">
      <div class="label">Task Queue</div>
      <div class="lanes">
        <div v-for="n in lanes" :key="n" class="lane" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  --pour: #96d3d1;     /* the Task Queue's light teal, as in EventLoop.vue */
  --charcoal: #4f5050;
  --paper: #eff1f5;
  --white: #ffffff;
  --condensed: 'DIN Condensed', 'Barlow Condensed', 'Arial Narrow', sans-serif;

  width: 860px;
  padding: 14px;
  background: var(--paper);
  text-align: left;
}

.panel {
  position: relative;
  padding: 0 16px;
  background: var(--pour);
}

/* Charcoal tag flush with the block's top-left corner, as in EventLoop.vue.
   Laid over the top lane so every lane is the same height. */
.label {
  position: absolute;
  top: 0;
  left: 0;
  padding: 6px 12px 3px;
  background: var(--charcoal);
  color: var(--white);
  font-family: var(--condensed);
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.lane {
  height: 112px;
}
/* Charcoal rules between the lanes: one queue per task source */
.lane + .lane {
  border-top: 3px solid var(--charcoal);
}
</style>
