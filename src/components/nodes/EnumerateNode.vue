<script setup>
import TextNode from './TextNode.vue'
import { formatEnumerateLabel } from '../../latex/enumerateLabel'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

function createTextNode(content, index) {
  return {
    id: `${props.node.id}_${index}`,
    type: 'text',
    content,
  }
}
</script>

<template>
  <ol class="enumerate-node">
    <li v-for="(item, index) in node.items" :key="`${node.id}_${index}`" class="enumerate-node__item">
      <span class="enumerate-node__label">
        {{ formatEnumerateLabel(node.options?.label || '(\\arabic*)', index + 1) }}
      </span>
      <TextNode class="enumerate-node__content" :node="createTextNode(item, index)" />
    </li>
  </ol>
</template>

<style scoped>
.enumerate-node {
  display: grid;
  gap: 0.2rem;
  padding-left: 0;
  list-style: none;
}

.enumerate-node__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.4rem;
  align-items: start;
}

.enumerate-node__label {
  color: #233241;
  font-weight: 500;
}

.enumerate-node__content {
  min-width: 0;
}
</style>
