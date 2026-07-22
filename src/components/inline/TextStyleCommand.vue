<script setup>
import { computed } from 'vue'

import InlineChildren from './InlineChildren.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const styleClass = computed(() => {
  const style = props.node.handler?.style || props.node.style
  return style ? `inline-style-command inline-style-command--${style}` : 'inline-style-command'
})

const content = computed(() => props.node.args?.[0] ?? '')
</script>

<template>
  <span :class="styleClass">
    <InlineChildren :content="content" />
  </span>
</template>

<style scoped>
.inline-style-command {
  white-space: inherit;
}

.inline-style-command--bold {
  font-weight: 700;
}

.inline-style-command--italic {
  font-style: italic;
}

.inline-style-command--underline {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.inline-style-command--strike {
  text-decoration: line-through;
}

.inline-style-command--overline {
  text-decoration: overline;
}

.inline-style-command--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.inline-style-command--sans {
  font-family: system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

.inline-style-command--serif {
  font-family: "Times New Roman", Times, serif;
}

.inline-style-command--sup {
  vertical-align: super;
  font-size: 0.75em;
  line-height: 1;
}

.inline-style-command--sub {
  vertical-align: sub;
  font-size: 0.75em;
  line-height: 1;
}
</style>
