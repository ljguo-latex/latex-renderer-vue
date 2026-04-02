<script setup>
import MathJaxBlock from '../MathJaxBlock.vue'

defineProps({
  node: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <MathJaxBlock class="inline-math-text" :content="node.content" />
</template>

<style scoped>
.inline-math-text {
  display: inline;
}
</style>
