<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const isDoubleDigit = computed(() => String(props.node.param ?? '').trim().length > 1)
</script>

<template>
  <span
    class="circled-command"
    :class="{ 'circled-command--double-digit': isDoubleDigit }"
    aria-label="circled"
  >
    <span class="circled-command__digit">{{ node.param ?? '' }}</span>
  </span>
</template>

<style scoped>
.circled-command {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.28em;
  height: 1.28em;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--latex-renderer-theme-color);
  border-radius: 50%;
  color: var(--latex-renderer-theme-color);
  font-size: 0.82em;
  line-height: 1;
  vertical-align: middle;
  text-align: center;
  overflow: hidden;
  flex-shrink: 0;
}

.circled-command--double-digit {
  font-size: 0.65em;
  width: 1.6em;
  height: 1.6em;
}

.circled-command__digit {
  display: inline-block;
  line-height: 1;
}
</style>
