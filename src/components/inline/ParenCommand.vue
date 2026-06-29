<script setup>
defineProps({
  node: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <span class="paren-command" aria-label="paren">
    <span class="paren-command__mark">(</span>
    <span class="paren-command__space"></span>
    <span class="paren-command__mark">)</span>
  </span>
</template>

<style scoped>
.paren-command {
  display: inline-flex;
  align-items: center;
  gap: 0.12em;
  vertical-align: middle;
  white-space: nowrap;
  flex-shrink: 0;
}

.paren-command__mark {
  color: var(--latex-renderer-theme-color);
  font-size: 1.15em;
  line-height: 1;
  font-weight: 600;
  user-select: none;
}

.paren-command__space {
  display: inline-block;
  min-width: 2em;
  flex-shrink: 0;
}
</style>
