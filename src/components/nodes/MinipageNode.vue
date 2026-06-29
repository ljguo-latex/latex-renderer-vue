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
  textAlign: props.node.alignment === 'default' ? undefined : props.node.alignment,
}))

const minipageClass = computed(() => ({
  'minipage-node--center': props.node.alignment === 'center',
  'minipage-node--left': props.node.alignment === 'left',
  'minipage-node--right': props.node.alignment === 'right',
}))
</script>

<template>
  <span class="minipage-node" :class="minipageClass" :style="minipageStyle">
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

.minipage-node--center :deep(.resizable-image--default) {
  margin-left: auto;
  margin-right: auto;
}

.minipage-node--right :deep(.resizable-image--default) {
  margin-left: auto;
}
</style>
