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
  height: 0.5em;
  vertical-align: -0.15em;
  border-bottom: 1px solid #2b3948;
}
</style>
