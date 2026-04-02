<script setup>
import { computed, provide } from 'vue'

import { parseLatex, replaceNode, serializeLatex } from '../latex/core'
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
})

const emit = defineEmits(['update:modelValue'])

const activeProcessors = computed(() => props.processors)
const processorRegistry = computed(() => createProcessorRegistry(activeProcessors.value))
const nodes = computed(() => parseLatex(props.modelValue, activeProcessors.value))

provide(INLINE_COMMAND_HANDLERS_KEY, computed(() => props.inlineCommands))
provide(IMAGE_SRC_RESOLVER_KEY, computed(() => props.imageSrcResolver))

function isNodeEditable(node) {
  const processor = processorRegistry.value.get(node.type)
  return processor?.isEditable?.({
    editableImages: props.editableImages,
    node,
  }) || false
}

function handleNodeUpdate(nextNode) {
  const nextNodes = replaceNode(nodes.value, nextNode)
  emit('update:modelValue', serializeLatex(nextNodes, activeProcessors.value))
}
</script>

<template>
  <div class="latex-renderer">
    <template v-for="node in nodes" :key="node.id">
      <component
        :is="processorRegistry.get(node.type)?.component"
        :node="node"
        :editable="isNodeEditable(node)"
        @update-node="handleNodeUpdate"
      />
    </template>
  </div>
</template>

<style scoped>
</style>
