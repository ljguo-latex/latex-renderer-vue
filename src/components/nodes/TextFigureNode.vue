<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import TextFigureRegion from './TextFigureRegion.vue'
import { LAYOUT_EDITOR_KEY } from '../../latex/imageContext.js'
import {
  clampTextFigureRatio,
  getTextFigureLayout,
  setTextFigureRatio,
  setTextFigureSide,
} from '../../latex/textFigure.js'

const RATIO_KEYBOARD_STEP = 0.05
const ADJUST_ACTIONS = [
  { action: 'expand-before', label: '＋上段', title: '把上一段并入文字栏' },
  { action: 'expand-after', label: '＋下段', title: '把下一段并入文字栏' },
  { action: 'shrink-first', label: '－首段', title: '把文字栏的第一段移到图文组上方' },
  { action: 'shrink-last', label: '－末段', title: '把文字栏的最后一段移到图文组下方' },
]

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
const layoutEditor = inject(LAYOUT_EDITOR_KEY, null)

const BAR_SPACE_PX = 36

const root = ref(null)
const body = ref(null)
const figure = ref(null)
const lineWidth = ref(0)
const overflowing = ref(false)
const dragRatio = ref(null)
const barBelow = ref(false)
let dragging = false
let resizeObserver = null

const layout = computed(() => getTextFigureLayout(props.node.options))
const isSide = computed(() => layout.value.side === 'left' || layout.value.side === 'right')
const ratio = computed(() => dragRatio.value ?? layout.value.ratio)
const ratioLabel = computed(() => `${Math.round(ratio.value * 100)}%`)
const rootClass = computed(() => [
  `text-figure--${layout.value.side}`,
  isSide.value ? `text-figure--v-${layout.value.vertical}` : `text-figure--h-${layout.value.horizontal}`,
  {
    'text-figure--editable': props.editable,
    'text-figure--dragging': dragRatio.value !== null,
    'text-figure--overflow': props.editable && overflowing.value,
    'text-figure--bar-below': barBelow.value,
  },
])
const adjustActions = computed(() => {
  if (!props.editable || !layoutEditor) return []
  return ADJUST_ACTIONS.filter(({ action }) => layoutEditor.canAdjust(props.node.id, action))
})

function emitOptions(options) {
  emit('update-node', { ...props.node, options, optionString: null, original: undefined })
}

function unwrap() {
  layoutEditor?.unwrap(props.node.id)
}

const figureSlot = computed(() => {
  if (!props.editable) return null

  return {
    side: layout.value.side,
    vertical: layout.value.vertical,
    setSide: (side) => emitOptions(setTextFigureSide(props.node.options, side)),
    setVertical: (vertical) => emitOptions(setTextFigureSide(props.node.options, layout.value.side, vertical)),
    unwrap,
  }
})

// 拖动结束后保留预览值，直到源码里的比例更新，避免回弹闪烁
watch(() => layout.value.ratio, () => {
  if (!dragging) dragRatio.value = null
})

watch([ratio, () => layout.value.side], () => nextTick(measure))

function snapRatio(value) {
  const clamped = clampTextFigureRatio(value)
  const nearest = Math.round(clamped * 20) / 20
  return Math.abs(clamped - nearest) < 0.012 ? nearest : Math.round(clamped * 100) / 100
}

function ratioFromPointer(clientX) {
  const rect = body.value?.getBoundingClientRect()
  if (!rect?.width) return ratio.value
  const raw = layout.value.side === 'left'
    ? (rect.right - clientX) / rect.width
    : (clientX - rect.left) / rect.width
  return snapRatio(raw)
}

function commitRatio(nextRatio) {
  if (Math.abs(nextRatio - layout.value.ratio) < 0.001) {
    dragRatio.value = null
    return
  }

  dragRatio.value = nextRatio
  emitOptions(setTextFigureRatio(props.node.options, nextRatio))
}

function startDrag(event) {
  if (!props.editable || !isSide.value) return
  event.preventDefault()
  event.currentTarget.setPointerCapture?.(event.pointerId)
  dragging = true
  dragRatio.value = ratio.value
}

function moveDrag(event) {
  if (!dragging) return
  dragRatio.value = ratioFromPointer(event.clientX)
}

function endDrag() {
  if (!dragging) return
  dragging = false
  commitRatio(dragRatio.value)
}

function handleGapKeydown(event) {
  const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (!direction || !props.editable || !isSide.value) return
  event.preventDefault()
  const sign = layout.value.side === 'left' ? -direction : direction
  commitRatio(snapRatio(ratio.value + sign * RATIO_KEYBOARD_STEP))
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

// 上方空间不足（如位于滚动预览区顶部）时把工具条放到图文组下方
function placeBar() {
  if (!props.editable || !root.value) return
  barBelow.value = root.value.getBoundingClientRect().top - BAR_SPACE_PX < visibleTop(root.value)
}

// 按各栏实际宽度判断溢出：scrollWidth 会把图片工具栏等浮层也算进去
function measure() {
  const element = body.value
  if (!element) return
  lineWidth.value = element.clientWidth
  const widths = [...element.children].map((child) => child.getBoundingClientRect().width)
  const used = isSide.value ? widths.reduce((sum, width) => sum + width, 0) : Math.max(0, ...widths)
  overflowing.value = used > element.clientWidth + 1
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(measure)
  if (body.value) resizeObserver.observe(body.value)
  if (figure.value) resizeObserver.observe(figure.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="root"
    class="text-figure"
    :class="rootClass"
    :style="{ '--text-figure-ratio': ratio }"
    @pointerenter="placeBar"
    @focusin="placeBar"
  >
    <div v-if="editable" class="text-figure__bar" role="toolbar" aria-label="图文排版">
      <span class="text-figure__badge">图文 · 文字 {{ ratioLabel }}</span>
      <button
        v-for="item in adjustActions"
        :key="item.action"
        type="button"
        class="text-figure__bar-button"
        :title="item.title"
        @click="layoutEditor.adjust(node.id, item.action)"
      >
        {{ item.label }}
      </button>
      <button type="button" class="text-figure__bar-button" title="拆分为文字和独占一行的图片" @click="unwrap">取消并排</button>
    </div>

    <div ref="body" class="text-figure__body">
      <div class="text-figure__text">
        <TextFigureRegion :nodes="node.items?.[0] || []" :editable="editable" @update-node="emit('update-node', $event)" />
      </div>
      <div
        class="text-figure__gap"
        :role="editable && isSide ? 'separator' : undefined"
        :tabindex="editable && isSide ? 0 : undefined"
        :aria-orientation="editable && isSide ? 'vertical' : undefined"
        :aria-label="editable && isSide ? '拖动调整文字栏宽度' : undefined"
        :aria-valuenow="editable && isSide ? Math.round(ratio * 100) : undefined"
        :title="editable && isSide ? `文字栏 ${ratioLabel}，拖动调整` : undefined"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @keydown="handleGapKeydown"
      >
        <span v-if="editable && isSide" class="text-figure__handle" aria-hidden="true" />
      </div>
      <div ref="figure" class="text-figure__figure">
        <TextFigureRegion
          :nodes="node.items?.[1] || []"
          :editable="editable"
          :slot-context="figureSlot"
          :image-width="lineWidth"
          @update-node="emit('update-node', $event)"
        />
      </div>
    </div>

    <p v-if="editable && overflowing" class="text-figure__warning" role="status">
      图片过宽，PDF 中会超出版心：请缩小图片或向左拖动分隔线
    </p>
  </div>
</template>

<style scoped>
.text-figure {
  position: relative;
  margin: 0.5rem 0;
  border-radius: 6px;
}

.text-figure__body {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
}

/* 文字栏对应 varwidth{text-ratio × 行宽}：短文本收缩，长文本以比例为上限；
   不参与 flex 收缩，图过宽时像 PDF 一样被推出版心，而不是挤窄文字 */
.text-figure__text {
  flex: 0 0 auto;
  min-width: 0;
  max-width: calc(var(--text-figure-ratio) * 100%);
}

.text-figure__figure {
  flex: 0 0 auto;
  text-align: center;
}

.text-figure__text :deep(.content-node),
.text-figure__figure :deep(.content-node) {
  display: block;
}

.text-figure__figure :deep(.resizable-image--default) {
  margin-left: auto;
  margin-right: auto;
}

.text-figure__gap {
  position: relative;
  flex: 0 0 1em;
  align-self: stretch;
}

.text-figure--left .text-figure__body {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.text-figure--v-center .text-figure__body {
  align-items: center;
}

.text-figure--v-bottom .text-figure__body {
  align-items: flex-end;
}

.text-figure--top .text-figure__body,
.text-figure--bottom .text-figure__body {
  flex-direction: column;
  align-items: flex-start;
}

.text-figure--top .text-figure__body {
  flex-direction: column-reverse;
}

.text-figure--h-center .text-figure__figure {
  align-self: center;
}

.text-figure--h-right .text-figure__figure {
  align-self: flex-end;
}

.text-figure--editable:hover,
.text-figure--editable:focus-within,
.text-figure--dragging {
  outline: 1px dashed color-mix(in srgb, currentColor 28%, transparent);
  outline-offset: 4px;
}

.text-figure.text-figure--overflow {
  outline: 1px dashed #dc2626;
  outline-offset: 4px;
}

.text-figure--editable .text-figure__gap[role='separator'] {
  cursor: col-resize;
  touch-action: none;
}

.text-figure__handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: color-mix(in srgb, currentColor 35%, transparent);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.text-figure--editable:hover .text-figure__handle,
.text-figure__gap:focus-visible .text-figure__handle,
.text-figure--dragging .text-figure__handle {
  opacity: 1;
}

.text-figure__gap:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 55%, transparent);
  outline-offset: -1px;
}

.text-figure__bar {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgba(18, 33, 48, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.text-figure--bar-below .text-figure__bar {
  top: calc(100% + 6px);
  bottom: auto;
}

.text-figure--editable:hover .text-figure__bar,
.text-figure--editable:focus-within .text-figure__bar,
.text-figure--dragging .text-figure__bar {
  opacity: 1;
  pointer-events: auto;
}

/* 图片工具栏展开时让位，避免两条工具栏叠在一起 */
.text-figure:has(.resizable-image--open) .text-figure__bar {
  opacity: 0;
  pointer-events: none;
}

.text-figure__badge {
  padding: 4px 6px;
  color: rgba(18, 33, 48, 0.55);
  font-variant-numeric: tabular-nums;
}

.text-figure__bar-button {
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: rgba(18, 33, 48, 0.75);
  font: inherit;
  cursor: pointer;
}

.text-figure__bar-button:hover {
  background: rgba(18, 33, 48, 0.06);
  border-color: rgba(18, 33, 48, 0.08);
  color: rgba(18, 33, 48, 0.95);
}

.text-figure__bar-button:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 55%, transparent);
  outline-offset: 1px;
}

.text-figure__warning {
  margin: 6px 0 0;
  color: #b91c1c;
  font-size: 12px;
}

@media (hover: none) {
  .text-figure--editable .text-figure__bar,
  .text-figure--editable .text-figure__handle {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
