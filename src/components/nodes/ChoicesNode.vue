<script setup>
import TextNode from './TextNode.vue'

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

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
  <ol class="choices-node">
    <li v-for="(item, index) in node.items" :key="`${node.id}_${index}`" class="choices-node__item">
      <span class="choices-node__label">{{ LABELS[index] || `${index + 1}` }}.</span>
      <TextNode class="choices-node__content" :node="createTextNode(item, index)" />
    </li>
  </ol>
</template>

<style scoped>
.choices-node {
  display: grid;
  gap: 0.2rem;
  padding-left: 0;
  list-style: none;
}

.choices-node__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.4rem;
  align-items: start;
}

.choices-node__label {
  color: var(--latex-renderer-theme-color);
  font-weight: 500;
}

.choices-node__content {
  min-width: 0;
}
</style>
