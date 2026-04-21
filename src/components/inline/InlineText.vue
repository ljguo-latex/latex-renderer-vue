<script setup>
defineProps({
  node: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <span class="inline-text">{{ node.content }}</span>
</template>

<style scoped>
.inline-text {
  white-space: inherit;
}
</style>
