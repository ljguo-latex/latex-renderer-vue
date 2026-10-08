<script setup>
import { computed } from 'vue'
import PinyinText from '../pinyin/PinyinText.vue'
import { createPinyinTokens } from '../../latex/pinyin/tokens.js'
import { resolvePinyinOptions } from '../../latex/pinyin/options.js'

const props = defineProps({ node: { type: Object, required: true } })
const tokens = computed(() => createPinyinTokens(props.node.param ?? ''))
const options = computed(() => resolvePinyinOptions(props.node.context?.pinyinOptions))
</script>

<template>
  <PinyinText :tokens="tokens" :options="options" />
</template>
