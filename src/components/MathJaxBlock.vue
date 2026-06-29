<script setup>
import { onMounted, ref, watch } from 'vue'

import { typesetMath } from '../composables/useMathJax'

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
})

const root = ref(null)
const hasRenderError = ref(false)

async function renderMath() {
  try {
    await typesetMath(root.value, props.content)
    hasRenderError.value = false
  } catch (error) {
    hasRenderError.value = true

    if (root.value) {
      root.value.textContent = props.content
    }

    console.error(error)
  }
}

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
  color: var(--latex-renderer-text-color);
  line-height: 1.8;
  word-break: break-word;
}

.mathjax-block :deep(.circled-math) {
  color: var(--latex-renderer-theme-color) !important;
}

.mathjax-block :deep(.blank-math) {
  color: var(--latex-renderer-theme-color) !important;
}

.mathjax-block :deep(.math-blank-rule mjx-mspace) {
  background-color: var(--latex-renderer-theme-color) !important;
}

/* 确保数学公式中的带圈数字（包括圆圈和里面的数字）也统一应用主题色 */
.mathjax-block :deep(mjx-menclose),
.mathjax-block :deep(.math-circled) {
  color: var(--latex-renderer-theme-color) !important;
}

.mathjax-block :deep(mjx-menclose svg),
.mathjax-block :deep(mjx-menclose svg ellipse),
.mathjax-block :deep(mjx-menclose svg path),
.mathjax-block :deep(mjx-menclose [stroke]) {
  stroke: var(--latex-renderer-theme-color) !important;
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

.mathjax-block--error {
  color: #9f2f28;
}
</style>
