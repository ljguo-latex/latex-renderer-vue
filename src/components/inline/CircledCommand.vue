<script setup>
defineProps({
  node: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <span class="circled-command" aria-label="circled">
    <span class="circled-command__digit">{{ node.param ?? '' }}</span>
  </span>
</template>

<style scoped>
.circled-command {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 1.25em;
  height: 1.25em;
  padding: 0 0.15em;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.8em;
  line-height: 1;
  vertical-align: 0.05em;
}

.circled-command__digit {
  display: inline-block;
  line-height: 1;
  transform: translateY(0.08em);
}
</style>
