<script setup>
import { computed, provide } from 'vue'

import { parseLatex, replaceNodeDeep, serializeLatex } from '../latex/core'
import { IMAGE_SRC_RESOLVER_KEY } from '../latex/imageContext'
import { inlineCommandHandlers as defaultInlineCommandHandlers } from '../latex/inline/commands'
import { INLINE_COMMAND_HANDLERS_KEY } from '../latex/inline/context'
import { createProcessorRegistry, defaultProcessors } from '../latex/processors'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  editableImages: {
    type: Boolean,
    default: false,
  },
  processors: {
    type: Array,
    default: () => defaultProcessors,
  },
  inlineCommands: {
    type: Object,
    default: () => defaultInlineCommandHandlers,
  },
  imageSrcResolver: {
    type: Function,
    default: ({ src }) => src,
  },
  theme: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue'])

const activeProcessors = computed(() => props.processors)
const processorRegistry = computed(() => createProcessorRegistry(activeProcessors.value))
const nodes = computed(() => parseLatex(props.modelValue, activeProcessors.value))
const themeStyles = computed(() => ({
  '--latex-renderer-theme-color': props.theme?.color || '#000000',
  '--latex-renderer-text-color': props.theme?.textColor || '#182025',
  '--latex-renderer-font-family': props.theme?.fontFamily || 'inherit',
}))

provide(INLINE_COMMAND_HANDLERS_KEY, computed(() => props.inlineCommands))
provide(IMAGE_SRC_RESOLVER_KEY, computed(() => props.imageSrcResolver))
provide('latex-processors', activeProcessors)

function handleNodeUpdate(nextNode) {
  const nextNodes = replaceNodeDeep(nodes.value, nextNode)
  emit('update:modelValue', serializeLatex(nextNodes, activeProcessors.value))
}
</script>

<template>
  <div class="latex-renderer" :style="themeStyles">
    <template v-for="node in nodes" :key="node.id">
      <component
        :is="processorRegistry.get(node.type)?.component"
        :node="node"
        :editable="props.editableImages"
        @update-node="handleNodeUpdate"
      />
    </template>
  </div>
</template>

<style scoped>
.latex-renderer {
  font-family: var(--latex-renderer-font-family);
}
</style>
