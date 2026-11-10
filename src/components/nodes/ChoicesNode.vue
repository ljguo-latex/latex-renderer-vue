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
const measuredColumnWidths = ref([])
const itemCount = computed(() => props.node.items?.length ?? 0)
const selectedColumns = computed(() => props.node.options?.columns ?? 'auto')
const fixedColumns = computed(() => typeof selectedColumns.value === 'number' ? selectedColumns.value : null)
const autoColumns = computed(() => Math.max(1, Math.min(measuredColumnWidths.value.length || 1, itemCount.value || 1)))
const effectiveColumns = computed(() => Math.max(1, Math.min(fixedColumns.value ?? autoColumns.value, itemCount.value || 1)))
const columnButtons = computed(() => ['auto', ...Array.from({ length: itemCount.value }, (_, index) => index + 1)])
const activeColumnButton = computed(() => fixedColumns.value === null ? 'auto' : effectiveColumns.value)
const autoLabelPosition = ref('top-left')
const barBelow = ref(false)
const BAR_SPACE_PX = 36
const usesAutoLabelPosition = computed(() => !props.node.options?.labelPos || props.node.options.labelPos === 'auto')
const labelPosition = computed(() => {
  const position = props.node.options?.labelPos
  if (usesAutoLabelPosition.value) return autoLabelPosition.value
  return ['top-left', 'left', 'bottom'].includes(position) ? position : 'top-left'
})
provide(CHOICE_IMAGE_WIDTH_KEY, containerWidth)

let resizeObserver = null
let mutationObserver = null
let measureFrame = null

function setColumns(columns) {
  if (columns === 'auto' ? props.node.options?.columns === undefined : columns === selectedColumns.value) return

  const options = { ...props.node.options }
  if (columns === 'auto') delete options.columns
  else options.columns = columns
  emit('update-node', { ...props.node, options })
}

function visibleTop(element) {
  let top = 0
  let parent = element.parentElement

  while (parent) {
    const style = window.getComputedStyle(parent)

    if (/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowY}`)) {
      top = Math.max(top, parent.getBoundingClientRect().top)
    }

    parent = parent.parentElement
  }

  return top
}

function placeBar() {
  if (!props.editable || !container.value) return
  barBelow.value = container.value.getBoundingClientRect().top - BAR_SPACE_PX < visibleTop(container.value)
}

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

async function measureChoices() {
  if (!measureRoot.value) return

  if (usesAutoLabelPosition.value) {
    const label = measureRoot.value.querySelector('.choices-node__label')
    const style = label ? window.getComputedStyle(label) : null
    const lineHeight = Number.parseFloat(style?.lineHeight) || (Number.parseFloat(style?.fontSize) || 16) * 1.8
    const hasTallContent = Array.from(measureRoot.value.querySelectorAll('.choices-node__measure-content'))
      .some((content) => content.getBoundingClientRect().height > lineHeight * 2)
    const hasImage = Boolean(measureRoot.value.querySelector('.resizable-image'))
    const position = hasImage || hasTallContent ? 'bottom' : 'top-left'
    if (autoLabelPosition.value !== position) {
      autoLabelPosition.value = position
      // Measure widths with the same label placement as the visible choices.
      await nextTick()
      if (!measureRoot.value) return
    }
  }

  const widths = Array.from(measureRoot.value.querySelectorAll('[data-choice-measure-item]')).map(
    (element) => element.getBoundingClientRect().width,
  )

  const grid = container.value?.querySelector('.choices-node')
  const gap = grid ? Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0 : 0
  measuredColumnWidths.value = resolveColumns(widths, containerWidth.value, gap)
}

function scheduleMeasure() {
  if (measureFrame) {
    window.cancelAnimationFrame(measureFrame)
  }

  measureFrame = window.requestAnimationFrame(async () => {
    measureFrame = null
    await nextTick()
    updateContainerWidth()
    await nextTick()
    await measureChoices()
  })
}

const choicesStyle = computed(() => {
  const columns = effectiveColumns.value
  const equalColumns = `repeat(${columns}, minmax(0, 1fr))`
  if (fixedColumns.value !== null) return { gridTemplateColumns: equalColumns }

  const grid = container.value?.querySelector('.choices-node')
  const gap = grid ? Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0 : 0
  const equalWidth = (containerWidth.value - gap * (columns - 1)) / columns
  // Prefer equal columns; allow wider pictures their share when the whole row fits.
  const equalColumnsFit = measuredColumnWidths.value.every((width) => width <= equalWidth)
  return {
    gridTemplateColumns: equalColumnsFit || measuredColumnWidths.value.length !== columns
      ? equalColumns
      : measuredColumnWidths.value.map((width) => `minmax(0, ${Math.max(1, width)}fr)`).join(' '),
  }
})

watch(
  () => [props.node.items, props.node.options?.labelPos],
  () => {
    scheduleMeasure()
  },
  { deep: true },
)

onMounted(() => {
  updateContainerWidth()
  scheduleMeasure()

  resizeObserver = new ResizeObserver(() => {
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
  <div
    ref="container"
    class="choices-node-wrap"
    :class="[
      `choices-node-wrap--label-${labelPosition}`,
      {
        'choices-node-wrap--editable': editable && itemCount,
        'choices-node-wrap--bar-below': barBelow,
      },
    ]"
    @pointerenter="placeBar"
    @focusin="placeBar"
  >
    <div v-if="editable && itemCount" class="choices-node__column-editor" role="group" aria-label="选项列数">
      <span class="choices-node__column-caption" aria-hidden="true">列数</span>
      <div class="choices-node__column-buttons">
        <button
          v-for="columns in columnButtons"
          :key="columns"
          type="button"
          :class="{ 'choices-node__column-button--inferred': fixedColumns === null && columns === autoColumns }"
          :aria-label="columns === 'auto' ? '自动排版' : `${columns} 列`"
          :title="columns === 'auto' ? `自动排版（当前 ${autoColumns} 列）` : `${columns} 列`"
          :aria-pressed="columns === activeColumnButton"
          @click.stop="setColumns(columns)"
        >
          {{ columns === 'auto' ? '自动' : columns }}
        </button>
      </div>
    </div>
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
  border-radius: 6px;
}

.choices-node-wrap--editable:hover:not(:has(.choices-node-wrap:hover, .resizable-image--open)),
.choices-node-wrap--editable:has(> .choices-node__column-editor :focus-visible) {
  outline: 1px dashed color-mix(in srgb, currentColor 28%, transparent);
  outline-offset: 4px;
}

.choices-node__column-editor {
  position: absolute;
  z-index: 4;
  inset-inline-end: 0;
  bottom: calc(100% + 6px);
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  max-width: 100%;
  padding: 3px;
  border: 1px solid rgba(18, 33, 48, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: rgba(18, 33, 48, 0.85);
  font: 500 12px/1 system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* 移出后延迟隐藏，给鼠标从选项组移到工具条留出时间 */
  transition: opacity 0.15s ease 0.25s, visibility 0s linear 0.4s;
}

/* 透明桥接工具条与选项组之间的空隙，鼠标经过时不丢失悬停 */
.choices-node__column-editor::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 100%;
  height: 8px;
}

.choices-node-wrap--bar-below > .choices-node__column-editor {
  top: calc(100% + 6px);
  bottom: auto;
}

.choices-node-wrap--bar-below > .choices-node__column-editor::after {
  top: auto;
  bottom: 100%;
}

.choices-node-wrap--editable:hover:not(:has(.choices-node-wrap:hover, .resizable-image--open)) > .choices-node__column-editor,
.choices-node__column-editor:has(:focus-visible) {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

.choices-node__column-caption {
  padding: 4px 4px 4px 6px;
  color: rgba(18, 33, 48, 0.55);
  white-space: nowrap;
}

.choices-node__column-buttons {
  display: flex;
  gap: 1px;
  min-width: 0;
  padding: 2px;
  border: 1px solid rgba(18, 33, 48, 0.04);
  border-radius: 6px;
  background: rgba(18, 33, 48, 0.05);
  overflow-x: auto;
}

.choices-node__column-buttons button {
  position: relative;
  flex: none;
  min-width: 26px;
  min-height: 24px;
  padding: 2px 7px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(18, 33, 48, 0.72);
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.choices-node__column-buttons button:hover {
  background: rgba(18, 33, 48, 0.05);
  color: rgba(18, 33, 48, 0.95);
}

.choices-node__column-buttons button[aria-pressed='true'] {
  background: #ffffff;
  color: rgba(18, 33, 48, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.choices-node__column-button--inferred::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(18, 33, 48, 0.35);
  transform: translateX(-50%);
}

.choices-node__column-buttons button:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 55%, transparent);
  outline-offset: -1px;
}

@media (hover: none) {
  .choices-node-wrap--editable:not(:has(.resizable-image--open)) > .choices-node__column-editor {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
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

.choices-node-wrap--label-left > .choices-node > .choices-node__item,
.choices-node-wrap--label-left > .choices-node__measure-root > .choices-node__measure-item {
  align-items: center;
}

.choices-node-wrap--label-bottom > .choices-node > .choices-node__item,
.choices-node-wrap--label-bottom > .choices-node__measure-root > .choices-node__measure-item {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  justify-items: center;
}

.choices-node-wrap--label-bottom > .choices-node > .choices-node__item > .choices-node__label,
.choices-node-wrap--label-bottom > .choices-node__measure-root > .choices-node__measure-item > .choices-node__label {
  grid-row: 2;
  grid-column: 1;
}

.choices-node-wrap--label-bottom > .choices-node > .choices-node__item > .choices-node__content,
.choices-node-wrap--label-bottom > .choices-node__measure-root > .choices-node__measure-item > .choices-node__measure-content {
  grid-row: 1;
  grid-column: 1;
  align-self: center;
}
</style>
