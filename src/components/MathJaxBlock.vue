<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { clearMath, typesetMath } from '../composables/useMathJax'

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
})

const root = ref(null)
const hasRenderError = ref(false)

let renderId = 0

async function renderMath() {
  const currentId = ++renderId
  try {
    await typesetMath(root.value, props.content)
    if (currentId === renderId) hasRenderError.value = false
  } catch (error) {
    if (currentId !== renderId) return
    hasRenderError.value = true

    console.error(error)
  }
}

onBeforeUnmount(() => {
  renderId += 1
  clearMath(root.value)
})

onMounted(() => {
  renderMath()
})

watch(
  () => props.content,
  () => {
    renderMath()
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="root" class="mathjax-block" :class="{ 'mathjax-block--error': hasRenderError }"></div>
</template>

<style scoped>
.mathjax-block {
  min-height: 1.6em;
  white-space: pre-wrap;
  color: inherit;
  line-height: 1.8;
  word-break: break-word;
}

.mathjax-block :deep(.math-blank-rule mjx-mspace) {
  background-color: currentColor !important;
}

/* 圆圈线条跟随所在公式的文字颜色。 */
.mathjax-block :deep(mjx-menclose svg),
.mathjax-block :deep(mjx-menclose svg ellipse),
.mathjax-block :deep(mjx-menclose svg path),
.mathjax-block :deep(mjx-menclose [stroke]) {
  stroke: currentColor !important;
}

.mathjax-block :deep(.math-circled) {
  font-weight: inherit !important;
}

/* 优化行内数学公式在中文段落中的基线对齐 */
.mathjax-block :deep(mjx-container[jax="CHTML"]:not([display="true"])) {
  position: relative;
  /* 针对中文字符高度，微调行内公式相对基线上移，防止公式看起来偏下沉 */
  top: -0.05em;
  /* 适当限制行内公式带来的行高撑开 */
  vertical-align: middle;
  line-height: 0;
  /* 增加左右微小间距，使公式与中文字符之间有呼吸感 */
  margin: 0 0.1em;
}
</style>
