// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import LatexRenderer from '../src/components/LatexRenderer.vue'

let app, root, frames, width, itemWidths, resizeCallbacks, contentHeight
beforeEach(() => {
  width = 1280
  contentHeight = 30
  itemWidths = [252, 265, 305.2, 254]
  frames = new Map()
  resizeCallbacks = []
  let frameId = 0
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { resizeCallbacks.push(callback) }
    observe() {}
    disconnect() {}
  })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id))
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const index = [...(this.parentElement?.children || [])].indexOf(this)
    return {
      width: this.hasAttribute('data-choice-measure-item') ? itemWidths[index] : width,
      height: this.classList.contains('choices-node__measure-content') ? contentHeight : 30,
    }
  })
  const getStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element =>
    element.classList.contains('choices-node') ? { columnGap: '20px' } : getStyle(element))
})
afterEach(() => {
  app?.unmount()
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function flushFrames() {
  await nextTick()
  const pending = [...frames.values()]
  frames.clear()
  await Promise.all(pending.map(callback => callback()))
  await nextTick()
}
async function mount(source, props = {}) {
  root = document.createElement('div')
  document.body.appendChild(root)
  app = createApp({ render: () => h(LatexRenderer, { modelValue: source, ...props }) })
  app.mount(root)
  await flushFrames()
}
const textChoices = String.raw`\begin{choices}\item A\item B\item C\item D\end{choices}`
const columns = () => (root.querySelector('ol').style.gridTemplateColumns.match(/minmax/g) || []).length

describe('automatic choices layout', () => {
  it.each(['top-left', 'left', 'bottom'])('applies explicit label-pos = %s to visible and measured choices', async (position) => {
    await mount(textChoices.replace('\\begin{choices}', `\\begin{choices}[label-pos=${position}]`))
    expect(root.querySelector('.choices-node-wrap').classList.contains(`choices-node-wrap--label-${position}`)).toBe(true)
    expect(root.querySelectorAll('.choices-node__measure-item')).toHaveLength(4)
    expect(columns()).toBe(4)
  })

  it('keeps the previous upper-left placement when label-pos is omitted', async () => {
    await mount(textChoices)
    expect(root.querySelector('.choices-node-wrap--label-top-left')).not.toBeNull()
  })

  it.each(['', '[label-pos=auto]'])('defaults even short images to bottom labels (%s)', async (options) => {
    contentHeight = 10
    await mount(`\\begin{choices}${options}\\item \\includegraphics[width=20px]{a}\\end{choices}`)
    expect(root.querySelector('.choices-node-wrap--label-bottom')).not.toBeNull()
  })

  it.each(['left', 'top-left'])('lets explicit %s override the default placement for images', async (position) => {
    await mount(`\\begin{choices}[label-pos=${position}]\\item \\includegraphics[width=100px]{a}\\end{choices}`)
    expect(root.querySelector(`.choices-node-wrap--label-${position}`)).not.toBeNull()
  })

  it('automatically moves labels below tall content and rechecks after a resize', async () => {
    await mount(textChoices.replace('\\begin{choices}', '\\begin{choices}[label-pos=auto]'))
    expect(root.querySelector('.choices-node-wrap--label-top-left')).not.toBeNull()
    contentHeight = 100
    resizeCallbacks.forEach(callback => callback())
    await flushFrames()
    expect(root.querySelector('.choices-node-wrap--label-bottom')).not.toBeNull()
    contentHeight = 30
    resizeCallbacks.forEach(callback => callback())
    await flushFrames()
    expect(root.querySelector('.choices-node-wrap--label-top-left')).not.toBeNull()
  })

  it('retains label-pos when the image slider updates LaTeX', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const update = vi.fn()
    await mount(String.raw`\begin{choices}[label-pos=bottom]\item \includegraphics[width=.17\textwidth]{a}\end{choices}`, {
      editableImages: true, 'onUpdate:modelValue': update,
    })
    const slider = root.querySelector('ol input[type=range]')
    slider.dispatchEvent(new Event('focus'))
    slider.value = '25'
    slider.dispatchEvent(new Event('input'))
    slider.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(140)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0]).toContain('\\begin{choices}[label-pos = bottom]')
    expect(update.mock.calls[0][0]).toContain(String.raw`width=0.25\linewidth`)
  })

  it('fits different image widths on one row when their combined widths and gaps fit', async () => {
    await mount(textChoices)
    expect(columns()).toBe(4)
  })
  it('includes column gaps when deciding whether to use two rows', async () => {
    width = 1100
    itemWidths = [270, 270, 270, 270]
    await mount(textChoices)
    expect(root.querySelector('ol').style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
  })
  it('uses one column for long options and remeasures when the container grows', async () => {
    width = 400
    itemWidths = [300, 300, 300, 300]
    await mount(textChoices)
    expect(root.querySelector('ol').style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))')
    width = 1280
    resizeCallbacks.forEach(callback => callback())
    await flushFrames()
    expect(root.querySelector('ol').style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
  })
  it('accepts an exact fit', async () => {
    itemWidths = [305, 305, 305, 305]
    await mount(textChoices)
    expect(root.querySelector('ol').style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
  })
  it('uses the full choice group for relative image widths in visible and measuring content', async () => {
    await mount(String.raw`\begin{choices}\item \includegraphics[width=.17\textwidth]{a}\item \includegraphics[width=.18\textwidth]{b}\item \includegraphics[width=.21\textwidth]{c}\item \includegraphics[width=.17\textwidth]{d}\end{choices}`)
    const imageWidths = selector => [...root.querySelectorAll(selector)].map(el => parseFloat(el.style.width))
    expect(imageWidths('ol .resizable-image__frame')).toEqual([217.6, 230.4, 268.8, 217.6])
    expect(imageWidths('[data-choice-measure-item] .resizable-image__frame')).toEqual([217.6, 230.4, 268.8, 217.6])
    width = 800
    resizeCallbacks.forEach(callback => callback())
    await flushFrames()
    expect(imageWidths('ol .resizable-image__frame')).toEqual([136, 144, 168, 136])
  })
  it('preserves percentage widths outside choices', async () => {
    await mount(String.raw`\includegraphics[width=.17\textwidth]{a}`)
    expect(root.querySelector('.resizable-image__frame').style.width).toBe('17%')
  })
})
