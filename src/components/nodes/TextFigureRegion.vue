<script setup>
import { computed, provide } from 'vue'

import ContentNode from './ContentNode.vue'
import { CHOICE_IMAGE_WIDTH_KEY, TEXT_FIGURE_SLOT_KEY } from '../../latex/imageContext.js'

// 图文组的一栏。每栏单独 provide，避免图栏的版式上下文泄漏到文字栏里的图片
const props = defineProps({
  nodes: { type: Array, required: true },
  editable: { type: Boolean, default: false },
  slotContext: { type: Object, default: null },
  // 图栏中图片 \linewidth 的像素基准（整行宽）；0 表示按父容器测量
  imageWidth: { type: Number, default: 0 },
})

const emit = defineEmits(['update-node'])

provide(TEXT_FIGURE_SLOT_KEY, computed(() => props.slotContext))
provide(CHOICE_IMAGE_WIDTH_KEY, computed(() => props.imageWidth))
</script>

<template>
  <ContentNode :nodes="nodes" :editable="editable" @update-node="emit('update-node', $event)" />
</template>
