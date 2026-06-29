<script setup>
import { computed } from 'vue'

import { parseLatexLength } from '../../latex/length'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const length = computed(() => parseLatexLength(props.node.param ?? ''))
const style = computed(() => (length.value.css ? { width: length.value.css } : {}))
</script>

<template>
  <span
    v-if="length.css"
    class="hspace-command"
    :style="style"
    aria-hidden="true"
  ></span>
  <span v-else class="hspace-command__fallback">{{ node.raw }}</span>
</template>

<style scoped>
.hspace-command {
  display: inline-block;
  height: 0;
  line-height: 0;
  vertical-align: baseline;
  white-space: normal;
}

.hspace-command__fallback {
  white-space: inherit;
}
</style>
