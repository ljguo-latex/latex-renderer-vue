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
  color: #182025;
  line-height: 1.8;
  word-break: break-word;
}

.mathjax-block--error {
  color: #9f2f28;
}
</style>
