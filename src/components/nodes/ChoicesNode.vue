<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'

import ContentNode from './ContentNode.vue'
import TextNode from './TextNode.vue'
import { isSimpleTextItem, resolveSimpleTextItem } from '../../latex/itemParser.js'
import { CHOICE_IMAGE_WIDTH_KEY } from '../../latex/imageContext.js'

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-node'])

const container = ref(null)
const measureRoot = ref(null)
const containerWidth = ref(0)
const columnCount = ref(1)
const measuredColumnWidths = ref([])
provide(CHOICE_IMAGE_WIDTH_KEY, containerWidth)

let resizeObserver = null
let mutationObserver = null
let measureFrame = null


function resolveColumns(widths, width, gap) {
  const itemCount = widths.length
  if (itemCount <= 1 || !width || !Math.max(...widths)) {
    return [width]
  }

  for (const columns of [...new Set([Math.min(4, itemCount), Math.min(2, itemCount)])]) {
    const columnWidths = Array(columns).fill(0)
    widths.forEach((itemWidth, index) => {
      columnWidths[index % columns] = Math.max(columnWidths[index % columns], itemWidth)
    })
    if (columnWidths.reduce((sum, itemWidth) => sum + itemWidth, 0) + gap * (columns - 1) <= width) {
      return columnWidths
    }
  }

  return [width]
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

  const grid = container.value?.querySelector('.choices-node')
  const gap = grid ? Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0 : 0
  measuredColumnWidths.value = resolveColumns(widths, containerWidth.value, gap)
  columnCount.value = measuredColumnWidths.value.length
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
const choicesStyle = computed(() => {
  const columns = effectiveColumnCount.value
  const grid = container.value?.querySelector('.choices-node')
  const gap = grid ? Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0 : 0
  const equalWidth = (containerWidth.value - gap * (columns - 1)) / columns
  // Prefer equal columns; allow wider pictures their share when the whole row fits.
  const equalColumnsFit = measuredColumnWidths.value.every((width) => width <= equalWidth)
  return {
    gridTemplateColumns: equalColumnsFit || measuredColumnWidths.value.length !== columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : measuredColumnWidths.value.map((width) => `minmax(0, ${Math.max(1, width)}fr)`).join(' '),
  }
})

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
  measureRoot.value?.querySelectorAll('[data-choice-measure-item]').forEach((item) => {
    resizeObserver.observe(item)
  })

  mutationObserver = new MutationObserver(() => {
    scheduleMeasure()
  })

  if (measureRoot.value) {
    mutationObserver.observe(measureRoot.value, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
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
          v-if="isSimpleTextItem(item)"
          class="choices-node__content"
          :node="resolveSimpleTextItem(item, `${node.id}_text_${index}`, node.inlineContext)"
        />

        <!-- 复杂项（包含嵌套块） -->
        <ContentNode
          v-else
          class="choices-node__content"
          :nodes="item"
          :editable="editable"
          @update-node="emit('update-node', $event)"
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
          v-if="isSimpleTextItem(item)"
          class="choices-node__measure-content"
          :node="resolveSimpleTextItem(item, `${node.id}_measure_${index}`, node.inlineContext)"
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
  color: inherit;
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
