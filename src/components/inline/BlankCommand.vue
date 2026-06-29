<script setup>
defineProps({
  node: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <span class="blank-command" aria-label="blank"></span>
</template>

<style scoped>
.blank-command {
  display: inline-block;
  min-width: 4.5em;
  height: 0;
  vertical-align: baseline;
  border-bottom: 2px solid var(--latex-renderer-theme-color);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
