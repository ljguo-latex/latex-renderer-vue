<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const style = computed(() => (props.node.length?.css ? { height: props.node.length.css } : {}))
const fallbackText = computed(() => props.node.original || `\\vspace{${props.node.lengthString || ''}}`)
</script>

<template>
  <div
    v-if="node.length?.css"
    class="vspace-node"
    :style="style"
    aria-hidden="true"
  ></div>
  <span v-else class="vspace-node__fallback">{{ fallbackText }}</span>
</template>

<style scoped>
.vspace-node {
  display: block;
  line-height: 0;
  min-height: 0;
}

.vspace-node__fallback {
  color: var(--latex-renderer-text-color);
  white-space: pre-wrap;
}
</style>
