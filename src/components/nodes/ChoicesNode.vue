<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ContentNode from './ContentNode.vue'
import TextNode from './TextNode.vue'

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

const processors = inject('latex-processors', [])

const container = ref(null)
const measureRoot = ref(null)
const containerWidth = ref(0)
const columnCount = ref(1)

let resizeObserver = null
let mutationObserver = null
let measureFrame = null

function createTextNode(content, index, prefix = 'text') {
  return {
    id: `${props.node.id}_${prefix}_${index}`,
    type: 'text',
    content,
  }
}

// 判断是否为简单文本项
function isSimpleItem(item) {
  return typeof item === 'string' ||
    (Array.isArray(item) && item.length === 1 && item[0].type === 'text')
}

// 提取简单文本内容
function getSimpleContent(item) {
  if (typeof item === 'string') return item
  if (Array.isArray(item) && item.length === 1 && item[0].type === 'text') {
    return item[0].content
  }
  return null
}

function resolveColumnCount(longestItemWidth, width, itemCount) {
  if (!itemCount || itemCount === 1 || !width || !longestItemWidth) {
    return 1
  }

  if (longestItemWidth < width / 4) {
    return Math.min(4, itemCount)
  }

  if (longestItemWidth < width / 2) {
    return Math.min(2, itemCount)
  }

  return 1
}

function updateContainerWidth() {
  containerWidth.value = container.value?.getBoundingClientRect().width || 0
}

function measureChoices() {
  if (!measureRoot.value) {
    columnCount.value = 1
    return
  }

  const widths = Array.from(measureRoot.value.querySelectorAll('[data-choice-measure-item]')).map(
    (element) => element.getBoundingClientRect().width,
  )

  const longestItemWidth = widths.length ? Math.max(...widths) : 0

  columnCount.value = resolveColumnCount(longestItemWidth, containerWidth.value, props.node.items?.length || 0)
}

function scheduleMeasure() {
  if (measureFrame) {
    window.cancelAnimationFrame(measureFrame)
  }

  measureFrame = window.requestAnimationFrame(async () => {
    measureFrame = null
    await nextTick()
    updateContainerWidth()
    measureChoices()
  })
}

const effectiveColumnCount = computed(() => Math.max(1, Math.min(columnCount.value, props.node.items?.length || 1)))
const choicesStyle = computed(() => ({
  gridTemplateColumns: `repeat(${effectiveColumnCount.value}, minmax(0, 1fr))`,
}))

watch(
  () => props.node.items,
  () => {
    scheduleMeasure()
  },
  { deep: true },
)

onMounted(() => {
  updateContainerWidth()
  scheduleMeasure()

  resizeObserver = new ResizeObserver(() => {
    updateContainerWidth()
    scheduleMeasure()
  })

  if (container.value) {
    resizeObserver.observe(container.value)
  }

  mutationObserver = new MutationObserver(() => {
    scheduleMeasure()
  })

  if (measureRoot.value) {
    mutationObserver.observe(measureRoot.value, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()

  if (measureFrame) {
    window.cancelAnimationFrame(measureFrame)
  }
})
</script>

<template>
  <div ref="container" class="choices-node-wrap">
    <ol class="choices-node" :style="choicesStyle">
      <li v-for="(item, index) in node.items" :key="`${node.id}_${index}`" class="choices-node__item">
        <span class="choices-node__label">{{ LABELS[index] || `${index + 1}` }}.</span>

        <!-- 简单文本项（向后兼容） -->
        <TextNode
          v-if="isSimpleItem(item)"
          class="choices-node__content"
          :node="createTextNode(getSimpleContent(item), index)"
        />

        <!-- 复杂项（包含嵌套块） -->
        <ContentNode
          v-else
          class="choices-node__content"
          :nodes="item"
        />
      </li>
    </ol>

    <div ref="measureRoot" class="choices-node__measure-root" aria-hidden="true">
      <div
        v-for="(item, index) in node.items"
        :key="`${node.id}_measure_${index}`"
        class="choices-node__measure-item"
        data-choice-measure-item
      >
        <span class="choices-node__label">{{ LABELS[index] || `${index + 1}` }}.</span>

        <!-- 简单文本项（向后兼容） -->
        <TextNode
          v-if="isSimpleItem(item)"
          class="choices-node__measure-content"
          :node="createTextNode(getSimpleContent(item), index, 'measure')"
        />

        <!-- 复杂项（包含嵌套块） -->
        <ContentNode
          v-else
          class="choices-node__measure-content"
          :nodes="item"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.choices-node-wrap {
  position: relative;
  width: 100%;
}

.choices-node {
  display: grid;
  gap: 0.35rem 1.25rem;
  padding-left: 0;
  list-style: none;
}

.choices-node__item,
.choices-node__measure-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.4rem;
  align-items: start;
  min-width: 0;
}

.choices-node__label {
  color: var(--latex-renderer-theme-color);
  font-weight: 500;
  line-height: 1.8;
  white-space: nowrap;
}

.choices-node__content {
  min-width: 0;
}

.choices-node__measure-root {
  position: fixed;
  top: 0;
  left: 0;
  display: grid;
  gap: 0.35rem;
  width: max-content;
  max-width: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate(-200vw, -200vh);
  z-index: -1;
  contain: layout style paint;
}

.choices-node__measure-item {
  grid-template-columns: auto max-content;
  width: max-content;
  max-width: none;
}

.choices-node__measure-content {
  max-width: none;
}
</style>
