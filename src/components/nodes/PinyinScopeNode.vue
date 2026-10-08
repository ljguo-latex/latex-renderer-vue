<script setup>
import { computed } from 'vue'
import PinyinText from '../pinyin/PinyinText.vue'
import { createPinyinLines } from '../../latex/pinyin/scope.js'
import { parsePinyinSetup, resolvePinyinOptions } from '../../latex/pinyin/options.js'

const props = defineProps({ node: { type: Object, required: true } })
const options = computed(() => parsePinyinSetup(props.node.optionString, resolvePinyinOptions(props.node.inlineContext?.pinyinOptions)))
const lines = computed(() => createPinyinLines(props.node.body, options.value))
</script>

<template>
  <div class="latex-pinyin-scope" :style="{ textAlign: options.align }">
    <div v-for="(line, index) in lines" :key="index" class="latex-pinyin-line" :style="{ textAlign: line.align }">
      <PinyinText v-for="(run, runIndex) in line.runs" :key="runIndex" :tokens="run.tokens" :options="run.options" />
    </div>
  </div>
</template>
