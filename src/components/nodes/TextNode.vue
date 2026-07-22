<script setup>
import { computed } from 'vue'

import InlineChildren from '../inline/InlineChildren.vue'
import { normalizeLatexTextForPreview } from '../../utils/latex'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const previewContent = computed(() =>
  props.node.previewContent === undefined
    ? normalizeLatexTextForPreview(props.node.content ?? '')
    : props.node.previewContent,
)
</script>

<template>
  <span class="text-node">
    <InlineChildren :content="previewContent" />
  </span>
</template>

<style scoped>
.text-node {
  color: var(--latex-renderer-text-color);
  line-height: 1.8;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
