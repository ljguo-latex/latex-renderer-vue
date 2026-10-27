<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  clampImageWidthPx,
  clampWidthPercent,
  MAX_WIDTH_PERCENT,
  MAX_WIDTH_PX,
  MIN_WIDTH_PERCENT,
  MIN_WIDTH_PX,
  parseLengthToPx,
  trimNumber,
} from '../utils/latex'
import { parseLatexLength } from '../latex/length'
import { CHOICE_IMAGE_WIDTH_KEY } from '../latex/imageContext.js'

const WIDTH_COMMIT_DEBOUNCE_MS = 140
const TOOLBAR_GAP_PX = 8
const ALIGNMENT_OPTIONS = [
  { value: 'default', label: '无' },
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
]
const LAYOUT_OPTIONS = [
  { value: 'block', label: '独占一行' },
  { value: 'right', label: '图在右，与文字并排' },
  { value: 'left', label: '图在左，与文字并排' },
]
const VERTICAL_OPTIONS = [
  { value: 'top', label: '与文字顶部对齐' },
  { value: 'center', label: '与文字垂直居中' },
  { value: 'bottom', label: '与文字底部对齐' },
]

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  src: {
    type: String,
    required: true,
  },
  options: {
    type: Object,
    default: () => ({}),
  },
  alignment: {
    type: String,
    default: 'default',
  },
  editable: {
    type: Boolean,
    default: false,
  },
  processable: { type: Boolean, default: false },
  enhanceable: { type: Boolean, default: false },
  replaceable: { type: Boolean, default: false },
  replacing: { type: Boolean, default: false },
  replacementError: { type: String, default: '' },
  // null：不提供版式；block：独占一行，可转为图文并排；inside：位于图文组的图栏
  layoutMode: { type: String, default: null },
  layoutSide: { type: String, default: 'block' },
  layoutVertical: { type: String, default: null },
})

const emit = defineEmits(['commit-width', 'commit-alignment', 'commit-layout', 'commit-vertical', 'replace-image', 'edit-image', 'enhance-image'])
const showAlignment = computed(() => props.layoutMode !== 'inside')
const showVertical = computed(() => props.layoutMode === 'inside' && ['left', 'right'].includes(props.layoutSide))
const replacementInput = ref(null)

function selectReplacement(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file && props.editable && props.replaceable && !props.replacing) emit('replace-image', file)
}

const naturalWidth = ref(0)
const naturalHeight = ref(0)
const liveWidthPx = ref(220)
const hasLoadError = ref(false)
const isSliderActive = ref(false)
const isToolbarOpen = ref(false)
const userPlacement = ref(null)
const toolbarPlacement = ref('top')
const toolbarShiftX = ref(0)
const toolbarMaxWidthPx = ref(0)
const containerWidthPx = ref(0)
const currentPercent = ref(MAX_WIDTH_PERCENT)
const root = ref(null)
const frame = ref(null)
const toolbar = ref(null)
const choiceImageWidth = inject(CHOICE_IMAGE_WIDTH_KEY, null)

let widthCommitTimer = null
let placementFrame = null
let resizeObserver = null

const widthFromOptions = computed(() => parseLengthToPx(props.options?.width))
const parsedWidthFromOptions = computed(() => parseLatexLength(props.options?.width))
const relativeWidthFromOptions = computed(() => {
  const width = parsedWidthFromOptions.value

  return width.kind === 'relative' || width.kind === 'percent' ? width.css : null
})
const choiceRelativeWidthPx = computed(() => {
  if (!relativeWidthFromOptions.value || !choiceImageWidth?.value) return null
  return choiceImageWidth.value * Number.parseFloat(relativeWidthFromOptions.value) / 100
})
const figureStyle = computed(() => choiceRelativeWidthPx.value !== null
  ? { width: `${isSliderActive.value ? liveWidthPx.value : choiceRelativeWidthPx.value}px` }
  : {})

const fallbackWidthPx = computed(() => widthFromOptions.value || naturalWidth.value || 220)
const effectiveContainerWidthPx = computed(() => containerWidthPx.value || MAX_WIDTH_PX)

const widthLabel = computed(() => `${trimNumber(currentPercent.value, 1)}%`)
const widthSliderValue = computed(() => clampWidthPercent(Math.round(currentPercent.value)))
const widthSliderMin = computed(() => MIN_WIDTH_PERCENT)
const widthSliderMax = computed(() => MAX_WIDTH_PERCENT)
const figureClass = computed(() => {
  const classes = []

  if (relativeWidthFromOptions.value) {
    classes.push('resizable-image--fluid')
  }

  if (props.alignment === 'left') {
    classes.push('resizable-image--left')
    return classes
  }

  if (props.alignment === 'center') {
    classes.push('resizable-image--center')
    return classes
  }

  if (props.alignment === 'right') {
    classes.push('resizable-image--right')
    return classes
  }

  classes.push('resizable-image--default')
  return classes
})
const frameStyle = computed(() => ({
  width: relativeWidthFromOptions.value && !isSliderActive.value
    ? (choiceRelativeWidthPx.value !== null ? `${choiceRelativeWidthPx.value}px` : relativeWidthFromOptions.value)
    : `${liveWidthPx.value}px`,
}))

const toolbarPlacementClass = computed(() =>
  toolbarPlacement.value === 'bottom' ? 'resizable-image--toolbar-bottom' : 'resizable-image--toolbar-top',
)

const toolbarStyle = computed(() => {
  const styles = {}
  if (toolbarShiftX.value) {
    styles['--toolbar-shift-x'] = `${toolbarShiftX.value}px`
  }
  if (toolbarMaxWidthPx.value) {
    styles['--toolbar-max-width'] = `${toolbarMaxWidthPx.value}px`
  }
  return styles
})

function syncWidthFromProps() {
  if (isSliderActive.value) {
    return
  }

  liveWidthPx.value = Math.max(MIN_WIDTH_PX, clampImageWidthPx(fallbackWidthPx.value))
}

function syncRenderedWidthFromFrame() {
  if (!relativeWidthFromOptions.value || isSliderActive.value || !frame.value) {
    return
  }

  const renderedWidth = frame.value.getBoundingClientRect().width

  if (renderedWidth > 0) {
    liveWidthPx.value = clampImageWidthPx(renderedWidth)
  }

  syncPercentFromSource()
}

/** 行宽（\linewidth）= 父容器内容宽度，作为百分比滑杆的 100% 基准。 */
function measureContainerWidth() {
  if (choiceImageWidth?.value) {
    containerWidthPx.value = choiceImageWidth.value
    return
  }
  const parent = root.value?.parentElement
  if (!parent) {
    return
  }

  const style = window.getComputedStyle(parent)
  const width = parent.clientWidth -
    (Number.parseFloat(style.paddingLeft) || 0) -
    (Number.parseFloat(style.paddingRight) || 0)

  if (width > 0) {
    containerWidthPx.value = width
  }
}

function syncPercentFromSource() {
  if (isSliderActive.value) {
    return
  }

  const relativeCss = relativeWidthFromOptions.value

  currentPercent.value = relativeCss
    ? (Number.parseFloat(relativeCss) || MAX_WIDTH_PERCENT)
    : (liveWidthPx.value / effectiveContainerWidthPx.value) * 100
}

watch(
  [fallbackWidthPx, effectiveContainerWidthPx, relativeWidthFromOptions],
  () => {
    syncWidthFromProps()
    syncPercentFromSource()
  },
  { immediate: true },
)
watch(choiceImageWidth || (() => 0), () => {
  measureContainerWidth()
  syncRenderedWidthFromFrame()
  syncPercentFromSource()
})
watch(
  () => props.src,
  () => {
    hasLoadError.value = false
  },
)

function onImageLoad(event) {
  naturalWidth.value = event.target.naturalWidth
  naturalHeight.value = event.target.naturalHeight
  hasLoadError.value = false
  measureContainerWidth()
  syncWidthFromProps()
  syncPercentFromSource()
  nextTick(syncRenderedWidthFromFrame)
  scheduleToolbarPlacementUpdate()
}

function onImageError() {
  hasLoadError.value = true
}

function commitWidth(percent) {
  if (widthCommitTimer) {
    window.clearTimeout(widthCommitTimer)
  }

  widthCommitTimer = window.setTimeout(() => {
    emit('commit-width', {
      id: props.id,
      percent: clampWidthPercent(percent),
    })
    widthCommitTimer = null
  }, WIDTH_COMMIT_DEBOUNCE_MS)
}

function flushWidthCommit() {
  if (widthCommitTimer) {
    window.clearTimeout(widthCommitTimer)
    widthCommitTimer = null
  }

  emit('commit-width', {
    id: props.id,
    percent: clampWidthPercent(currentPercent.value),
  })
}

function updateWidthFromSlider(event) {
  const percent = clampWidthPercent(Number(event.target.value))

  currentPercent.value = percent
  liveWidthPx.value = (effectiveContainerWidthPx.value * percent) / 100
  scheduleToolbarPlacementUpdate()
}

function startSliderInteraction() {
  if (!props.editable) {
    return
  }

  measureContainerWidth()

  const relativeCss = relativeWidthFromOptions.value
  currentPercent.value = relativeCss
    ? (Number.parseFloat(relativeCss) || MAX_WIDTH_PERCENT)
    : (liveWidthPx.value / effectiveContainerWidthPx.value) * 100
  liveWidthPx.value = (effectiveContainerWidthPx.value * clampWidthPercent(currentPercent.value)) / 100

  isSliderActive.value = true
  isToolbarOpen.value = true
  scheduleToolbarPlacementUpdate()
}

function finishSliderInteraction() {
  if (!props.editable || !isSliderActive.value) {
    return
  }

  isSliderActive.value = false
  commitWidth(currentPercent.value)
}

function updateAlignment(alignment) {
  if (!props.editable) {
    return
  }

  isToolbarOpen.value = true
  scheduleToolbarPlacementUpdate()
  emit('commit-alignment', {
    id: props.id,
    alignment,
  })
}

function updateLayout(side) {
  if (!props.editable || side === props.layoutSide) {
    return
  }

  emit('commit-layout', { id: props.id, side })
}

function updateVertical(vertical) {
  if (!props.editable || vertical === props.layoutVertical) {
    return
  }

  emit('commit-vertical', { id: props.id, vertical })
}

function toggleToolbar() {
  if (!props.editable) {
    return
  }

  if (isToolbarOpen.value) {
    closeToolbar()
  } else {
    openToolbar()
  }
}

function openToolbar() {
  if (!props.editable) {
    return
  }

  syncRenderedWidthFromFrame()
  isToolbarOpen.value = true
  scheduleToolbarPlacementUpdate()
}

function closeToolbar() {
  isToolbarOpen.value = false
  toolbarShiftX.value = 0
}

function togglePlacement() {
  const current = userPlacement.value || toolbarPlacement.value
  userPlacement.value = current === 'top' ? 'bottom' : 'top'
  toolbarPlacement.value = userPlacement.value
  scheduleToolbarPlacementUpdate()
}

function handleDocumentKeyDown(event) {
  if (event.key === 'Escape' && isToolbarOpen.value) {
    closeToolbar()
  }
}

function handleDocumentPointerDown(event) {
  if (!props.editable) {
    return
  }

  if (!root.value?.contains(event.target)) {
    closeToolbar()
  }
}

function getVisibleBounds() {
  const bounds = {
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    left: 0,
  }

  let element = root.value?.parentElement
  while (element) {
    const style = window.getComputedStyle(element)
    const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`

    if (/(auto|scroll|hidden|clip)/.test(overflow)) {
      const rect = element.getBoundingClientRect()
      bounds.top = Math.max(bounds.top, rect.top)
      bounds.right = Math.min(bounds.right, rect.right)
      bounds.bottom = Math.min(bounds.bottom, rect.bottom)
      bounds.left = Math.max(bounds.left, rect.left)
    }

    element = element.parentElement
  }

  return bounds
}

function updateToolbarPlacement() {
  placementFrame = null

  if (!props.editable || !isToolbarOpen.value || !root.value || !toolbar.value) {
    return
  }

  const rootRect = root.value.getBoundingClientRect()
  const toolbarEl = toolbar.value
  const toolbarRect = toolbarEl.getBoundingClientRect()
  const toolbarWidth = toolbarEl.offsetWidth || toolbarRect.width
  const toolbarHeight = toolbarEl.offsetHeight || toolbarRect.height
  const visibleBounds = getVisibleBounds()
  const requiredSpace = toolbarHeight + TOOLBAR_GAP_PX
  const topSpace = rootRect.top - visibleBounds.top
  const bottomSpace = visibleBounds.bottom - rootRect.bottom

  if (userPlacement.value) {
    toolbarPlacement.value = userPlacement.value
  } else {
    toolbarPlacement.value = topSpace >= requiredSpace || topSpace >= bottomSpace ? 'top' : 'bottom'
  }

  // 水平边界防遮挡避让计算
  const padding = 8
  const visibleLeft = visibleBounds.left + padding
  const visibleRight = visibleBounds.right - padding
  const visibleWidth = Math.max(120, Math.floor(visibleRight - visibleLeft))
  toolbarMaxWidthPx.value = visibleWidth

  // 计算未偏移时工具栏在视口中的基准左侧坐标（依据父容器对齐方式，不受任何 CSS transform 动画干扰）
  let naturalToolbarLeft = rootRect.left
  if (props.alignment === 'center') {
    naturalToolbarLeft = rootRect.left + (rootRect.width - toolbarWidth) / 2
  } else if (props.alignment === 'right') {
    naturalToolbarLeft = rootRect.right - toolbarWidth
  }

  // 严格将工具栏限制在可视区域内（避免向左或向右溢出截断）
  let targetLeft = naturalToolbarLeft
  if (toolbarWidth >= visibleWidth) {
    targetLeft = visibleLeft
  } else {
    const minLeft = visibleLeft
    const maxLeft = visibleRight - toolbarWidth
    targetLeft = Math.max(minLeft, Math.min(naturalToolbarLeft, maxLeft))
  }

  toolbarShiftX.value = Math.round(targetLeft - naturalToolbarLeft)
}

function scheduleToolbarPlacementUpdate() {
  if (!props.editable) {
    return
  }

  nextTick(() => {
    if (placementFrame) {
      window.cancelAnimationFrame(placementFrame)
    }

    placementFrame = window.requestAnimationFrame(updateToolbarPlacement)
  })
}

function handleWindowResize() {
  measureContainerWidth()
  syncPercentFromSource()
  scheduleToolbarPlacementUpdate()
}

onMounted(() => {
  window.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('keydown', handleDocumentKeyDown)
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('scroll', scheduleToolbarPlacementUpdate, true)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureContainerWidth()
      syncRenderedWidthFromFrame()
      syncPercentFromSource()
      scheduleToolbarPlacementUpdate()
    })

    if (root.value) {
      resizeObserver.observe(root.value)
      if (root.value.parentElement) {
        resizeObserver.observe(root.value.parentElement)
      }
    }

    if (toolbar.value) {
      resizeObserver.observe(toolbar.value)
    }

    if (frame.value) {
      resizeObserver.observe(frame.value)
    }
  }

  measureContainerWidth()
  syncPercentFromSource()
})

onBeforeUnmount(() => {
  if (isSliderActive.value) {
    isSliderActive.value = false
    flushWidthCommit()
  }

  if (widthCommitTimer) {
    window.clearTimeout(widthCommitTimer)
  }

  if (placementFrame) {
    window.cancelAnimationFrame(placementFrame)
  }

  resizeObserver?.disconnect()
  window.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('keydown', handleDocumentKeyDown)
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('scroll', scheduleToolbarPlacementUpdate, true)
})
</script>

<template>
  <div
    ref="root"
    class="resizable-image"
    :style="figureStyle"
    :class="[
      figureClass,
      {
        'resizable-image--active': isSliderActive,
        'resizable-image--open': isToolbarOpen,
        'resizable-image--editable': editable,
      },
      toolbarPlacementClass,
    ]"
  >
    <div v-if="editable" ref="toolbar" class="resizable-image__toolbar" :style="toolbarStyle">
      <div v-if="replaceable || processable || enhanceable" class="resizable-image__actions">
        <button
          v-if="replaceable"
          type="button"
          class="resizable-image__action-button"
          :disabled="replacing"
          title="替换当前图片"
          @click="replacementInput?.click()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          <span>{{ replacing ? '处理中…' : '替换' }}</span>
        </button>
        <button
          v-if="processable"
          type="button"
          class="resizable-image__action-button"
          :disabled="replacing"
          title="抠图 / 线稿：黑白线稿一键去底与线条增强"
          @click="emit('edit-image')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.9 4.4L5.7 9l4.4 1.9L12 15.3l1.9-4.4L18.3 9l-4.4-1.6L12 3z"></path>
            <path d="M19 15l-1 2.2-2.2 1 2.2 1 1 2.2 1-2.2 2.2-1-2.2-1-1-2.2z"></path>
            <path d="M5 16l-.7 1.5-1.5.7 1.5.7.7 1.5.7-1.5 1.5-.7-1.5-.7-.7-1.5z"></path>
          </svg>
          <span>抠图</span>
        </button>
        <button
          v-if="enhanceable"
          type="button"
          class="resizable-image__action-button"
          :disabled="replacing"
          title="图片清晰化：提升图片清晰度，宽高放大至 2 倍"
          @click="emit('enhance-image')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 16l4-8 4 8M9.5 13h5" />
          </svg>
          <span>清晰化</span>
        </button>
      </div>

      <input v-if="replaceable" ref="replacementInput" type="file" accept="image/png,image/jpeg" hidden @change="selectReplacement" />

      <div v-if="(replaceable || processable || enhanceable) && (showAlignment || layoutMode)" class="resizable-image__divider" />

      <div v-if="showAlignment" class="resizable-image__alignment">
        <button
          v-for="option in ALIGNMENT_OPTIONS"
          :key="option.value"
          class="resizable-image__alignment-button"
          :class="{ 'resizable-image__alignment-button--active': alignment === option.value }"
          type="button"
          :title="option.label"
          @click="updateAlignment(option.value)"
        >
          <!-- 无对齐/默认 -->
          <svg v-if="option.value === 'default'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <!-- 左对齐 -->
          <svg v-else-if="option.value === 'left'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="17" y1="10" x2="3" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="14" y1="14" x2="3" y2="14"></line>
            <line x1="18" y1="18" x2="3" y2="18"></line>
          </svg>
          <!-- 居中对齐 -->
          <svg v-else-if="option.value === 'center'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="10" x2="6" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="17" y1="14" x2="7" y2="14"></line>
            <line x1="19" y1="18" x2="5" y2="18"></line>
          </svg>
          <!-- 右对齐 -->
          <svg v-else-if="option.value === 'right'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="21" y1="10" x2="7" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="21" y1="14" x2="10" y2="14"></line>
            <line x1="21" y1="18" x2="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <div v-if="showAlignment && layoutMode" class="resizable-image__divider" />

      <div v-if="layoutMode" class="resizable-image__alignment" role="group" aria-label="图文版式">
        <button
          v-for="option in LAYOUT_OPTIONS"
          :key="option.value"
          class="resizable-image__alignment-button"
          :class="{ 'resizable-image__alignment-button--active': layoutSide === option.value }"
          type="button"
          :title="option.label"
          :aria-label="option.label"
          :aria-pressed="layoutSide === option.value"
          @click="updateLayout(option.value)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <template v-if="option.value === 'block'">
              <line x1="3" y1="4" x2="21" y2="4"></line>
              <rect x="7" y="8" width="10" height="8" rx="1.5"></rect>
              <line x1="3" y1="20" x2="21" y2="20"></line>
            </template>
            <template v-else-if="option.value === 'right'">
              <line x1="3" y1="6" x2="11" y2="6"></line>
              <line x1="3" y1="12" x2="11" y2="12"></line>
              <line x1="3" y1="18" x2="11" y2="18"></line>
              <rect x="14" y="5" width="7" height="14" rx="1.5"></rect>
            </template>
            <template v-else>
              <rect x="3" y="5" width="7" height="14" rx="1.5"></rect>
              <line x1="13" y1="6" x2="21" y2="6"></line>
              <line x1="13" y1="12" x2="21" y2="12"></line>
              <line x1="13" y1="18" x2="21" y2="18"></line>
            </template>
          </svg>
        </button>
      </div>

      <div v-if="showVertical" class="resizable-image__alignment" role="group" aria-label="图片垂直对齐">
        <button
          v-for="option in VERTICAL_OPTIONS"
          :key="option.value"
          class="resizable-image__alignment-button"
          :class="{ 'resizable-image__alignment-button--active': layoutVertical === option.value }"
          type="button"
          :title="option.label"
          :aria-label="option.label"
          :aria-pressed="layoutVertical === option.value"
          @click="updateVertical(option.value)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line v-if="option.value === 'top'" x1="3" y1="3" x2="21" y2="3"></line>
            <line v-else-if="option.value === 'bottom'" x1="3" y1="21" x2="21" y2="21"></line>
            <line v-else x1="3" y1="12" x2="21" y2="12"></line>
            <rect v-if="option.value === 'top'" x="8" y="6" width="8" height="10" rx="1.5"></rect>
            <rect v-else-if="option.value === 'bottom'" x="8" y="8" width="8" height="10" rx="1.5"></rect>
            <rect v-else x="8" y="7" width="8" height="10" rx="1.5"></rect>
          </svg>
        </button>
      </div>

      <div class="resizable-image__divider" />

      <label class="resizable-image__slider">
        <span class="resizable-image__slider-value">{{ widthLabel }}</span>
        <input
          class="resizable-image__slider-input"
          type="range"
          :min="widthSliderMin"
          :max="widthSliderMax"
          step="1"
          :value="widthSliderValue"
          aria-label="图片宽度（占行宽百分比）"
          @input="updateWidthFromSlider"
          @pointerdown="startSliderInteraction"
          @pointerup="finishSliderInteraction"
          @change="finishSliderInteraction"
          @focus="startSliderInteraction"
          @blur="finishSliderInteraction"
        />
      </label>

      <div class="resizable-image__divider" />

      <button
        type="button"
        class="resizable-image__icon-button"
        :title="toolbarPlacement === 'bottom' ? '切换显示在图片上方' : '切换显示在图片下方（避免遮挡文字）'"
        @click.stop="togglePlacement"
      >
        <svg v-if="toolbarPlacement === 'bottom'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <button
        type="button"
        class="resizable-image__icon-button"
        title="收起工具栏 (Esc)"
        @click.stop="closeToolbar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div v-if="replacementError && editable" class="resizable-image__replacement-error" role="alert">{{ replacementError }}</div>

    <div ref="frame" class="resizable-image__frame" :style="frameStyle" @click="toggleToolbar">
      <img
        v-if="!hasLoadError"
        class="resizable-image__media"
        :src="src"
        :alt="src"
        draggable="false"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div v-else class="resizable-image__fallback">
        <span>图片加载失败</span>
        <code>{{ src }}</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resizable-image__actions {
  display: flex;
  flex-wrap: nowrap;
  max-width: 100%;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.resizable-image__action-button,
.resizable-image__replace-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 1.95rem;
  padding: 0 0.5rem;
  border: 1px solid rgba(18, 33, 48, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.15s ease;
  user-select: none;
}

.resizable-image__action-button svg {
  flex-shrink: 0;
  opacity: 0.75;
  transition: opacity 0.15s ease;
}

.resizable-image__action-button:hover:not(:disabled),
.resizable-image__replace-button:hover:not(:disabled) {
  background: #ffffff;
  border-color: rgba(18, 33, 48, 0.18);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.resizable-image__action-button:hover:not(:disabled) svg {
  opacity: 1;
}

.resizable-image__action-button:active:not(:disabled),
.resizable-image__replace-button:active:not(:disabled) {
  transform: scale(0.97);
  background: rgba(0, 0, 0, 0.02);
}

.resizable-image__action-button:disabled,
.resizable-image__replace-button:disabled {
  opacity: 0.45;
  cursor: wait;
}

.resizable-image__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: rgba(18, 33, 48, 0.55);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.resizable-image__icon-button:hover {
  background: rgba(18, 33, 48, 0.06);
  color: rgba(18, 33, 48, 0.9);
  border-color: rgba(18, 33, 48, 0.08);
}

.resizable-image__icon-button:active {
  transform: scale(0.95);
}

.resizable-image__divider {
  width: 1px;
  height: 1.2rem;
  background: rgba(18, 33, 48, 0.1);
  margin: 0 1px;
  flex-shrink: 0;
}

.resizable-image__replacement-error { color: #b91c1c; font-size: 12px; }
.resizable-image {
  display: block;
  margin: 0;
  width: fit-content;
  max-width: 100%;
  position: relative;
  overflow: visible;
}

.resizable-image--fluid {
  width: 100%;
  display: flex;
}

.resizable-image--fluid.resizable-image--default,
.resizable-image--fluid.resizable-image--left {
  justify-content: flex-start;
}

.resizable-image--fluid.resizable-image--center {
  justify-content: center;
}

.resizable-image--fluid.resizable-image--right {
  justify-content: flex-end;
}

.resizable-image--default,
.resizable-image--left {
  margin-right: auto;
}

.resizable-image--center {
  margin-left: auto;
  margin-right: auto;
}

.resizable-image--right {
  margin-left: auto;
}

.resizable-image__toolbar {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.5rem);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: max-content;
  max-width: min(740px, var(--toolbar-max-width, calc(100vw - 2rem)));
  flex-wrap: nowrap;
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(18, 33, 48, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  box-shadow:
    0 8px 24px -4px rgba(18, 27, 34, 0.12),
    0 2px 6px -1px rgba(18, 27, 34, 0.05);
  opacity: 0;
  transform: translate(var(--toolbar-shift-x, 0px), 6px);
  pointer-events: none;
  transition: opacity 0.15s ease;
  user-select: none;
}

.resizable-image--toolbar-bottom .resizable-image__toolbar {
  top: calc(100% + 0.5rem);
  bottom: auto;
  transform: translate(var(--toolbar-shift-x, 0px), -6px);
}

.resizable-image--center .resizable-image__toolbar {
  left: 50%;
  transform: translate(calc(-50% + var(--toolbar-shift-x, 0px)), 6px);
}

.resizable-image--center.resizable-image--toolbar-bottom .resizable-image__toolbar {
  transform: translate(calc(-50% + var(--toolbar-shift-x, 0px)), -6px);
}

.resizable-image--right .resizable-image__toolbar {
  left: auto;
  right: 0;
}

.resizable-image--open .resizable-image__toolbar,
.resizable-image--active .resizable-image__toolbar {
  opacity: 1;
  transform: translate(var(--toolbar-shift-x, 0px), 0);
  pointer-events: auto;
}

.resizable-image--center.resizable-image--open .resizable-image__toolbar,
.resizable-image--center.resizable-image--active .resizable-image__toolbar {
  transform: translate(calc(-50% + var(--toolbar-shift-x, 0px)), 0);
}

.resizable-image__frame {
  position: relative;
  display: inline-flex;
  max-width: min(100%, 1000px);
}

.resizable-image--open .resizable-image__frame,
.resizable-image--active .resizable-image__frame {
  outline: 2px solid color-mix(in srgb, currentColor 55%, transparent);
  outline-offset: 2px;
}

.resizable-image--editable .resizable-image__frame {
  cursor: pointer;
}

.resizable-image__media,
.resizable-image__fallback {
  display: block;
  width: 100%;
}

.resizable-image__media {
  user-select: none;
}

.resizable-image__fallback {
  display: grid;
  min-height: 180px;
  place-items: center;
  gap: 0.35rem;
  padding: 1rem;
  color: inherit;
  background: rgba(249, 226, 222, 0.92);
  text-align: center;
}

.resizable-image__fallback code {
  font-size: 0.82rem;
}

.resizable-image__alignment {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid rgba(18, 33, 48, 0.04);
  gap: 1px;
  flex-shrink: 0;
}

.resizable-image__slider {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 105px;
  flex: 1 1 auto;
  padding-right: 2px;
}

.resizable-image__alignment-button {
  border: none;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
}

.resizable-image__alignment-button:hover {
  background: rgba(0, 0, 0, 0.04);
  color: inherit;
}

.resizable-image__alignment-button:active {
  transform: scale(0.95);
}

.resizable-image__alignment-button--active {
  background: #ffffff;
  color: inherit;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.resizable-image__alignment-button--active:hover {
  background: #ffffff;
  color: inherit;
}

.resizable-image__slider-value {
  min-width: 3.2rem;
  color: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.resizable-image__slider-input {
  color: inherit;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  min-width: 55px;
  height: 18px;
  background: transparent;
  cursor: pointer;
}

/* Chrome, Safari, Edge, Opera slider styles */
.resizable-image__slider-input::-webkit-slider-runnable-track {
  background: rgba(0, 0, 0, 0.06);
  height: 4px;
  border-radius: 2px;
  transition: background 0.2s;
}

.resizable-image__slider-input:hover::-webkit-slider-runnable-track {
  background: rgba(0, 0, 0, 0.1);
}

.resizable-image__slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -6px;
  background-color: #ffffff;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    background-color 0.15s;
}

.resizable-image__slider-input:hover::-webkit-slider-thumb {
  transform: scale(1.15);
}

.resizable-image__slider-input:active::-webkit-slider-thumb {
  transform: scale(1.25);
  background-color: currentColor;
}

/* Firefox slider styles */
.resizable-image__slider-input::-moz-range-track {
  background: rgba(0, 0, 0, 0.06);
  height: 4px;
  border-radius: 2px;
  transition: background 0.2s;
}

.resizable-image__slider-input:hover::-moz-range-track {
  background: rgba(0, 0, 0, 0.1);
}

.resizable-image__slider-input::-moz-range-thumb {
  background-color: #ffffff;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    background-color 0.15s;
}

.resizable-image__slider-input:hover::-moz-range-thumb {
  transform: scale(1.15);
}

.resizable-image__slider-input:active::-moz-range-thumb {
  transform: scale(1.25);
  background-color: currentColor;
}

@media (max-width: 640px) {
  .resizable-image__toolbar {
    flex-direction: column;
    align-items: stretch;
    width: min(420px, calc(100vw - 2rem));
    padding: 0.6rem;
    gap: 0.6rem;
  }

  .resizable-image__alignment {
    justify-content: center;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
