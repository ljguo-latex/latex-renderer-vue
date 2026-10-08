<script setup>
import ContentNode from './ContentNode.vue'
import TextNode from './TextNode.vue'
import { formatEnumerateLabel } from '../../latex/enumerateLabel'
import { isSimpleTextItem, resolveSimpleTextItem } from '../../latex/itemParser.js'

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
</script>

<template>
  <ol class="enumerate-node">
    <li v-for="(item, index) in node.items" :key="`${node.id}_${index}`" class="enumerate-node__item">
      <span class="enumerate-node__label">
        {{ formatEnumerateLabel(node.options?.label || '(\\arabic*)', index + 1) }}
      </span>

      <!-- 简单文本项（向后兼容） -->
      <TextNode
        v-if="isSimpleTextItem(item)"
        class="enumerate-node__content"
        :node="resolveSimpleTextItem(item, `${node.id}_${index}`, node.inlineContext)"
      />

      <!-- 复杂项（包含嵌套块） -->
      <ContentNode
        v-else
        class="enumerate-node__content"
        :nodes="item"
        :editable="editable"
        @update-node="emit('update-node', $event)"
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
  color: inherit;
  font-weight: 500;
  line-height: 1.8;
}

.enumerate-node__content {
  min-width: 0;
}
</style>
