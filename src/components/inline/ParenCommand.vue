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
  align-items: flex-end;
  gap: 0.12em;
  vertical-align: -0.08em;
}

.paren-command__mark {
  color: #243240;
  font-size: 1.05em;
  line-height: 1;
}

.paren-command__space {
  display: inline-block;
  min-width: 2em;
  /* border-bottom: 2px solid rgba(43, 57, 72, 0.45); */
  transform: translateY(-0.08em);
}
</style>
