<script setup>
import { computed, inject, ref, watch } from 'vue'

import ResizableImage from '../ResizableImage.vue'
import { IMAGE_SRC_RESOLVER_KEY, IMAGE_REPLACER_KEY, IMAGE_EDITOR_KEY } from '../../latex/imageContext'
import { updateImageSegmentAlignment, updateImageSegmentWidth } from '../../utils/latex'

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
const imageSrcResolver = inject(IMAGE_SRC_RESOLVER_KEY, computed(() => ({ src }) => src))
const resolvedSrc = ref(props.node.src)
const imageReplacer = inject(IMAGE_REPLACER_KEY, computed(() => null))
const imageEditor = inject(IMAGE_EDITOR_KEY, computed(() => null))
const replacing = ref(false)
const replacementError = ref('')

async function handleReplace(file) {
  if (!props.editable || !imageReplacer.value || replacing.value) return
  const context = { src: props.node.src, node: props.node, file }
  replacing.value = true
  replacementError.value = ''
  try {
    await imageReplacer.value(context)
  } catch (error) {
    replacementError.value = error?.message || '图片替换失败，请重试'
  } finally {
    replacing.value = false
  }
}

async function handleEdit() {
  if (!props.editable || !imageEditor.value || replacing.value) return
  replacing.value = true
  replacementError.value = ''
  try {
    await imageEditor.value({ src: props.node.src, node: props.node, url: resolvedSrc.value })
  } catch (error) {
    replacementError.value = error?.message || '图片工具打开失败'
  } finally { replacing.value = false }
}

let resolutionId = 0

async function syncResolvedSrc() {
  const currentResolutionId = ++resolutionId

  try {
    const nextSrc = await imageSrcResolver.value({
      src: props.node.src,
      node: props.node,
    })

    if (currentResolutionId !== resolutionId) {
      return
    }

    resolvedSrc.value = typeof nextSrc === 'string' && nextSrc.trim() ? nextSrc : props.node.src
  } catch {
    if (currentResolutionId !== resolutionId) {
      return
    }

    resolvedSrc.value = props.node.src
  }
}

watch(
  () => [props.node.src, imageSrcResolver.value],
  () => {
    resolvedSrc.value = props.node.src
    syncResolvedSrc()
  },
  { immediate: true },
)

function handleWidthCommit({ widthPx }) {
  emit('update-node', updateImageSegmentWidth(props.node, widthPx))
}

function handleAlignmentCommit({ alignment }) {
  emit('update-node', updateImageSegmentAlignment(props.node, alignment))
}
</script>

<template>
  <ResizableImage
    :id="node.id"
    :src="resolvedSrc"
    :options="node.options"
    :alignment="node.alignment"
    :editable="editable"
    :replaceable="Boolean(imageReplacer)"
    :processable="Boolean(imageEditor)"
    :replacing="replacing"
    :replacement-error="replacementError"
    @replace-image="handleReplace"
    @edit-image="handleEdit"
    @commit-width="handleWidthCommit"
    @commit-alignment="handleAlignmentCommit"
  />
</template>
