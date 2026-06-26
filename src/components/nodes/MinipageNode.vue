<script setup>
import { computed } from 'vue'

import ContentNode from './ContentNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const minipageStyle = computed(() => ({
  width: props.node.width?.css || 'auto',
}))
</script>

<template>
  <span class="minipage-node" :style="minipageStyle">
    <ContentNode :nodes="node.children || []" />
  </span>
</template>

<style scoped>
.minipage-node {
  display: inline-block;
  max-width: 100%;
  vertical-align: top;
  min-width: 0;
  box-sizing: border-box;
}

.minipage-node :deep(.content-node) {
  display: block;
}
</style>
