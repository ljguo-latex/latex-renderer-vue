// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import LatexRenderer from '../src/components/LatexRenderer.vue'

const apps = []
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }))
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})
function mount(props = {}) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render: () => h(LatexRenderer, {
    modelValue: '\\includegraphics[width=3cm]{picture.png}', editableImages: true, ...props,
  }) })
  apps.push(app)
  app.mount(root)
  return root
}
const button = root => [...root.querySelectorAll('button')].find(item => item.textContent.includes('图片清晰化'))

describe('host-owned image enhancement', () => {
  it('hides the action without a callback and in read-only mode', () => {
    expect(button(mount())).toBeUndefined()
    expect(button(mount({ editableImages: false, imageEnhancer: vi.fn() }))).toBeUndefined()
  })
  it('passes the source, node and resolved preview without modifying LaTeX', async () => {
    const enhance = vi.fn()
    const update = vi.fn()
    const root = mount({ imageEnhancer: enhance, imageSrcResolver: () => 'blob:current-preview', 'onUpdate:modelValue': update })
    await nextTick()
    button(root).click()
    await nextTick()
    expect(enhance).toHaveBeenCalledWith(expect.objectContaining({ src: 'picture.png', url: 'blob:current-preview', node: expect.objectContaining({ src: 'picture.png' }) }))
    expect(update).not.toHaveBeenCalled()
  })
  it('blocks duplicate requests and shows errors next to the image', async () => {
    let reject
    const enhance = vi.fn(() => new Promise((_, fail) => { reject = fail }))
    const root = mount({ imageEnhancer: enhance })
    button(root).click()
    button(root).click()
    await nextTick()
    expect(enhance).toHaveBeenCalledTimes(1)
    expect(button(root).disabled).toBe(true)
    reject(new Error('无图片编辑权限'))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(root.querySelector('[role=alert]').textContent).toBe('无图片编辑权限')
    expect(button(root).disabled).toBe(false)
  })
})
