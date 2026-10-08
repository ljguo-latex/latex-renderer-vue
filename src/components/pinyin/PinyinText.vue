<script setup>
defineProps({
  tokens: { type: Array, required: true },
  options: { type: Object, required: true },
})
</script>

<template>
  <span class="latex-pinyin-text">
    <template v-for="(token, index) in tokens" :key="index">
      <ruby v-if="token.pinyin">{{ token.text }}<rp v-if="options.fallback">(</rp><rt :style="{ color: options.color, fontSize: `${options.ratio}em` }">{{ token.pinyin }}</rt><rp v-if="options.fallback">)</rp></ruby>
      <template v-else>{{ token.text }}</template>
    </template>
  </span>
</template>

<style>
/* Shared class also wraps DOM nodes emitted by the MathJax adapter. */
.latex-pinyin-text {
  white-space: pre-wrap;
  line-height: 2;
}
.latex-pinyin-text ruby {
  ruby-align: center;
  ruby-position: over;
}
.latex-pinyin-text rt {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-weight: 400;
  line-height: normal;
  text-decoration: none;
}
.latex-pinyin-scope {
  display: block;
  line-height: 2.4;
}
.latex-pinyin-line {
  display: block;
  min-height: 2.4em;
  white-space: pre-wrap;
}
</style>
