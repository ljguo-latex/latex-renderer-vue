<script setup>
import { computed, provide } from 'vue'

import { parseLatex, replaceNodeDeep, serializeLatex } from '../latex/core'
import { IDENTITY_IMAGE_SRC_RESOLVER, IMAGE_SRC_RESOLVER_KEY } from '../latex/imageContext'
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
    default: () => IDENTITY_IMAGE_SRC_RESOLVER,
  },
})

const emit = defineEmits(['update:modelValue'])

const activeProcessors = computed(() => props.processors)
const processorRegistry = computed(() => createProcessorRegistry(activeProcessors.value))
const nodes = computed(() => parseLatex(props.modelValue, activeProcessors.value))

provide(INLINE_COMMAND_HANDLERS_KEY, computed(() => props.inlineCommands))
provide(IMAGE_SRC_RESOLVER_KEY, computed(() => props.imageSrcResolver))
provide('latex-processors', activeProcessors)

function handleNodeUpdate(nextNode) {
  const nextNodes = replaceNodeDeep(nodes.value, nextNode)
  const serialized = serializeLatex(nextNodes, activeProcessors.value)

  // 内容未变化时不回写，避免预览覆盖编辑器里的原始写法
  if (serialized !== props.modelValue) {
    emit('update:modelValue', serialized)
  }
}
</script>

<template>
  <div class="latex-renderer">
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
  font-family: var(--latex-renderer-font-family, inherit);
  font-size: var(--latex-renderer-font-size, inherit);
}
</style>
