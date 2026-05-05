<script setup>
import { computed } from 'vue'

import MathJaxBlock from '../MathJaxBlock.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const renderContent = computed(() => {
  if (props.node.original) {
    return props.node.original
  }

  const optionBlock = props.node.optionString ? `[${props.node.optionString}]` : ''
  return `\\begin{${props.node.environmentName}}${optionBlock}${props.node.body || ''}\\end{${props.node.environmentName}}`
})
</script>

<template>
  <div class="math-environment-node">
    <MathJaxBlock :content="renderContent" />
  </div>
</template>

<style scoped>
.math-environment-node {
  display: block;
  width: 100%;
  margin: 0.65rem 0;
  overflow-x: auto;
}

.math-environment-node :deep(.mathjax-block) {
  min-width: max-content;
}
</style>
