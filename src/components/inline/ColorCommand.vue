<script setup>
import { computed, inject } from 'vue'

import { normalizeColorValue } from '../../latex/color'
import { inlineCommandHandlers, normalizeInlineNode } from '../../latex/inline/commands'
import { INLINE_COMMAND_HANDLERS_KEY } from '../../latex/inline/context'
import { parseInlineContent } from '../../latex/inline/core'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const injectedInlineCommandHandlers = inject(INLINE_COMMAND_HANDLERS_KEY, computed(() => inlineCommandHandlers))
const color = computed(() => normalizeColorValue(props.node.args?.[0] ?? props.node.param ?? ''))
const content = computed(() => props.node.args?.[1] ?? '')
const style = computed(() => (color.value ? { color: color.value } : {}))
const inlineNodes = computed(() =>
  parseInlineContent(content.value, injectedInlineCommandHandlers.value).map((node) =>
    normalizeInlineNode(node, injectedInlineCommandHandlers.value),
  ),
)
</script>

<template>
  <span v-if="color" class="color-command" :style="style">
    <component v-for="inlineNode in inlineNodes" :key="inlineNode.id" :is="inlineNode.component" :node="inlineNode" />
  </span>
  <span v-else class="color-command__fallback">{{ node.raw }}</span>
</template>

<style scoped>
.color-command {
  white-space: inherit;
}

.color-command__fallback {
  white-space: inherit;
}
</style>
