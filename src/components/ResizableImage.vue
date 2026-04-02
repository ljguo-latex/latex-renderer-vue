demo<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  MAX_WIDTH_CM,
  clampImageWidthPx,
  cmToPx,
  MIN_WIDTH_CM,
  MIN_WIDTH_PX,
  parseLengthToPx,
  pxToCm,
  trimNumber,
} from '../utils/latex'

const WIDTH_COMMIT_DEBOUNCE_MS = 140
const ALIGNMENT_OPTIONS = [
  { value: 'default', label: '无' },
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
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
})

const emit = defineEmits(['commit-width', 'commit-alignment'])

const naturalWidth = ref(0)
const naturalHeight = ref(0)
const liveWidthPx = ref(220)
const hasLoadError = ref(false)
const isSliderActive = ref(false)
const isToolbarOpen = ref(false)
const root = ref(null)

let widthCommitTimer = null

const widthFromOptions = computed(() => parseLengthToPx(props.options?.width))

const fallbackWidthPx = computed(() => widthFromOptions.value || naturalWidth.value || 220)

const widthLabel = computed(() => `${trimNumber(pxToCm(liveWidthPx.value))} cm`)
const widthSliderValue = computed(() => Number(pxToCm(liveWidthPx.value).toFixed(2)))
const widthSliderMin = computed(() => MIN_WIDTH_CM)
const widthSliderMax = computed(() => MAX_WIDTH_CM)
const figureClass = computed(() => {
  if (props.alignment === 'left') {
    return 'resizable-image--left'
  }

  if (props.alignment === 'center') {
    return 'resizable-image--center'
  }

  if (props.alignment === 'right') {
    return 'resizable-image--right'
  }

  return 'resizable-image--default'
})

function syncWidthFromProps() {
  if (isSliderActive.value) {
    return
  }

  liveWidthPx.value = Math.max(MIN_WIDTH_PX, clampImageWidthPx(fallbackWidthPx.value))
}

watch(fallbackWidthPx, syncWidthFromProps, { immediate: true })
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
  syncWidthFromProps()
}

function onImageError() {
  hasLoadError.value = true
}

function commitWidth(widthPx) {
  if (widthCommitTimer) {
    window.clearTimeout(widthCommitTimer)
  }

  widthCommitTimer = window.setTimeout(() => {
    emit('commit-width', {
      id: props.id,
      widthPx: clampImageWidthPx(widthPx),
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
    widthPx: clampImageWidthPx(liveWidthPx.value),
  })
}

function updateWidthFromSlider(event) {
  const nextWidth = Math.max(MIN_WIDTH_PX, clampImageWidthPx(cmToPx(Number(event.target.value))))

  liveWidthPx.value = nextWidth
}

function startSliderInteraction() {
  if (!props.editable) {
    return
  }

  isSliderActive.value = true
  isToolbarOpen.value = true
}

function finishSliderInteraction() {
  if (!props.editable || !isSliderActive.value) {
    return
  }

  isSliderActive.value = false
  commitWidth(liveWidthPx.value)
}

function updateAlignment(alignment) {
  if (!props.editable) {
    return
  }

  isToolbarOpen.value = true
  emit('commit-alignment', {
    id: props.id,
    alignment,
  })
}

function openToolbar() {
  if (!props.editable) {
    return
  }

  isToolbarOpen.value = true
}

function handleDocumentPointerDown(event) {
  if (!props.editable) {
    return
  }

  if (!root.value?.contains(event.target)) {
    isToolbarOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  if (isSliderActive.value) {
    isSliderActive.value = false
    flushWidthCommit()
  }

  if (widthCommitTimer) {
    window.clearTimeout(widthCommitTimer)
  }

  window.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<template>
  <div
    ref="root"
    class="resizable-image"
    :class="[
      figureClass,
      {
        'resizable-image--active': isSliderActive,
        'resizable-image--open': isToolbarOpen,
        'resizable-image--editable': editable,
      },
    ]"
  >
    <div v-if="editable" class="resizable-image__toolbar">
      <div class="resizable-image__alignment">
        <button
          v-for="option in ALIGNMENT_OPTIONS"
          :key="option.value"
          class="resizable-image__alignment-button"
          :class="{ 'resizable-image__alignment-button--active': alignment === option.value }"
          type="button"
          @click="updateAlignment(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="resizable-image__slider">
        <span class="resizable-image__slider-value">{{ widthLabel }}</span>
        <input
          class="resizable-image__slider-input"
          type="range"
          :min="widthSliderMin"
          :max="widthSliderMax"
          step="0.01"
          :value="widthSliderValue"
          @input="updateWidthFromSlider"
          @pointerdown="startSliderInteraction"
          @pointerup="finishSliderInteraction"
          @change="finishSliderInteraction"
          @focus="startSliderInteraction"
          @blur="finishSliderInteraction"
        />
      </label>
    </div>

    <div class="resizable-image__frame" :style="{ width: `${liveWidthPx}px` }" @click="openToolbar">
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
.resizable-image {
  display: block;
  margin: 0;
  width: fit-content;
  max-width: 100%;
  position: relative;
  overflow: visible;
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
  gap: 0.8rem;
  width: min(520px, calc(100vw - 3rem));
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(18, 33, 48, 0.1);
  border-radius: 10px;
  background: rgba(255, 253, 249, 0.96);
  box-shadow: 0 14px 32px rgba(17, 27, 38, 0.12);
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.resizable-image--center .resizable-image__toolbar {
  left: 50%;
  transform: translate(-50%, 6px);
}

.resizable-image--right .resizable-image__toolbar {
  left: auto;
  right: 0;
}

.resizable-image--open .resizable-image__toolbar,
.resizable-image--active .resizable-image__toolbar {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.resizable-image--center.resizable-image--open .resizable-image__toolbar,
.resizable-image--center.resizable-image--active .resizable-image__toolbar {
  transform: translate(-50%, 0);
}

.resizable-image__frame {
  position: relative;
  display: inline-flex;
  max-width: min(100%, 1000px);
}

.resizable-image--open .resizable-image__frame,
.resizable-image--active .resizable-image__frame {
  outline: 2px solid rgba(208, 111, 61, 0.65);
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
  color: #7a2f22;
  background: rgba(249, 226, 222, 0.92);
  text-align: center;
}

.resizable-image__fallback code {
  font-size: 0.82rem;
}

.resizable-image__alignment {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.resizable-image__slider {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  flex: 1;
}

.resizable-image__alignment-button {
  border: 1px solid rgba(18, 33, 48, 0.12);
  min-width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: rgba(255, 253, 249, 0.92);
  color: #42515c;
  padding: 0.2rem 0.45rem;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.resizable-image__alignment-button--active {
  border-color: rgba(198, 95, 52, 0.42);
  background: rgba(208, 111, 61, 0.12);
  color: #9f542d;
}

.resizable-image__slider-value {
  min-width: 4.2rem;
  color: #4c5965;
  font-size: 0.8rem;
  white-space: nowrap;
}

.resizable-image__slider-input {
  width: 100%;
  min-width: 0;
  accent-color: #d06f3d;
}

@media (max-width: 640px) {
  .resizable-image__toolbar {
    flex-direction: column;
    align-items: stretch;
    width: min(420px, calc(100vw - 2rem));
  }

  .resizable-image__alignment {
    flex-wrap: wrap;
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
