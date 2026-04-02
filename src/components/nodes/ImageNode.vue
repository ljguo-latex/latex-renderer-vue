<script setup>
import ResizableImage from '../ResizableImage.vue'
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
    :src="node.src"
    :options="node.options"
    :alignment="node.alignment"
    :editable="editable"
    @commit-width="handleWidthCommit"
    @commit-alignment="handleAlignmentCommit"
  />
</template>
