<script setup>
import { computed, inject, unref } from 'vue'
import { createProcessorRegistry } from '../../latex/processors/index.js'

const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
})

const processors = inject('latex-processors', [])
const processorRegistry = computed(() => {
  // 处理 processors 可能是 ref/computed 的情况
  const procs = unref(processors)
  // 使用 createProcessorRegistry 来包含 textProcessor
  return createProcessorRegistry(procs)
})
</script>

<template>
  <span class="content-node">
    <component
      v-for="node in nodes"
      :key="node.id"
      :is="processorRegistry.get(node.type)?.component"
      :node="node"
    />
  </span>
</template>

<style scoped>
.content-node {
  display: inline;
}

.content-node :deep(.enumerate-node),
.content-node :deep(.choices-node-wrap) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>
