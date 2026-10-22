// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import LatexRenderer from '../src/components/LatexRenderer.vue'

let app, root, frames, width, itemWidths, resizeCallbacks
beforeEach(() => {
  width = 1280
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
    return { width: this.hasAttribute('data-choice-measure-item') ? itemWidths[index] : width }
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
})
async function flushFrames() {
  await nextTick()
  const pending = [...frames.values()]
  frames.clear()
  await Promise.all(pending.map(callback => callback()))
  await nextTick()
}
async function mount(source) {
  root = document.createElement('div')
  document.body.appendChild(root)
  app = createApp({ render: () => h(LatexRenderer, { modelValue: source }) })
  app.mount(root)
  await flushFrames()
}
const textChoices = String.raw`\begin{choices}\item A\item B\item C\item D\end{choices}`
const columns = () => (root.querySelector('ol').style.gridTemplateColumns.match(/minmax/g) || []).length

describe('automatic choices layout', () => {
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
