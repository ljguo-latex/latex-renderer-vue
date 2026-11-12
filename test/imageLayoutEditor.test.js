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
    modelValue: '题干第一段。\n\n\\includegraphics[width=0.4\\linewidth]{picture.png}', editableImages: true, ...props,
  }) })
  apps.push(app)
  app.mount(root)
  return root
}
const TEXT_FIGURE = '\\textfigure[fig-pos=right-top, text-ratio=0.6]{\n题干\n}{\n\\includegraphics[width=\\linewidth]{picture.png}\n}'
const layoutButton = root => [...root.querySelectorAll('button')].find(button => button.textContent.trim() === '图片布局')
const sideButton = root => root.querySelector('button[aria-label="图在右，与文字并排"]')

describe('host-owned image layout', () => {
  it('keeps the built-in layout buttons without a callback', () => {
    const root = mount()
    expect(layoutButton(root)).toBeUndefined()
    expect(sideButton(root)).not.toBeNull()
  })

  it('replaces the layout buttons with one action and passes the image context', async () => {
    const open = vi.fn()
    const update = vi.fn()
    const root = mount({ imageLayoutEditor: open, imageSrcResolver: () => 'blob:preview', 'onUpdate:modelValue': update })
    await nextTick()
    expect(sideButton(root)).toBeNull()
    layoutButton(root).click()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ src: 'picture.png', url: 'blob:preview' }))
    expect(update).not.toHaveBeenCalled()
  })

  it('makes text-figure groups read-only in the preview', () => {
    const root = mount({ modelValue: TEXT_FIGURE, imageLayoutEditor: vi.fn() })
    expect(root.querySelector('.text-figure__bar')).toBeNull()
    expect(root.querySelector('.text-figure__gap[role="separator"]')).toBeNull()
    expect(root.querySelector('button[aria-label="与文字顶部对齐"]')).toBeNull()
    expect(root.querySelector('.resizable-image__slider')).toBeNull()
    expect(layoutButton(root)).toBeDefined()
  })

  it('hides the action in read-only mode', () => {
    expect(layoutButton(mount({ editableImages: false, imageLayoutEditor: vi.fn() }))).toBeUndefined()
  })
})
