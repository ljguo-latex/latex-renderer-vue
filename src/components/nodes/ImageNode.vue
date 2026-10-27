<script setup>
import { computed, inject, ref, watch } from 'vue'

import ResizableImage from '../ResizableImage.vue'
import { IMAGE_SRC_RESOLVER_KEY, IMAGE_REPLACER_KEY, IMAGE_EDITOR_KEY, IMAGE_ENHANCER_KEY, LAYOUT_EDITOR_KEY, TEXT_FIGURE_SLOT_KEY } from '../../latex/imageContext'
import { updateImageSegmentAlignment, updateImageSegmentWidthPercent } from '../../utils/latex'

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
const imageEnhancer = inject(IMAGE_ENHANCER_KEY, computed(() => null))
const layoutEditor = inject(LAYOUT_EDITOR_KEY, null)
const textFigureSlot = inject(TEXT_FIGURE_SLOT_KEY, computed(() => null))
// inside：位于图文组的图栏；block：独占一行且可与相邻段落组成图文组
const layoutMode = computed(() => {
  if (!props.editable) return null
  if (textFigureSlot.value) return 'inside'
  return layoutEditor?.canWrapImage(props.node.id) ? 'block' : null
})
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

async function handleEnhance() {
  if (!props.editable || !imageEnhancer.value || replacing.value) return
  replacing.value = true
  replacementError.value = ''
  try {
    await imageEnhancer.value({ src: props.node.src, node: props.node, url: resolvedSrc.value })
  } catch (error) {
    replacementError.value = error?.message || '图片清晰化工具打开失败'
  } finally { replacing.value = false }
}

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

function handleWidthCommit({ percent }) {
  emit('update-node', updateImageSegmentWidthPercent(props.node, percent))
}

function handleAlignmentCommit({ alignment }) {
  emit('update-node', updateImageSegmentAlignment(props.node, alignment))
}

function handleLayoutCommit({ side }) {
  const slot = textFigureSlot.value

  if (slot) {
    if (side === 'block') slot.unwrap()
    else if (side !== slot.side) slot.setSide(side)
    return
  }

  if (side !== 'block') layoutEditor?.wrapImage(props.node.id, side)
}

function handleVerticalCommit({ vertical }) {
  textFigureSlot.value?.setVertical(vertical)
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
    :enhanceable="Boolean(imageEnhancer)"
    :replacing="replacing"
    :replacement-error="replacementError"
    :layout-mode="layoutMode"
    :layout-side="textFigureSlot?.side || 'block'"
    :layout-vertical="textFigureSlot?.vertical || null"
    @replace-image="handleReplace"
    @edit-image="handleEdit"
    @enhance-image="handleEnhance"
    @commit-width="handleWidthCommit"
    @commit-alignment="handleAlignmentCommit"
    @commit-layout="handleLayoutCommit"
    @commit-vertical="handleVerticalCommit"
  />
</template>
