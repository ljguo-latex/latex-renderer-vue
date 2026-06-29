<script setup>
import { computed } from 'vue'

import ContentNode from './ContentNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-node'])

const textAlign = computed(() => {
  if (props.node.environmentName === 'flushleft') {
    return 'left'
  }

  if (props.node.environmentName === 'flushright') {
    return 'right'
  }

  return 'center'
})
</script>

<template>
  <div class="center-node" :style="{ textAlign }">
    <ContentNode :nodes="node.children || []" :editable="editable" @update-node="emit('update-node', $event)" />
  </div>
</template>

<style scoped>
.center-node {
  display: block;
  width: 100%;
  margin: 0.65rem 0;
}

.center-node :deep(.content-node) {
  display: block;
}
</style>
