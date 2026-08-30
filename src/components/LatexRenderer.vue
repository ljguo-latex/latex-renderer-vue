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
  theme: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue'])

const activeProcessors = computed(() => props.processors)
const processorRegistry = computed(() => createProcessorRegistry(activeProcessors.value))
const nodes = computed(() => {
  const parsed = parseLatex(props.modelValue, activeProcessors.value)
  console.log('[LatexRenderer] Parsing LaTeX:', {
    inputLength: props.modelValue.length,
    nodesCount: parsed.length,
    nodeTypes: parsed.map(n => n.type)
  })
  return parsed
})
const themeStyles = computed(() => {
  const styles = {
    '--latex-renderer-theme-color': props.theme?.color || '#000000',
    '--latex-renderer-text-color': props.theme?.textColor || '#182025',
  }
  if (props.theme?.fontFamily) {
    styles['--latex-renderer-font-family'] = props.theme.fontFamily
  }
  if (props.theme?.fontSize) {
    styles['--latex-renderer-font-size'] = props.theme.fontSize
  }
  return styles
})

provide(INLINE_COMMAND_HANDLERS_KEY, computed(() => props.inlineCommands))
provide(IMAGE_SRC_RESOLVER_KEY, computed(() => props.imageSrcResolver))
provide('latex-processors', activeProcessors)

function handleNodeUpdate(nextNode) {
  const nextNodes = replaceNodeDeep(nodes.value, nextNode)
  const serialized = serializeLatex(nextNodes, activeProcessors.value)

  console.log('[LatexRenderer] handleNodeUpdate called:', {
    nodeType: nextNode.type,
    nodeId: nextNode.id,
    originalValue: props.modelValue,
    serializedValue: serialized,
    originalLength: props.modelValue.length,
    serializedLength: serialized.length,
    changed: serialized !== props.modelValue
  })

  // Debug: 只在内容真正改变时才触发更新
  if (serialized !== props.modelValue) {
    console.log('[LatexRenderer] Emitting update:modelValue')
    emit('update:modelValue', serialized)
  } else {
    console.log('[LatexRenderer] Content unchanged, skipping update')
  }
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
  font-size: var(--latex-renderer-font-size);
}
</style>
