<script setup>
import { computed, inject, ref, watch } from 'vue'

import ResizableImage from '../ResizableImage.vue'
import { IMAGE_SRC_RESOLVER_KEY } from '../../latex/imageContext'
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
    @commit-width="handleWidthCommit"
    @commit-alignment="handleAlignmentCommit"
  />
</template>
