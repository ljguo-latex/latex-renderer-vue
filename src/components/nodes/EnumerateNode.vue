<script setup>
import ContentNode from './ContentNode.vue'
import TextNode from './TextNode.vue'
import { formatEnumerateLabel } from '../../latex/enumerateLabel'
import { inject } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const processors = inject('latex-processors', [])

function createTextNode(content, index) {
  return {
    id: `${props.node.id}_${index}`,
    type: 'text',
    content,
  }
}

// 判断是否为简单文本项
function isSimpleItem(item) {
  return typeof item === 'string' ||
    (Array.isArray(item) && item.length === 1 && item[0].type === 'text')
}

// 提取简单文本内容
function getSimpleContent(item) {
  if (typeof item === 'string') return item
  if (Array.isArray(item) && item.length === 1 && item[0].type === 'text') {
    return item[0].content
  }
  return null
}
</script>

<template>
  <ol class="enumerate-node">
    <li v-for="(item, index) in node.items" :key="`${node.id}_${index}`" class="enumerate-node__item">
      <span class="enumerate-node__label">
        {{ formatEnumerateLabel(node.options?.label || '(\\arabic*)', index + 1) }}
      </span>

      <!-- 简单文本项（向后兼容） -->
      <TextNode
        v-if="isSimpleItem(item)"
        class="enumerate-node__content"
        :node="createTextNode(getSimpleContent(item), index)"
      />

      <!-- 复杂项（包含嵌套块） -->
      <ContentNode
        v-else
        class="enumerate-node__content"
        :nodes="item"
      />
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
  color: var(--latex-renderer-theme-color);
  font-weight: 500;
  line-height: 1.8;
}

.enumerate-node__content {
  min-width: 0;
}
</style>
