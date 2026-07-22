<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

// Unescaping \{ \} must wait until this leaf: doing it before inline parsing
// would turn the literal braces into group/argument delimiters.
const displayContent = computed(() => (props.node.content ?? '').replace(/\\([{}])/g, '$1'))
</script>

<template>
  <span class="inline-text">{{ displayContent }}</span>
</template>

<style scoped>
.inline-text {
  white-space: inherit;
}
</style>
