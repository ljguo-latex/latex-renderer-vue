<script setup>
import { computed, inject } from 'vue'

import { parseInlineContent } from '../../latex/inline/core'
import { inlineCommandHandlers, normalizeInlineNode } from '../../latex/inline/commands'
import { INLINE_COMMAND_HANDLERS_KEY } from '../../latex/inline/context'
import { normalizeLatexTextForPreview } from '../../utils/latex'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const injectedInlineCommandHandlers = inject(INLINE_COMMAND_HANDLERS_KEY, computed(() => inlineCommandHandlers))

const inlineNodes = computed(() =>
  parseInlineContent(
    normalizeLatexTextForPreview(props.node.content),
    Object.keys(injectedInlineCommandHandlers.value),
  ).map((node) => normalizeInlineNode(node, injectedInlineCommandHandlers.value)),
)
</script>

<template>
  <span class="text-node">
    <component v-for="inlineNode in inlineNodes" :key="inlineNode.id" :is="inlineNode.component" :node="inlineNode" />
  </span>
</template>

<style scoped>
.text-node {
  color: #182025;
  line-height: 1.8;
  word-break: break-word;
}
</style>
