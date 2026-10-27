// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import LatexRenderer from '../src/components/LatexRenderer.vue'

let app, root, source
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { left: 0, right: 1000, top: 200, bottom: 400, width: 1000, height: 200 }
  })
})
afterEach(() => {
  app?.unmount()
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mount(latex, props = {}) {
  source = ref(latex)
  root = document.createElement('div')
  document.body.appendChild(root)
  app = createApp({
    render: () => h(LatexRenderer, {
      modelValue: source.value,
      'onUpdate:modelValue': (value) => { source.value = value },
      editableImages: true,
      ...props,
    }),
  })
  app.mount(root)
  await nextTick()
}

const button = (label) => root.querySelector(`button[aria-label="${label}"]`)
const group = String.raw`\textfigure[fig-pos=right-top, text-ratio=0.6]{
段一

段二
}{
\includegraphics[width=.3\linewidth]{a.png}
}`

describe('text figure rendering', () => {
  it('renders the text and figure columns with the configured ratio', async () => {
    await mount(group, { editableImages: false })
    const figure = root.querySelector('.text-figure')

    expect(figure.classList.contains('text-figure--right')).toBe(true)
    expect(figure.classList.contains('text-figure--v-top')).toBe(true)
    expect(figure.style.getPropertyValue('--text-figure-ratio')).toBe('0.6')
    expect(figure.classList.contains('text-figure--align-right')).toBe(true)
    expect(root.querySelector('.text-figure__text').textContent).toContain('段一')
    expect(root.querySelector('.text-figure__figure img')).not.toBeNull()
    expect(root.querySelector('.text-figure__bar')).toBeNull()
    expect(root.querySelector('[role="separator"]')).toBeNull()
  })

  it('offers side-by-side layout on a standalone image and wraps the previous paragraph', async () => {
    await mount('如图所示的题干。\n\\includegraphics[width=.3\\linewidth]{a.png}')

    expect(root.querySelector('[aria-label="图片垂直对齐"]')).toBeNull()
    button('图在右，与文字并排').click()
    await nextTick()

    expect(source.value).toBe(String.raw`\textfigure[fig-pos=right-top, text-ratio=0.65]{
如图所示的题干。
}{
\includegraphics[width=\linewidth]{a.png}
}`)
    expect(root.querySelector('.text-figure')).not.toBeNull()
  })

  it('hides the layout group when there is nothing to pair the image with', async () => {
    await mount('\\includegraphics{a.png}')
    expect(button('图在右，与文字并排')).toBeNull()
  })

  it('swaps image alignment for layout and vertical controls inside a group', async () => {
    await mount(group)
    const toolbar = root.querySelector('.text-figure__figure .resizable-image__toolbar')

    expect(toolbar.querySelector('[title="中"]')).toBeNull()
    expect(button('图在右，与文字并排').getAttribute('aria-pressed')).toBe('true')

    button('与文字垂直居中').click()
    await nextTick()
    expect(source.value).toContain('[fig-pos=right, text-ratio=0.6]')

    button('图在左，与文字并排').click()
    await nextTick()
    expect(source.value).toContain('[fig-pos=left, text-ratio=0.6]')

    button('独占一行').click()
    await nextTick()
    expect(source.value).toMatch(/^\\begin\{center\}\n\\includegraphics/)
  })

  it('commits the dragged ratio and supports keyboard adjustment', async () => {
    await mount(group)
    const separator = root.querySelector('[role="separator"]')

    separator.dispatchEvent(new PointerEvent('pointerdown', { clientX: 600, pointerId: 1, bubbles: true }))
    separator.dispatchEvent(new PointerEvent('pointermove', { clientX: 702, pointerId: 1, bubbles: true }))
    separator.dispatchEvent(new PointerEvent('pointerup', { clientX: 702, pointerId: 1, bubbles: true }))
    await nextTick()
    expect(source.value).toContain('text-ratio=0.7]')

    root.querySelector('[role="separator"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await nextTick()
    expect(source.value).toContain('text-ratio=0.65]')
  })

  it('shows only the text range adjustments that apply', async () => {
    await mount(`前一段\n\n${group}`)
    const labels = [...root.querySelectorAll('.text-figure__bar-button')].map((item) => item.textContent.trim())

    expect(labels).toEqual(['＋上段', '－首段', '－末段', '取消并排'])
    root.querySelector('.text-figure__bar-button').click()
    await nextTick()
    expect(source.value.startsWith('\\textfigure[fig-pos=right-top, text-ratio=0.6]{\n前一段\n\n段一')).toBe(true)
  })
})
