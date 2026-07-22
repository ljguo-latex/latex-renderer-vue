<script setup>
import { computed, inject } from 'vue'

import { inlineCommandHandlers, normalizeInlineNode } from '../../latex/inline/commands'
import { INLINE_COMMAND_HANDLERS_KEY } from '../../latex/inline/context'
import { parseInlineContent } from '../../latex/inline/core'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const injectedHandlers = inject(INLINE_COMMAND_HANDLERS_KEY, computed(() => inlineCommandHandlers))

const inlineNodes = computed(() =>
  parseInlineContent(props.content ?? '', injectedHandlers.value).map((node) =>
    normalizeInlineNode(node, injectedHandlers.value),
  ),
)
</script>

<template>
  <component v-for="inlineNode in inlineNodes" :key="inlineNode.id" :is="inlineNode.component" :node="inlineNode" />
</template>
