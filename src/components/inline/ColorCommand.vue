<script setup>
import { computed } from 'vue'

import InlineChildren from './InlineChildren.vue'
import { normalizeColorValue } from '../../latex/color'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const color = computed(() => normalizeColorValue(props.node.args?.[0] ?? props.node.param ?? ''))
const content = computed(() => props.node.args?.[1] ?? '')
const style = computed(() => (color.value ? { color: color.value } : {}))
</script>

<template>
  <span v-if="color" class="color-command" :style="style">
    <InlineChildren :content="content" />
  </span>
  <span v-else class="color-command__fallback">{{ node.raw }}</span>
</template>

<style scoped>
.color-command {
  white-space: inherit;
}

.color-command__fallback {
  white-space: inherit;
}
</style>
